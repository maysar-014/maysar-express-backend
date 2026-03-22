/**
 * Checkout Controller
 * 
 * Handles HTTP requests for checkout operations.
 * API layer - request/response handling.
 */

import { Request, Response } from 'express';
import { InitiateCheckoutUseCase } from '../../application/use-cases/initiate-checkout.use-case';
import { PricingPolicy } from '../../domain/policies/pricing.policy';
import { validateCheckoutRequest } from '../../shared/validators';
import { AppError } from '../../shared/errors/app.error';
import { logger } from '../../shared/logger/logger';
import { idempotencyManager } from '../../shared/idempotency';
import { CheckoutMapper } from '../../application/mappers/checkout.mapper';
import { config } from '../../shared/config';

export class CheckoutController {
  private initiateCheckoutUseCase: InitiateCheckoutUseCase;

  constructor(
    private checkoutRepository: any,
    private eventBus: any,
    private cartRepository?: any,
    private enablerLookup?: any
  ) {
    const pricingPolicy = new PricingPolicy({
      taxRate: config.pricing.taxRate,
      shippingCost: config.pricing.shippingCost,
      minOrderForFreeShipping: config.pricing.minOrderForFreeShipping
    });

    this.initiateCheckoutUseCase = new InitiateCheckoutUseCase(
      pricingPolicy,
      checkoutRepository,
      cartRepository,
      eventBus,
      enablerLookup
    );
  }

  async initiateCheckout(req: Request, res: Response): Promise<void> {
    const correlationId = req.headers['x-correlation-id'] as string;
    const idempotencyKey = req.headers['idempotency-key'] as string;

    try {
      const {
        cartId,
        userId,
        shippingAddressId,
        billingAddressId,
        shippingMethodId: rawShippingMethodId,
        paymentMethodId,
        shippingCost,
        enablerCode
      } = req.body;
      const shippingMethodId = rawShippingMethodId ?? paymentMethodId;

      validateCheckoutRequest({
        cartId,
        userId,
        shippingAddressId,
        billingAddressId,
        shippingMethodId,
        shippingCost
      });

      if (idempotencyKey) {
        const cached = idempotencyManager.retrieve(idempotencyKey);
        if (cached) {
          logger.info('Idempotent request - returning cached result', { idempotencyKey }, correlationId);
          res.json(cached);
          return;
        }
      }

      const result = await this.initiateCheckoutUseCase.execute(
        cartId,
        userId,
        shippingAddressId,
        billingAddressId,
        shippingMethodId,
        shippingCost,
        enablerCode
      );

      if (!result.success) {
        logger.warn('Checkout initiation failed', { errors: result.errors }, correlationId);
        res.status(400).json({
          success: false,
          error: {
            code: 'CHECKOUT_VALIDATION_FAILED',
            message: 'Checkout validation failed',
            details: result.errors
          },
          timestamp: new Date()
        });
        return;
      }

      const response = {
        success: true,
        data: CheckoutMapper.checkoutSessionToDTO(result.data),
        timestamp: new Date()
      };

      if (idempotencyKey) {
        idempotencyManager.store(idempotencyKey, response);
      }

      logger.info('Checkout initiated', { checkoutId: result.data.id, userId }, correlationId);
      res.json(response);
    } catch (error) {
      const statusCode = error instanceof AppError ? error.statusCode : 500;
      logger.error('Error initiating checkout', error as Error, { cartId: req.body.cartId }, correlationId);
      res.status(statusCode).json({
        success: false,
        error: {
          code: error instanceof AppError ? error.code : 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error instanceof AppError ? error.details : undefined
        },
        timestamp: new Date()
      });
    }
  }

  async getCheckoutSession(req: Request, res: Response): Promise<void> {
    const correlationId = req.headers['x-correlation-id'] as string;
    try {
      const sessionId = (req.params.sessionId || req.params.id) as string | undefined;
      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: { code: 'CHECKOUT_SESSION_ID_REQUIRED', message: 'Session ID is required' },
          timestamp: new Date()
        });
        return;
      }

      const session = await this.checkoutRepository.getSession(sessionId);
      if (!session) {
        logger.warn('Checkout session not found', { sessionId }, correlationId);
        res.status(404).json({
          success: false,
          error: { code: 'CHECKOUT_SESSION_NOT_FOUND', message: 'Session not found' },
          timestamp: new Date()
        });
        return;
      }

      logger.info('Checkout session retrieved', { sessionId }, correlationId);
      res.json({
        success: true,
        data: CheckoutMapper.checkoutSessionToDTO(session),
        timestamp: new Date()
      });
    } catch (error) {
      const statusCode = error instanceof AppError ? error.statusCode : 500;
      logger.error('Error retrieving checkout session', error as Error, { sessionId: req.params.sessionId }, correlationId);
      res.status(statusCode).json({
        success: false,
        error: {
          code: error instanceof AppError ? error.code : 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      });
    }
  }

  async confirmCheckout(req: Request, res: Response): Promise<void> {
    const correlationId = req.headers['x-correlation-id'] as string;
    const idempotencyKey = req.headers['idempotency-key'] as string;

    try {
      // Check idempotency
      if (idempotencyKey) {
        const cached = idempotencyManager.retrieve(idempotencyKey);
        if (cached) {
          logger.info('Idempotent request - returning cached result', { idempotencyKey }, correlationId);
          res.json(cached);
          return;
        }
      }

      const sessionId = (req.params.id || req.body.sessionId) as string | undefined;
      const { paymentMethodId } = req.body;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: { code: 'CHECKOUT_SESSION_ID_REQUIRED', message: 'Session ID is required' },
          timestamp: new Date()
        });
        return;
      }

      const session = await this.checkoutRepository.getSession(sessionId);
      if (!session) {
        logger.warn('Checkout session not found', { sessionId }, correlationId);
        res.status(404).json({
          success: false,
          error: { code: 'CHECKOUT_SESSION_NOT_FOUND', message: 'Session not found' },
          timestamp: new Date()
        });
        return;
      }

      session.paymentMethodId = paymentMethodId;
      session.status = 'payment_pending';
      await this.checkoutRepository.saveSession(session);

      await this.eventBus.publish('OrderCreated', {
        checkoutId: sessionId,
        userId: session.userId,
        totalAmount: session.totalAmount,
        ...(session.enablerId ? { enablerId: session.enablerId, enablerCode: session.enablerCode } : {})
      });

      const response = {
        success: true,
        data: CheckoutMapper.checkoutSessionToDTO(session),
        timestamp: new Date()
      };

      if (idempotencyKey) {
        idempotencyManager.store(idempotencyKey, response);
      }

      logger.info('Checkout confirmed', { sessionId, userId: session.userId }, correlationId);
      res.json(response);
    } catch (error) {
      const statusCode = error instanceof AppError ? error.statusCode : 500;
      logger.error('Error confirming checkout', error as Error, { sessionId: req.body.sessionId }, correlationId);
      res.status(statusCode).json({
        success: false,
        error: {
          code: error instanceof AppError ? error.code : 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      });
    }
  }
}
