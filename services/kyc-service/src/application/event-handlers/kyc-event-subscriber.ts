import { Prisma } from '@prisma/client';
import { eventBus } from '../../../../../shared/events/eventBus';
import { logger } from '../../infrastructure/services/logger.service';
import { PrismaKycRepository } from '../../infrastructure/repositories/prisma-kyc.repository';
import { KycEvaluationService } from '../../domain/services/kyc-evaluation.service';
import { KycTrigger, KycStatus } from '../../domain/types/kyc.types';
import { prisma } from '../../infrastructure/database/prisma-client';

type EventPayload = Record<string, unknown> & {
  userId?: string;
  buyerId?: string;
  sellerId?: string;
  enablerId?: string;
  walletUserId?: string;
  payload?: Record<string, unknown>;
  data?: Record<string, unknown>;
  order?: Record<string, unknown>;
};

export class KycEventSubscriber {
  private readonly subscribedEventTypes = [
    'OrderCreated.v1',
    'OrderCompleted.v1',
    'OrderCreated',
    'OrderCompleted',
    'order.completed',
    'WalletCredited',
    'WalletDebited',
    'HoldPlaced',
    'HoldReleased',
    'HoldCaptured',
    'WalletPayoutInitiated',
    'WalletPaymentProcessed',
    'ProductListedEvent',
    'OrderFacilitatedEvent',
    'CommissionEarnedEvent',
    'RewardEarnedEvent',
    'enabler.listing.created',
    'wallet.transaction.completed',
    'commission.earned'
  ];

  constructor(
    private readonly repository: PrismaKycRepository,
    private readonly evaluationService: KycEvaluationService
  ) {}

  async register(): Promise<void> {
    for (const eventType of this.subscribedEventTypes) {
      await eventBus.subscribe(eventType, {
        name: `kyc-subscriber:${eventType}`,
        handler: async (envelope) => {
          await this.handleEnvelope(eventType, envelope.data as EventPayload | undefined);
        }
      });
    }
    logger.info('KYC event subscriber registered', { eventTypes: this.subscribedEventTypes.length });
  }

  private async handleEnvelope(eventType: string, payload: EventPayload | undefined): Promise<void> {
    const userId = this.resolveUserId(eventType, payload);
    if (!userId) {
      return;
    }

    const snapshot = await this.repository.findUserSnapshot(userId);
    if (!snapshot) {
      return;
    }

    const aggregatedData = await this.repository.getAggregatedUserData(userId);
    const trigger = this.evaluationService.evaluateKycRequirement(aggregatedData);
    if (!trigger) {
      return;
    }

    const requiredLevel = this.triggerToLevel(trigger);
    await this.repository.createAuditLog({
      userId,
      action: 'level_change',
      previousLevel: snapshot.kycLevel,
      newLevel: requiredLevel,
      previousStatus: snapshot.kycStatus,
      newStatus: KycStatus.PENDING,
      metadata: {
        eventType,
        trigger,
        aggregatedData
      } as unknown as Prisma.InputJsonValue
    });

    await this.createNotification(userId, trigger);
    await eventBus.publish('kyc.level_required', {
      userId,
      trigger,
      kycLevel: requiredLevel,
      aggregatedData
    });
  }

  private resolveUserId(eventType: string, payload: EventPayload | undefined): string | null {
    const directCandidate = payload?.userId || payload?.buyerId || payload?.sellerId || payload?.enablerId || payload?.walletUserId;
    if (typeof directCandidate === 'string' && directCandidate.trim()) {
      return directCandidate;
    }

    const nested = payload?.payload || payload?.data || payload?.order;
    if (!nested || typeof nested !== 'object') {
      return null;
    }

    const objectCandidate = (nested as EventPayload).userId
      || (nested as EventPayload).buyerId
      || (nested as EventPayload).sellerId
      || (nested as EventPayload).enablerId;

    if (typeof objectCandidate === 'string' && objectCandidate.trim()) {
      return objectCandidate;
    }

    logger.debug('KYC subscriber could not resolve userId', { eventType });
    return null;
  }

  private triggerToLevel(trigger: KycTrigger): number {
    switch (trigger) {
      case 'LEVEL_3_REQUIRED':
        return 3;
      case 'LEVEL_2_REQUIRED':
        return 2;
      case 'LEVEL_1_REQUIRED':
      default:
        return 1;
    }
  }

  private async createNotification(userId: string, trigger: KycTrigger): Promise<void> {
    const notification = this.notificationCopy(trigger);
    try {
      await prisma.notification.create({
        data: {
          userId,
          type: 'in_app',
          priority: 'high',
          subject: notification.subject,
          content: notification.content,
          data: {
            kycLevel: this.triggerToLevel(trigger),
            trigger
          } as unknown as Prisma.InputJsonValue,
          metadata: {
            source: 'kyc-service'
          } as unknown as Prisma.InputJsonValue
        }
      });
    } catch (error) {
      logger.warn('KYC notification could not be persisted', {
        userId,
        trigger,
        error: error instanceof Error ? error.message : error
      });
    }
  }

  private notificationCopy(trigger: KycTrigger): { subject: string; content: string } {
    switch (trigger) {
      case 'LEVEL_2_REQUIRED':
        return {
          subject: 'Complete Verification',
          content: "You've earned money! Complete verification to withdraw funds."
        };
      case 'LEVEL_3_REQUIRED':
        return {
          subject: 'Unlock Higher Limits',
          content: 'You\'re now a top performer. Unlock higher limits with full verification.'
        };
      case 'LEVEL_1_REQUIRED':
      default:
        return {
          subject: 'Verify Your Account',
          content: "You're getting your first orders! Verify your account to continue receiving more."
        };
    }
  }
}
