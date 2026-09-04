/**
 * QuotePricingController
 *
 * Handles:
 *   POST /logistics/v1/quote         — public (authenticated) quote request
 *   GET  /internal/quotes/:quoteId   — internal endpoint for checkout-service validation
 *   PATCH /internal/quotes/:quoteId/consume — marks a quote as consumed
 */

import { Request, Response } from 'express';
import Joi from 'joi';
import { RequestDeliveryQuoteUseCase, DeliveryQuoteRequest } from '../../application/use-cases/request-delivery-quote.use-case';
import { QuoteRepository } from '../../domain/repositories/quote.repository';

const quoteRequestSchema = Joi.object({
  originLat:          Joi.number().min(-90).max(90).required(),
  originLng:          Joi.number().min(-180).max(180).required(),
  originAddress:      Joi.string().trim().max(500).required(),
  destinationLat:     Joi.number().min(-90).max(90).required(),
  destinationLng:     Joi.number().min(-180).max(180).required(),
  destinationAddress: Joi.string().trim().max(500).required(),
  packageWeightKg:    Joi.number().positive().required(),
  packageDimensions:  Joi.object({
    lengthCm: Joi.number().positive().required(),
    widthCm:  Joi.number().positive().required(),
    heightCm: Joi.number().positive().required(),
  }).optional(),
  isCoD: Joi.boolean().default(false),
});

export class QuotePricingController {
  constructor(
    private readonly requestQuoteUseCase: RequestDeliveryQuoteUseCase,
    private readonly quoteRepo: QuoteRepository,
  ) {}

  /** POST /logistics/v1/quote — authenticated buyer-facing quote */
  async requestQuote(req: Request, res: Response): Promise<void> {
    const { error, value } = quoteRequestSchema.validate(req.body, { abortEarly: false });

    if (error) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUOTE_REQUEST',
          message: 'Quote request validation failed',
          details: error.details.map(d => ({ field: d.path.join('.'), message: d.message })),
        },
      });
      return;
    }

    try {
      const request: DeliveryQuoteRequest = {
        originLat:          value.originLat,
        originLng:          value.originLng,
        originAddress:      value.originAddress,
        destinationLat:     value.destinationLat,
        destinationLng:     value.destinationLng,
        destinationAddress: value.destinationAddress,
        packageWeightKg:    value.packageWeightKg,
        packageDimensions:  value.packageDimensions,
        isCoD:              value.isCoD ?? false,
        requestedAt:        new Date(),
      };

      const response = await this.requestQuoteUseCase.execute(request);

      res.status(200).json({
        success: true,
        data: response,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'PRICING_CONFIG_UNAVAILABLE',
          message: err?.message ?? 'Failed to generate delivery quote',
        },
      });
    }
  }

  /** GET /internal/quotes/:quoteId — called by checkout-service to validate a quote */
  async getQuote(req: Request, res: Response): Promise<void> {
    const { quoteId } = req.params;

    if (!quoteId) {
      res.status(400).json({ success: false, error: { code: 'MISSING_QUOTE_ID', message: 'quoteId is required' } });
      return;
    }

    try {
      const quote = await this.quoteRepo.findById(quoteId);

      if (!quote) {
        res.status(404).json({ success: false, error: { code: 'QUOTE_NOT_FOUND', message: 'Quote not found' } });
        return;
      }

      // Determine effective status — check expiry at read time
      const effectiveStatus = quote.isExpired && quote.status === 'ACTIVE' ? 'EXPIRED' : quote.status;

      res.status(200).json({
        success: true,
        data: {
          quoteId: quote.quoteId,
          status: effectiveStatus,
          deliveryFee: effectiveStatus === 'DELIVERY_UNAVAILABLE' ? null : quote.deliveryFee,
          pricingVersion: quote.pricingVersion,
          expiresAt: quote.expiresAt.toISOString(),
          deliveryZone: quote.deliveryZone,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err?.message } });
    }
  }

  /** PATCH /internal/quotes/:quoteId/consume — called by checkout-service after successful checkout */
  async consumeQuote(req: Request, res: Response): Promise<void> {
    const { quoteId } = req.params;

    if (!quoteId) {
      res.status(400).json({ success: false, error: { code: 'MISSING_QUOTE_ID', message: 'quoteId is required' } });
      return;
    }

    try {
      await this.quoteRepo.markConsumed(quoteId);
      res.status(200).json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err?.message } });
    }
  }
}
