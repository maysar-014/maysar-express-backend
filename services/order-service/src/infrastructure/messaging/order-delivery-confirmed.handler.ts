import { ICODTrustScoreRepository } from '../../domain/repositories/cod-trust-score.repository';
import { TrustSignalIngestionService } from '../../application/services/trust-signal-ingestion.service';
import { TrustSignalType } from '../../domain/engines/cod-trust/trust-signal.types';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { logger } from '../monitoring/logger';

export interface OrderDeliveryConfirmedPayload {
  orderId: string;
  buyerId: string;
  sellerId: string;
  orderAmount: number;
  currency: string;
  /** ISO 8601 timestamp of when the delivery OTP was accepted */
  confirmedAt: string;
}

/**
 * OrderDeliveryConfirmedHandler
 *
 * Subscribes to `OrderDeliveryConfirmed.v1` — emitted by the platform's universal
 * delivery OTP mechanism after the courier accepts the buyer's delivery code.
 *
 * For COD orders:
 * 1. Records SUCCESSFUL_DELIVERY trust signal
 * 2. Increments lifetimeCODValue
 * 3. Decrements activeExposure (order is now terminal)
 * 4. Sets the 7-day dispute window expiry
 */
export class OrderDeliveryConfirmedHandler {
  constructor(
    private readonly trustSignalIngestion: TrustSignalIngestionService,
    private readonly trustScoreRepo: ICODTrustScoreRepository,
    private readonly orderRepo: OrderRepository,
  ) {}

  async handle(payload: OrderDeliveryConfirmedPayload): Promise<void> {
    const { orderId, buyerId, orderAmount, confirmedAt } = payload;

    try {
      // 1. Verify the order is a COD order
      const order = await this.orderRepo.findById(orderId);
      if (!order) {
        logger.warn('[OrderDeliveryConfirmedHandler] Order not found', { orderId });
        return;
      }

      const paymentMethod = String((order as any).paymentMethod ?? '').toUpperCase();
      if (paymentMethod !== 'COD') {
        // Non-COD orders don't affect the COD trust score
        return;
      }

      // 2. Record SUCCESSFUL_DELIVERY trust signal
      await this.trustSignalIngestion.recordSignal({
        buyerId,
        signalType: TrustSignalType.SUCCESSFUL_DELIVERY,
        sourceService: 'order-service',
        sourceEntityId: orderId,
      });

      // 3. Increment lifetimeCODValue
      await this.trustScoreRepo.incrementLifetimeCODValue(buyerId, orderAmount);

      // 4. Decrement activeExposure (order is now delivered — terminal state)
      await this.trustScoreRepo.decrementActiveExposure(buyerId, orderAmount);

      // 5. Set dispute window expiry (7 days from confirmation)
      const disputeWindowExpiresAt = new Date(
        new Date(confirmedAt).getTime() + 7 * 24 * 60 * 60 * 1000,
      );
      await this.trustScoreRepo.setDisputeWindowExpiry(orderId, disputeWindowExpiresAt);

      logger.info('[OrderDeliveryConfirmedHandler] COD delivery confirmed', {
        orderId,
        buyerId,
        orderAmount,
        disputeWindowExpiresAt,
      });
    } catch (err: any) {
      logger.error('[OrderDeliveryConfirmedHandler] Failed to process delivery confirmation', {
        orderId,
        buyerId,
        error: err.message,
      });
      throw err;
    }
  }
}
