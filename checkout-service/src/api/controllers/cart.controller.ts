/**
 * Cart Controller
 * 
 * Handles HTTP requests for cart operations.
 * API layer - request/response handling.
 */

import { Request, Response } from 'express';
import { Cart } from '../../domain/value-objects/cart.value-object';
import { validateCartRequest } from '../../shared/validators';
import { AppError } from '../../shared/errors/app.error';
import { logger } from '../../shared/logger/logger';
import { CheckoutMapper } from '../../application/mappers/checkout.mapper';

export class CartController {
  constructor(private cartRepository: any) {}

  async addToCart(req: Request, res: Response): Promise<void> {
    const correlationId = req.headers['x-correlation-id'] as string;
    try {
      const { cartId, userId, productId, quantity, priceAtTime } = req.body;

      validateCartRequest({ cartId, userId, productId, quantity, priceAtTime });

      const existingCart = await this.cartRepository.getById(cartId);
      let cart = existingCart
        ? new Cart({ items: existingCart.items })
        : new Cart({ items: [] });

      cart = cart.addItem({ productId, quantity, priceAtTime });
      await this.cartRepository.save(cartId, userId, cart);

      logger.info('Item added to cart', { cartId, productId, quantity }, correlationId);
      res.json({
        success: true,
        data: CheckoutMapper.cartToDTO(cart, cartId, userId),
        timestamp: new Date()
      });
    } catch (error) {
      const statusCode = error instanceof AppError ? error.statusCode : 500;
      const code = error instanceof AppError ? error.code : 'INTERNAL_SERVER_ERROR';
      logger.error('Error adding to cart', error as Error, { cartId: req.body.cartId }, correlationId);
      res.status(statusCode).json({
        success: false,
        error: {
          code,
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error instanceof AppError ? error.details : undefined
        },
        timestamp: new Date()
      });
    }
  }

  async removeFromCart(req: Request, res: Response): Promise<void> {
    const correlationId = req.headers['x-correlation-id'] as string;
    try {
      const { cartId, userId, productId } = req.body;

      const existingCart = await this.cartRepository.getById(cartId);
      if (!existingCart) {
        logger.warn('Cart not found', { cartId }, correlationId);
        res.status(404).json({
          success: false,
          error: { code: 'CART_NOT_FOUND', message: 'Cart not found' },
          timestamp: new Date()
        });
        return;
      }

      let cart = new Cart({ items: existingCart.items });
      cart = cart.removeItem(productId);
      await this.cartRepository.save(cartId, userId, cart);

      logger.info('Item removed from cart', { cartId, productId }, correlationId);
      res.json({
        success: true,
        data: CheckoutMapper.cartToDTO(cart, cartId, userId),
        timestamp: new Date()
      });
    } catch (error) {
      const statusCode = error instanceof AppError ? error.statusCode : 500;
      logger.error('Error removing from cart', error as Error, { cartId: req.body.cartId }, correlationId);
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

  async getCart(req: Request, res: Response): Promise<void> {
    const correlationId = req.headers['x-correlation-id'] as string;
    try {
      const { cartId } = req.params;
      const userId = (req as any).userId;

      const cartData = await this.cartRepository.getById(cartId);
      if (!cartData) {
        logger.warn('Cart not found', { cartId }, correlationId);
        res.status(404).json({
          success: false,
          error: { code: 'CART_NOT_FOUND', message: 'Cart not found' },
          timestamp: new Date()
        });
        return;
      }

      const cart = new Cart({ items: cartData.items });
      logger.info('Cart retrieved', { cartId }, correlationId);
      res.json({
        success: true,
        data: CheckoutMapper.cartToDTO(cart, cartId, userId),
        timestamp: new Date()
      });
    } catch (error) {
      const statusCode = error instanceof AppError ? error.statusCode : 500;
      logger.error('Error retrieving cart', error as Error, { cartId: req.params.cartId }, correlationId);
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

  async clearCart(req: Request, res: Response): Promise<void> {
    const correlationId = req.headers['x-correlation-id'] as string;
    try {
      const { cartId, userId } = req.body;

      const cart = new Cart({ items: [] });
      await this.cartRepository.save(cartId, userId, cart);

      logger.info('Cart cleared', { cartId }, correlationId);
      res.json({
        success: true,
        data: CheckoutMapper.cartToDTO(cart, cartId, userId),
        timestamp: new Date()
      });
    } catch (error) {
      const statusCode = error instanceof AppError ? error.statusCode : 500;
      logger.error('Error clearing cart', error as Error, { cartId: req.body.cartId }, correlationId);
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
