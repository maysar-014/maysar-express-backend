import { ICODTrustScoreRepository } from '../../domain/repositories/cod-trust-score.repository';
import { ICODScoreEventRepository } from '../../domain/repositories/cod-score-event.repository';
import {
  TrustSignalType,
  SIGNAL_WEIGHTS,
} from '../../domain/engines/cod-trust/trust-signal.types';
import {
  applySignal,
  deriveTier,
} from '../../domain/engines/cod-trust/trust-score.functions';
import { EventPublisher } from '../../application/use-cases/place-order.use-case';
import { logger } from '../../infrastructure/monitoring/logger';

export interface RecordSignalDTO {
  buyerId: string;
  signalType: TrustSignalType;
  sourceService: string;
  sourceEntityId: string;
}

export interface CODScoreUpdatedEvent {
  type: 'CODScoreUpdated';
  buyerId: string;
  previousScore: number;
  newScore: number;
  newTier: string;
  signalType: TrustSignalType;
  delta: number;
  timestamp: Date;
}

export class TrustSignalIngestionService {
  constructor(
    private readonly trustScoreRepo: ICODTrustScoreRepository,
    private readonly scoreEventRepo: ICODScoreEventRepository,
    private readonly eventPublisher: EventPublisher
  ) {}

  /**
   * Record a trust signal event for a buyer.
   *
   * Flow:
   * 1. Validate buyerId is non-empty
   * 2. Load current score (default 0 if no record)
   * 3. Compute new score via applySignal (clamped to [0, 100])
   * 4. Derive new tier
   * 5. In a logical transaction: append ScoreEvent + upsert TrustScore
   * 6. Publish CODScoreUpdated domain event ONLY after successful persistence
   * 7. On persistence failure: throw error, do NOT publish event
   */
  async recordSignal(dto: RecordSignalDTO): Promise<void> {
    if (!dto.buyerId || dto.buyerId.trim() === '') {
      throw new Error('TrustSignalIngestionService: buyerId is required');
    }

    if (!SIGNAL_WEIGHTS[dto.signalType]) {
      throw new Error(`TrustSignalIngestionService: unknown signalType '${dto.signalType}'`);
    }

    // Load current score (default 0 for new buyers)
    const existing = await this.trustScoreRepo.findByBuyerId(dto.buyerId);
    const currentScore = existing?.score ?? 0;

    // Compute new score
    const newScore = applySignal(currentScore, dto.signalType);
    // deriveTier is dual-axis (score AND lifetime COD value). Passing only the
    // score left the second argument undefined, so every threshold comparison
    // was false and the tier was always NEW_BUYER — buyers could never
    // progress regardless of their signal history.
    const lifetimeCODValue = existing?.lifetimeCODValue ?? 0;
    const newTier = deriveTier(newScore, lifetimeCODValue);
    const delta = newScore - currentScore;

    logger.info('[TrustSignalIngestionService] Recording signal', {
      buyerId: dto.buyerId,
      signalType: dto.signalType,
      currentScore,
      newScore,
      newTier,
      delta,
      sourceService: dto.sourceService,
      sourceEntityId: dto.sourceEntityId,
    });

    // Persist: append event + upsert score (both must succeed before publishing)
    // Note: Ideally wrapped in a DB transaction; using sequential writes as a safe fallback
    // since score events are append-only and idempotent on replay.
    await this.scoreEventRepo.append({
      buyerId: dto.buyerId,
      signalType: dto.signalType,
      delta,
      scoreBefore: currentScore,
      scoreAfter: newScore,
      sourceService: dto.sourceService,
      sourceEntityId: dto.sourceEntityId,
    });

    await this.trustScoreRepo.upsert(dto.buyerId, newScore, newTier);

    // Publish domain event only after successful persistence
    const event: CODScoreUpdatedEvent = {
      type: 'CODScoreUpdated',
      buyerId: dto.buyerId,
      previousScore: currentScore,
      newScore,
      newTier,
      signalType: dto.signalType,
      delta,
      timestamp: new Date(),
    };

    await this.eventPublisher.publish(event);

    logger.info('[TrustSignalIngestionService] Signal recorded and event published', {
      buyerId: dto.buyerId,
      newScore,
      newTier,
    });
  }
}
