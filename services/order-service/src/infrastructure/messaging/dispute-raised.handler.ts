import { ICODTrustScoreRepository } from '../../domain/repositories/cod-trust-score.repository';
import { TrustSignalIngestionService } from '../../application/services/trust-signal-ingestion.service';
import { TrustSignalType } from '../../domain/engines/cod-trust/trust-signal.types';
import { logger } from '../monitoring/logger';

export interface DisputeRaisedPayload {
  disputeId: string;
  orderId: string;
  buyerId: string;
  /** ISO 8601 timestamp of when the dispute was raised */
  raisedAt: string;
}

/**
 * DisputeRaisedHandler
 *
 * Subscribes to `DisputeRaised.v1`.
 * If the dispute is raised within the 7-day dispute window after delivery confirmation,
 * reverses the SUCCESSFUL_DELIVERY trust signal and suspends the lifetimeCODValue increment.
 *
 * The reversal is recorded as a compensating Score_Event (negative delta) rather than
 * deleting the original event — the Score_Event log is immutable.
 */
export class DisputeRaisedHandler {
  constructor(
    private readonly trustSignalIngestion: TrustSignalIngestionService,
    private readonly trustScoreRepo: ICODTrustScoreRepository,
  ) {}

  async handle(payload: DisputeRaisedPayload): Promise<void> {
    const { disputeId, orderId, buyerId, raisedAt } = payload;

    try {
      // 1. Fetch dispute window expiry — return early if no delivery confirmation recorded
      const disputeWindowExpiry = await this.trustScoreRepo.getDisputeWindowExpiry(orderId);
      if (!disputeWindowExpiry) {
        logger.debug('[DisputeRaisedHandler] No dispute window found for order — skipping', {
          orderId,
        });
        return;
      }

      // 2. Return early if dispute is outside the 7-day window
      const raisedAtDate = new Date(raisedAt);
      if (raisedAtDate > disputeWindowExpiry) {
        logger.info('[DisputeRaisedHandler] Dispute raised outside window — no reversal', {
          orderId,
          raisedAt,
          disputeWindowExpiry,
        });
        return;
      }

      // 3. Record compensating event to reverse SUCCESSFUL_DELIVERY
      // We record a DELIVERY_REFUSED signal as the compensating event.
      // This is a deliberate choice: a disputed delivery is treated as a negative signal,
      // not just a neutral reversal. The net effect is: +8 (delivery) - 15 (refused) = -7.
      // This is intentional — buyers who dispute deliveries should see a score impact.
      await this.trustSignalIngestion.recordSignal({
        buyerId,
        signalType: TrustSignalType.DELIVERY_REFUSED,
        sourceService: 'order-service',
        sourceEntityId: orderId,
      });

      // 4. Suspend the lifetimeCODValue increment pending dispute resolution
      await this.trustScoreRepo.suspendLifetimeCODValueIncrement(orderId);

      logger.info('[DisputeRaisedHandler] SUCCESSFUL_DELIVERY reversed due to dispute within window', {
        orderId,
        buyerId,
        disputeId,
        raisedAt,
      });
    } catch (err: any) {
      logger.error('[DisputeRaisedHandler] Failed to process dispute', {
        orderId,
        buyerId,
        disputeId,
        error: err.message,
      });
      throw err;
    }
  }
}
