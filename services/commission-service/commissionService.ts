import express from 'express';
import { PrismaClient } from '@prisma/client';
import { eventBus, EventEnvelope } from '../../shared/events/eventBus';
import { createPrismaClient } from '@shared/database/prisma-client';

const app = express();
const prisma = createPrismaClient();

app.use(express.json());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LegacyPayload = Record<string, any>;

interface LegacySagaEvent extends Omit<EventEnvelope, 'data' | 'payload' | 'metadata'> {
  data: LegacyPayload;
  payload: LegacyPayload;
  metadata?: Record<string, unknown>;
  sagaId?: string;
}

const asLegacyPayload = (value: unknown): LegacyPayload =>
  typeof value === 'object' && value !== null ? (value as LegacyPayload) : {};

const asLegacyEvent = (envelope: EventEnvelope): LegacySagaEvent => {
  const metadata = envelope.metadata;
  const metadataSagaId = typeof metadata?.sagaId === 'string' ? metadata.sagaId : undefined;
  return {
    ...envelope,
    data: asLegacyPayload(envelope.data),
    payload: asLegacyPayload(envelope.payload),
    metadata,
    sagaId: envelope.sagaId || metadataSagaId
  };
};

const subscribeLegacy = (
  eventType: string,
  handler: (event: LegacySagaEvent) => Promise<void>
): void => {
  eventBus.subscribe(eventType, async (envelope: EventEnvelope) => {
    await handler(asLegacyEvent(envelope));
  });
};

// Initialize courier commission handlers
initializeCourierCommissionHandlers();
initializeSellerSagaHandlers();
initializeEnablerSagaHandlers();

function initializeEnablerSagaHandlers() {
  // Task Assignment & Completion Events
  subscribeLegacy('TaskCreated', async (event) => {
    const { taskId, taskType, enablerId } = event.data;
    
    await eventBus.publish({
      eventType: 'EnablerMatched',
      data: { taskId, matchedEnablers: [{ id: enablerId }] },
      metadata: { sagaId: event.sagaId }
    });
  });

  subscribeLegacy('TaskAssignmentAccepted', async (event) => {
    const { taskId, enablerId } = event.data;
    
    await prisma.commission.create({
      data: {
        recipientId: enablerId,
        recipientType: 'enabler',
        amount: 0,
        type: 'task_assignment',
        status: 'pending'
      } as never
    });
  });

  subscribeLegacy('TaskCommissionCalculated', async (event) => {
    const { taskId, enablerId, commission, qualityBonus } = event.data;
    
    const totalEarnings = commission + (qualityBonus || 0);
    
    await prisma.commission.create({
      data: {
        recipientId: enablerId,
        recipientType: 'enabler',
        amount: totalEarnings,
        type: 'task_completion',
        status: 'earned'
      } as never
    });
    
    await eventBus.publish({
      eventType: 'PayoutScheduled',
      data: { enablerId, totalEarnings, payoutDate: new Date() },
      metadata: { sagaId: event.sagaId }
    });
  });

  // Performance & Commission Events
  subscribeLegacy('EnablerActivitiesAggregated', async (event) => {
    const { enablerId, activities } = event.data;
    
    const baseCommission = activities.reduce(
      (sum: number, activity: { total?: number }) => sum + (activity.total || 0),
      0
    );
    
    await eventBus.publish({
      eventType: 'BaseCommissionCalculated',
      data: { enablerId, baseCommission: { total: baseCommission } },
      metadata: { sagaId: event.sagaId }
    });
  });

  subscribeLegacy('PayoutScheduled', async (event) => {
    const { enablerId, totalEarnings } = event.data;
    
    await prisma.payout.create({
      data: {
        recipientId: enablerId,
        recipientType: 'enabler',
        amount: totalEarnings,
        status: 'scheduled',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
      } as never
    });
    
    await eventBus.publish({
      eventType: 'EnablerPayoutNotificationSent',
      data: { enablerId, totalEarnings },
      metadata: { sagaId: event.sagaId }
    });
  });

  // KYC Events
  subscribeLegacy('EnablerKYCInitiated', async (event) => {
    const { enablerId, kycId } = event.data;
    
    await eventBus.publish({
      eventType: 'EnablerKYCDocumentUploaded',
      data: { kycId, enablerId, uploadedAt: new Date() },
      metadata: { sagaId: event.sagaId }
    });
  });

  subscribeLegacy('EnablerKYCAutomatedVerificationCompleted', async (event) => {
    const { kycId, verificationResult } = event.data;
    
    if (verificationResult.confidence > 0.8) {
      await eventBus.publish({
        eventType: 'EnablerKYCApproved',
        data: { kycId, approvedAt: new Date(), status: 'approved' },
        metadata: { sagaId: event.sagaId }
      });
    }
  });

  // Settings Events
  subscribeLegacy('EnablerSettingsUpdateRequested', async (event) => {
    const { enablerId, updates } = event.data;
    
    await eventBus.publish({
      eventType: 'EnablerSettingsValidated',
      data: { enablerId, validationResult: { valid: true } },
      metadata: { sagaId: event.sagaId }
    });
  });

  subscribeLegacy('EnablerSettingsValidated', async (event) => {
    const { enablerId, validationResult } = event.data;
    
    if (validationResult.valid) {
      await eventBus.publish({
        eventType: 'EnablerSettingsApplied',
        data: { enablerId, appliedAt: new Date() },
        metadata: { sagaId: event.sagaId }
      });
    }
  });
}

function initializeSellerSagaHandlers() {
  // Enabler Collaboration Saga Events
  subscribeLegacy('EnablerAssistanceRequested', async (event) => {
    const { sellerId, requestDetails } = event.data;
    
    await eventBus.publish({
      eventType: 'EnablerMatchingInitiated',
      data: { sellerId, requestDetails },
      metadata: { sagaId: event.sagaId }
    });
  });

  subscribeLegacy('EnablerMatchingInitiated', async (event) => {
    const { sellerId } = event.data;
    
    const enablerId = `enabler_${Math.floor(Math.random() * 100)}`;
    
    await eventBus.publish({
      eventType: 'EnablerCollaborationEstablished',
      data: { sellerId, enablerId },
      metadata: { sagaId: event.sagaId }
    });
  });

  subscribeLegacy('EnablerCollaborationEstablished', async (event) => {
    const { sellerId, enablerId } = event.data;
    
    await prisma.commission.create({
      data: {
        recipientId: enablerId,
        recipientType: 'enabler',
        amount: 25,
        type: 'collaboration_setup',
        status: 'pending'
      } as never
    });
    
    await eventBus.publish({
      eventType: 'CollaborationNotificationSent',
      data: { sellerId, enablerId },
      metadata: { sagaId: event.sagaId }
    });
  });

  // Seller KYC Events
  subscribeLegacy('SellerKYCDocumentsSubmitted', async (event) => {
    const { sellerId, documents } = event.data;
    
    await eventBus.publish({
      eventType: 'SellerKYCValidationInitiated',
      data: { sellerId, documents },
      metadata: { sagaId: event.sagaId }
    });
  });

  subscribeLegacy('SellerKYCValidationInitiated', async (event) => {
    const { sellerId } = event.data;
    
    const validationResults = { status: 'approved', score: 95 };
    
    await eventBus.publish({
      eventType: 'SellerKYCReviewCompleted',
      data: { sellerId, validationResults },
      metadata: { sagaId: event.sagaId }
    });
  });

  subscribeLegacy('SellerKYCReviewCompleted', async (event) => {
    const { sellerId, validationResults } = event.data;
    
    const kycStatus = validationResults.status === 'approved' ? 'verified' : 'pending';
    
    await eventBus.publish({
      eventType: 'SellerKYCStatusUpdated',
      data: { sellerId, kycStatus },
      metadata: { sagaId: event.sagaId }
    });
  });

  subscribeLegacy('SellerKYCStatusUpdated', async (event) => {
    const { sellerId, kycStatus } = event.data;
    
    await eventBus.publish({
      eventType: 'SellerKYCNotificationSent',
      data: { sellerId, kycStatus },
      metadata: { sagaId: event.sagaId }
    });
  });

  // Seller Settings Events
  subscribeLegacy('SellerSettingsValidationRequested', async (event) => {
    const { sellerId, settings } = event.data;
    
    await eventBus.publish({
      eventType: 'SellerSettingsUpdated',
      data: { sellerId, settings },
      metadata: { sagaId: event.sagaId }
    });
  });

  subscribeLegacy('SellerSettingsUpdated', async (event) => {
    const { sellerId, settings } = event.data;
    
    await eventBus.publish({
      eventType: 'SellerSettingsSynced',
      data: { sellerId, settings },
      metadata: { sagaId: event.sagaId }
    });
  });

  subscribeLegacy('SellerSettingsSynced', async (event) => {
    const { sellerId } = event.data;
    
    await eventBus.publish({
      eventType: 'SellerSettingsNotificationSent',
      data: { sellerId },
      metadata: { sagaId: event.sagaId }
    });
  });
}

// Commission endpoints
app.get('/api/commissions/courier/:courierId', async (req, res) => {
  try {
    const commissions = await prisma.commission.findMany({
      where: { recipientId: req.params.courierId, recipientType: 'courier' } as never
    });
    res.json(commissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/payouts/request', async (req, res) => {
  try {
    const payout = await prisma.payout.create({
      data: req.body
    });
    res.json(payout);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function initializeCourierCommissionHandlers() {
  // Courier Earnings Events
  subscribeLegacy('CourierEarningsUpdated', async (event) => {
    const { courierId, deliveryId, earnings } = event.data;
    
    await eventBus.publish({
      eventType: 'DeliveryCompletionRecorded',
      data: { courierId, deliveryId, completionTime: new Date() },
      metadata: { sagaId: event.sagaId }
    });
  });

  subscribeLegacy('DeliveryCompletionRecorded', async (event) => {
    const { courierId, deliveryId, completionTime } = event.data;
    
    const baseRate = 50;
    
    await eventBus.publish({
      eventType: 'CommissionCalculated',
      data: { courierId, deliveryId, commission: baseRate * 0.8 },
      metadata: { sagaId: event.sagaId }
    });
  });

  subscribeLegacy('CommissionCalculated', async (event) => {
    const { courierId, deliveryId, commission } = event.data;
    
    const bonus = await calculateBonus(courierId);
    
    await eventBus.publish({
      eventType: 'BonusAssessed',
      data: { courierId, deliveryId, bonus },
      metadata: { sagaId: event.sagaId }
    });
  });

  subscribeLegacy('BonusAssessed', async (event) => {
    const { courierId, commission, bonus } = event.data;
    
    const totalEarnings = (commission || 40) + (bonus || 0);
    
    await eventBus.publish({
      eventType: 'PayoutScheduled',
      data: { courierId, totalEarnings, payoutDate: new Date() },
      metadata: { sagaId: event.sagaId }
    });
  });

  subscribeLegacy('PayoutScheduled', async (event) => {
    const { courierId, totalEarnings, payoutDate } = event.data;
    
    await eventBus.publish({
      eventType: 'CourierPayoutNotificationSent',
      data: { courierId, totalEarnings },
      metadata: { sagaId: event.sagaId }
    });
  });

  // Vehicle Management Events
  subscribeLegacy('VehicleRegistered', async (event) => {
    const { courierId, vehicleDetails } = event.data;
    
    await eventBus.publish({
      eventType: 'MaintenanceScheduled',
      data: { courierId, vehicleId: vehicleDetails.id, maintenanceType: 'routine' },
      metadata: { sagaId: event.sagaId }
    });
  });

  subscribeLegacy('MaintenanceScheduled', async (event) => {
    const { courierId, vehicleId, maintenanceType } = event.data;
    
    await eventBus.publish({
      eventType: 'VehicleStatusUpdated',
      data: { courierId, vehicleId, status: 'active' },
      metadata: { sagaId: event.sagaId }
    });
  });

  // KYC Events
  subscribeLegacy('CourierKYCDocumentsSubmitted', async (event) => {
    const { courierId, documents } = event.data;
    
    await eventBus.publish({
      eventType: 'CourierKYCVerificationCompleted',
      data: { courierId, verificationStatus: 'verified' },
      metadata: { sagaId: event.sagaId }
    });
  });

  subscribeLegacy('CourierKYCVerificationCompleted', async (event) => {
    const { courierId, verificationStatus } = event.data;
    
    await eventBus.publish({
      eventType: 'CourierKYCStatusUpdated',
      data: { courierId, verificationStatus },
      metadata: { sagaId: event.sagaId }
    });
  });

  // Settings Events
  subscribeLegacy('CourierSettingsUpdated', async (event) => {
    const { courierId, settings } = event.data;
    
    await eventBus.publish({
      eventType: 'CourierPreferencesSynced',
      data: { courierId, preferences: settings },
      metadata: { sagaId: event.sagaId }
    });
  });

  // Support Events
  subscribeLegacy('CourierSupportRequestCreated', async (event) => {
    const { courierId, supportRequest } = event.data;
    
    await eventBus.publish({
      eventType: 'CourierSupportRequestAssigned',
      data: { courierId, supportRequestId: supportRequest.id },
      metadata: { sagaId: event.sagaId }
    });
  });

  subscribeLegacy('CourierSupportRequestAssigned', async (event) => {
    const { courierId, supportRequestId } = event.data;
    
    await eventBus.publish({
      eventType: 'CourierSupportRequestResolved',
      data: { courierId, supportRequestId, resolution: 'Issue resolved' },
      metadata: { sagaId: event.sagaId }
    });
  });

  subscribeLegacy('CourierSupportRequestResolved', async (event) => {
    const { courierId, supportRequestId, resolution } = event.data;
    
    await eventBus.publish({
      eventType: 'CourierSupportNotificationSent',
      data: { courierId, supportRequestId },
      metadata: { sagaId: event.sagaId }
    });
  });
}

async function calculateBonus(courierId: string) {
  return Math.floor(Math.random() * 20);
}

const PORT = process.env.PORT || 3008;
app.listen(PORT, () => {
  console.log(`Commission Service running on port ${PORT}`);
  console.log('Courier saga event handlers initialized');
});

export default app;
