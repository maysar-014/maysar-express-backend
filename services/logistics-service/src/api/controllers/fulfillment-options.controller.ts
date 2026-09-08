/**
 * FulfillmentOptionsController (Phase 4 §4.1)
 *
 * POST /api/logistics/v1/fulfillment-options — generates ranked fulfillment
 * options for the buyer's shipments. Accepts: masterOrderId (or sessionId
 * pre-order), buyerDestination, deliveryWindowPreference, shipments, and an
 * optional buyerTrustTier.
 */

import { Request, Response } from 'express';
import { GenerateFulfillmentOptionsUseCase } from '../../application/use-cases/generate-fulfillment-options.use-case';

export class FulfillmentOptionsController {
  constructor(private readonly useCase: GenerateFulfillmentOptionsUseCase) {}

  async generateOptions(req: Request, res: Response): Promise<void> {
    try {
      const {
        masterOrderId,
        sessionId,
        buyerDestination,
        deliveryWindowPreference,
        shipments,
        buyerTrustTier,
      } = req.body ?? {};

      if (!buyerDestination?.lat || !buyerDestination?.lng) {
        res.status(400).json({
          success: false,
          error: { code: 'BUYER_DESTINATION_REQUIRED', message: 'buyerDestination.lat/lng are required' },
          timestamp: new Date(),
        });
        return;
      }
      if (!Array.isArray(shipments) || shipments.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'SHIPMENTS_REQUIRED', message: 'shipments must be a non-empty array' },
          timestamp: new Date(),
        });
        return;
      }

      const result = await this.useCase.execute({
        masterOrderId,
        sessionId,
        buyerDestination,
        deliveryWindowPreference,
        shipments,
        buyerTrustTier,
      });

      res.json({
        success: true,
        data: result,
        timestamp: new Date(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date(),
      });
    }
  }
}