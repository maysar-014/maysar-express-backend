import express from 'express';
import { PrismaClient } from '@prisma/client';
import { eventBus } from '../../shared/events/eventBus';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// Initialize courier commission handlers
initializeCourierCommissionHandlers();
initializeSellerSagaHandlers();
initializeEnablerSagaHandlers();

function initializeEnablerSagaHandlers() {
  // Task Assignment & Completion Events
  eventBus.subscribe('TaskCreated', async (event) => {
    const { taskId, taskType, enablerId } = event.data;
    
    await eventBus.publish({
      type: 'EnablerMatched',
      data: { taskId, matchedEnablers: [{ id: enablerId }], sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('TaskAssignmentAccepted', async (event) => {
    const { taskId, enablerId } = event.data;
    
    await prisma.commission.create({
      data: {
        recipientId: enablerId,
        recipientType: 'enabler',
        amount: 0,
        type: 'task_assignment',
        status: 'pending'
      }
    });
  });

  eventBus.subscribe('TaskCommissionCalculated', async (event) => {
    const { taskId, enablerId, commission, qualityBonus } = event.data;
    
    const totalEarnings = commission + (qualityBonus || 0);
    
    await prisma.commission.create({
      data: {
        recipientId: enablerId,
        recipientType: 'enabler',
        amount: totalEarnings,
        type: 'task_completion',
        status: 'earned'
      }
    });
    
    await eventBus.publish({
      type: 'PayoutScheduled',
      data: { enablerId, totalEarnings, payoutDate: new Date(), sagaId: event.sagaId }
    });
  });

  // Performance & Commission Events
  eventBus.subscribe('EnablerActivitiesAggregated', async (event) => {
    const { enablerId, activities } = event.data;
    
    const baseCommission = activities.reduce((sum, activity) => sum + activity.total, 0);
    
    await eventBus.publish({
      type: 'BaseCommissionCalculated',
      data: { enablerId, baseCommission: { total: baseCommission }, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('PayoutScheduled', async (event) => {
    const { enablerId, totalEarnings } = event.data;
    
    await prisma.payout.create({
      data: {
        recipientId: enablerId,
        recipientType: 'enabler',
        amount: totalEarnings,
        status: 'scheduled',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });
    
    await eventBus.publish({
      type: 'EnablerPayoutNotificationSent',
      data: { enablerId, totalEarnings, sagaId: event.sagaId }
    });
  });

  // KYC Events
  eventBus.subscribe('EnablerKYCInitiated', async (event) => {
    const { enablerId, kycId } = event.data;
    
    await eventBus.publish({
      type: 'EnablerKYCDocumentUploaded',
      data: { kycId, enablerId, uploadedAt: new Date(), sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('EnablerKYCAutomatedVerificationCompleted', async (event) => {
    const { kycId, verificationResult } = event.data;
    
    if (verificationResult.confidence > 0.8) {
      await eventBus.publish({
        type: 'EnablerKYCApproved',
        data: { kycId, approvedAt: new Date(), status: 'approved', sagaId: event.sagaId }
      });
    }
  });

  // Settings Events
  eventBus.subscribe('EnablerSettingsUpdateRequested', async (event) => {
    const { enablerId, updates } = event.data;
    
    await eventBus.publish({
      type: 'EnablerSettingsValidated',
      data: { enablerId, validationResult: { valid: true }, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('EnablerSettingsValidated', async (event) => {
    const { enablerId, validationResult } = event.data;
    
    if (validationResult.valid) {
      await eventBus.publish({
        type: 'EnablerSettingsApplied',
        data: { enablerId, appliedAt: new Date(), sagaId: event.sagaId }
      });
    }
  });
}

function initializeSellerSagaHandlers() {
  // Enabler Collaboration Saga Events
  eventBus.subscribe('EnablerAssistanceRequested', async (event) => {
    const { sellerId, requestDetails } = event.data;
    
    await eventBus.publish({
      type: 'EnablerMatchingInitiated',
      data: { sellerId, requestDetails, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('EnablerMatchingInitiated', async (event) => {
    const { sellerId } = event.data;
    
    const enablerId = `enabler_${Math.floor(Math.random() * 100)}`;
    
    await eventBus.publish({
      type: 'EnablerCollaborationEstablished',
      data: { sellerId, enablerId, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('EnablerCollaborationEstablished', async (event) => {
    const { sellerId, enablerId } = event.data;
    
    await prisma.commission.create({
      data: {
        recipientId: enablerId,
        recipientType: 'enabler',
        amount: 25,
        type: 'collaboration_setup',
        status: 'pending'
      }
    });
    
    await eventBus.publish({
      type: 'CollaborationNotificationSent',
      data: { sellerId, enablerId, sagaId: event.sagaId }
    });
  });

  // Seller KYC Events
  eventBus.subscribe('SellerKYCDocumentsSubmitted', async (event) => {
    const { sellerId, documents } = event.data;
    
    await eventBus.publish({
      type: 'SellerKYCValidationInitiated',
      data: { sellerId, documents, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('SellerKYCValidationInitiated', async (event) => {
    const { sellerId } = event.data;
    
    const validationResults = { status: 'approved', score: 95 };
    
    await eventBus.publish({
      type: 'SellerKYCReviewCompleted',
      data: { sellerId, validationResults, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('SellerKYCReviewCompleted', async (event) => {
    const { sellerId, validationResults } = event.data;
    
    const kycStatus = validationResults.status === 'approved' ? 'verified' : 'pending';
    
    await eventBus.publish({
      type: 'SellerKYCStatusUpdated',
      data: { sellerId, kycStatus, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('SellerKYCStatusUpdated', async (event) => {
    const { sellerId, kycStatus } = event.data;
    
    await eventBus.publish({
      type: 'SellerKYCNotificationSent',
      data: { sellerId, kycStatus, sagaId: event.sagaId }
    });
  });

  // Seller Settings Events
  eventBus.subscribe('SellerSettingsValidationRequested', async (event) => {
    const { sellerId, settings } = event.data;
    
    await eventBus.publish({
      type: 'SellerSettingsUpdated',
      data: { sellerId, settings, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('SellerSettingsUpdated', async (event) => {
    const { sellerId, settings } = event.data;
    
    await eventBus.publish({
      type: 'SellerSettingsSynced',
      data: { sellerId, settings, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('SellerSettingsSynced', async (event) => {
    const { sellerId } = event.data;
    
    await eventBus.publish({
      type: 'SellerSettingsNotificationSent',
      data: { sellerId, sagaId: event.sagaId }
    });
  });
}

// Commission endpoints
app.get('/api/commissions/courier/:courierId', async (req, res) => {
  try {
    const commissions = await prisma.commission.findMany({
      where: { recipientId: req.params.courierId, recipientType: 'courier' }
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
  eventBus.subscribe('CourierEarningsUpdated', async (event) => {
    const { courierId, deliveryId, earnings } = event.data;
    
    await eventBus.publish({
      type: 'DeliveryCompletionRecorded',
      data: { courierId, deliveryId, completionTime: new Date(), sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('DeliveryCompletionRecorded', async (event) => {
    const { courierId, deliveryId, completionTime } = event.data;
    
    const baseRate = 50;
    
    await eventBus.publish({
      type: 'CommissionCalculated',
      data: { courierId, deliveryId, commission: baseRate * 0.8, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('CommissionCalculated', async (event) => {
    const { courierId, deliveryId, commission } = event.data;
    
    const bonus = await calculateBonus(courierId);
    
    await eventBus.publish({
      type: 'BonusAssessed',
      data: { courierId, deliveryId, bonus, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('BonusAssessed', async (event) => {
    const { courierId, commission, bonus } = event.data;
    
    const totalEarnings = (commission || 40) + (bonus || 0);
    
    await eventBus.publish({
      type: 'PayoutScheduled',
      data: { courierId, totalEarnings, payoutDate: new Date(), sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('PayoutScheduled', async (event) => {
    const { courierId, totalEarnings, payoutDate } = event.data;
    
    await eventBus.publish({
      type: 'CourierPayoutNotificationSent',
      data: { courierId, totalEarnings, sagaId: event.sagaId }
    });
  });

  // Vehicle Management Events
  eventBus.subscribe('VehicleRegistered', async (event) => {
    const { courierId, vehicleDetails } = event.data;
    
    await eventBus.publish({
      type: 'MaintenanceScheduled',
      data: { courierId, vehicleId: vehicleDetails.id, maintenanceType: 'routine', sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('MaintenanceScheduled', async (event) => {
    const { courierId, vehicleId, maintenanceType } = event.data;
    
    await eventBus.publish({
      type: 'VehicleStatusUpdated',
      data: { courierId, vehicleId, status: 'active', sagaId: event.sagaId }
    });
  });

  // KYC Events
  eventBus.subscribe('CourierKYCDocumentsSubmitted', async (event) => {
    const { courierId, documents } = event.data;
    
    await eventBus.publish({
      type: 'CourierKYCVerificationCompleted',
      data: { courierId, verificationStatus: 'verified', sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('CourierKYCVerificationCompleted', async (event) => {
    const { courierId, verificationStatus } = event.data;
    
    await eventBus.publish({
      type: 'CourierKYCStatusUpdated',
      data: { courierId, verificationStatus, sagaId: event.sagaId }
    });
  });

  // Settings Events
  eventBus.subscribe('CourierSettingsUpdated', async (event) => {
    const { courierId, settings } = event.data;
    
    await eventBus.publish({
      type: 'CourierPreferencesSynced',
      data: { courierId, preferences: settings, sagaId: event.sagaId }
    });
  });

  // Support Events
  eventBus.subscribe('CourierSupportRequestCreated', async (event) => {
    const { courierId, supportRequest } = event.data;
    
    await eventBus.publish({
      type: 'CourierSupportRequestAssigned',
      data: { courierId, supportRequestId: supportRequest.id, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('CourierSupportRequestAssigned', async (event) => {
    const { courierId, supportRequestId } = event.data;
    
    await eventBus.publish({
      type: 'CourierSupportRequestResolved',
      data: { courierId, supportRequestId, resolution: 'Issue resolved', sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('CourierSupportRequestResolved', async (event) => {
    const { courierId, supportRequestId, resolution } = event.data;
    
    await eventBus.publish({
      type: 'CourierSupportNotificationSent',
      data: { courierId, supportRequestId, sagaId: event.sagaId }
    });
  });
}

async function calculateBonus(courierId) {
  return Math.floor(Math.random() * 20);
}

const PORT = process.env.PORT || 3008;
app.listen(PORT, () => {
  console.log(`Commission Service running on port ${PORT}`);
  console.log('Courier saga event handlers initialized');
});

export default app;