import express from 'express';
import { PrismaClient } from '@prisma/client';
import { eventBus } from '../../../shared/events/eventBus';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// Initialize supplier payment handlers
initializeSupplierPaymentHandlers();
initializeSellerSagaHandlers();
initializeEnablerSagaHandlers();

function initializeEnablerSagaHandlers() {
  // Training Payment Events
  eventBus.subscribe('TrainingDeliveryStarted', async (event) => {
    const { enablerId, trainingId } = event.data;
    
    await eventBus.publish({
      type: 'TrainingPaymentCalculated',
      data: { enablerId, trainingId, amount: 30, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('TrainingAssessmentCompleted', async (event) => {
    const { enablerId, passed, actualScore } = event.data;
    
    if (passed) {
      const bonus = actualScore > 90 ? 10 : 0;
      
      await eventBus.publish({
        type: 'TrainingBonusCalculated',
        data: { enablerId, bonus, sagaId: event.sagaId }
      });
    }
  });

  // Support Service Payments
  eventBus.subscribe('LogisticsSolutionImplemented', async (event) => {
    const { enablerId, solutionResult } = event.data;
    
    if (solutionResult.success) {
      const paymentAmount = 25;
      
      await prisma.transaction.create({
        data: {
          id: `TXN-${Date.now()}`,
          senderId: 'platform',
          receiverId: enablerId,
          amount: paymentAmount,
          currency: 'USD',
          status: 'COMPLETED',
          processedAt: new Date()
        }
      });
    }
  });

  eventBus.subscribe('SalesOutcomeTracked', async (event) => {
    const { enablerId, outcome, saleValue } = event.data;
    
    if (outcome === 'sale') {
      const commission = saleValue * 0.05;
      
      await prisma.transaction.create({
        data: {
          id: `TXN-${Date.now()}`,
          senderId: 'platform',
          receiverId: enablerId,
          amount: commission,
          currency: 'USD',
          status: 'COMPLETED',
          processedAt: new Date()
        }
      });
    }
  });

  // Onboarding Payments
  eventBus.subscribe('SellerOnboardingCompleted', async (event) => {
    const { enablerId, sellerId } = event.data;
    
    const onboardingFee = 50;
    
    await prisma.transaction.create({
      data: {
        id: `TXN-${Date.now()}`,
        senderId: 'platform',
        receiverId: enablerId,
        amount: onboardingFee,
        currency: 'USD',
        status: 'COMPLETED',
        processedAt: new Date()
      }
    });
  });
}

function initializeSellerSagaHandlers() {
  // Payment Management Saga Events
  eventBus.subscribe('SellerPayoutRequested', async (event) => {
    const { sellerId, payoutDetails } = event.data;
    
    await eventBus.publish({
      type: 'PayoutValidationInitiated',
      data: { sellerId, payoutDetails, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('PayoutValidationInitiated', async (event) => {
    const { sellerId, payoutDetails } = event.data;
    
    const isValid = payoutDetails.amount > 0;
    
    if (isValid) {
      const payoutId = `PAYOUT-${Date.now()}`;
      
      await eventBus.publish({
        type: 'SellerPayoutProcessed',
        data: { sellerId, payoutId, sagaId: event.sagaId }
      });
    }
  });

  eventBus.subscribe('SellerPayoutProcessed', async (event) => {
    const { sellerId, payoutId } = event.data;
    
    await prisma.transaction.create({
      data: {
        id: payoutId,
        senderId: 'platform',
        receiverId: sellerId,
        amount: 1000,
        currency: 'USD',
        status: 'COMPLETED',
        processedAt: new Date()
      }
    });
    
    await eventBus.publish({
      type: 'PayoutNotificationSent',
      data: { sellerId, payoutId, sagaId: event.sagaId }
    });
  });

  // Order Payment Processing Events
  eventBus.subscribe('PaymentVerificationRequested', async (event) => {
    const { orderId } = event.data;
    
    await eventBus.publish({
      type: 'PaymentVerified',
      data: { orderId, verifiedAt: new Date(), sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('PaymentFailed', async (event) => {
    const { orderId } = event.data;
    
    await eventBus.publish({
      type: 'PaymentRefunded',
      data: { orderId, sagaId: event.sagaId }
    });
  });
}

function initializeSupplierPaymentHandlers() {
  // Supplier Payment Processing Events
  eventBus.subscribe('SupplierPaymentRequested', async (event) => {
    const { supplierId, bulkOrderId, amount } = event.data;
    
    const validationPassed = await validateSupplierPayment(supplierId, bulkOrderId, amount);
    
    await eventBus.publish({
      type: 'SupplierPaymentValidated',
      data: { supplierId, bulkOrderId, amount, validationPassed, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('SupplierPaymentValidated', async (event) => {
    const { supplierId, bulkOrderId, amount, validationPassed } = event.data;
    
    if (validationPassed) {
      const transactionId = `TXN-${Date.now()}`;
      
      await eventBus.publish({
        type: 'SupplierPaymentProcessed',
        data: { supplierId, bulkOrderId, amount, transactionId, sagaId: event.sagaId }
      });
    }
  });

  eventBus.subscribe('SupplierPaymentProcessed', async (event) => {
    const { supplierId, bulkOrderId, transactionId } = event.data;
    
    await eventBus.publish({
      type: 'SupplierPaymentConfirmed',
      data: { supplierId, bulkOrderId, transactionId, confirmedAt: new Date(), sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('SupplierPaymentConfirmed', async (event) => {
    const { supplierId, bulkOrderId, transactionId } = event.data;
    
    await eventBus.publish({
      type: 'SupplierPaymentNotificationSent',
      data: { supplierId, bulkOrderId, transactionId, sagaId: event.sagaId }
    });
  });
}

async function validateSupplierPayment(supplierId, bulkOrderId, amount) {
  return amount > 0; // Simplified validation
}

// Transaction Monitoring - TransactionMonitoringSaga Integration
app.post('/api/payment/process', async (req, res) => {
  const { transactionId, amount, currency, senderId, receiverId, transactionType, sagaId } = req.body;

  try {
    await eventBus.publish('TransactionDetected.v1', {
      transactionId, amount, currency, sagaId
    });

    // Fraud Screening
    const fraudResult = {
      velocityCheck: { passed: amount < 10000 },
      sanctionsCheck: { senderClear: true, receiverClear: true },
      behavioralCheck: { normalPattern: true, anomalyScore: 0.2 },
      geographicCheck: { senderCountryRisk: 'low', receiverCountryRisk: 'low' },
      overallRisk: 'low'
    };

    await eventBus.publish('FraudScreeningCompleted.v1', {
      transactionId, fraudResult, sagaId
    });

    // Risk Assessment
    let riskScore = 0;
    if (amount > 50000) riskScore += 30;
    else if (amount > 10000) riskScore += 15;
    
    const riskLevel = riskScore >= 80 ? 'critical' : riskScore >= 60 ? 'high' : 'low';

    await eventBus.publish('TransactionRiskAssessed.v1', {
      transactionId, riskScore, riskLevel, sagaId
    });

    // Decision
    let decision = 'approve';
    if (amount > 100000) decision = 'review';
    if (transactionType === 'suspicious_pattern') decision = 'block';

    await eventBus.publish('TransactionDecisionMade.v1', {
      transactionId, decision, sagaId
    });

    if (decision === 'approve') {
      await prisma.transaction.create({
        data: {
          id: transactionId,
          amount,
          currency,
          senderId,
          receiverId,
          status: 'COMPLETED',
          processedAt: new Date()
        }
      });
    }

    res.json({ success: true, decision, riskLevel });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Commission Processing - CommissionProcessingSaga Integration
app.post('/api/payment/commission', async (req, res) => {
  const { transactionId, commissionRules, sagaId } = req.body;

  try {
    const commissions = [
      { recipient: 'platform', amount: 50, percentage: 2.5 },
      { recipient: 'enabler', amount: 20, percentage: 1.0 },
      { recipient: 'referrer', amount: 10, percentage: 0.5 }
    ];

    await eventBus.publish('CommissionsCalculated.v1', {
      transactionId, commissions, sagaId
    });

    await eventBus.publish('CommissionsValidated.v1', {
      transactionId, sagaId
    });

    await eventBus.publish('CommissionsDistributed.v1', {
      transactionId, sagaId
    });

    await eventBus.publish('CommissionsRecorded.v1', {
      transactionId, sagaId
    });

    res.json({ success: true, commissions });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Dispute Resolution - DisputeResolutionSaga Integration
app.post('/api/payment/dispute', async (req, res) => {
  const { disputeId, disputeType, parties, sagaId } = req.body;

  try {
    await eventBus.publish('DisputeInitiated.v1', {
      disputeId, disputeType, parties, sagaId
    });

    await eventBus.publish('EvidenceCollectionStarted.v1', {
      disputeId, sagaId
    });

    // Simulate evidence collection completion
    setTimeout(async () => {
      await eventBus.publish('EvidenceCollectionCompleted.v1', { disputeId });
    }, 1000);

    await eventBus.publish('MediationStarted.v1', {
      disputeId, sagaId, mediator: 'system_mediator'
    });

    // Simulate mediation completion
    setTimeout(async () => {
      await eventBus.publish('MediationCompleted.v1', { disputeId });
    }, 2000);

    const resolution = {
      outcome: 'favor_buyer',
      compensation: 100,
      reasoning: 'Product not as described'
    };

    await eventBus.publish('DisputeResolved.v1', {
      disputeId, resolution, sagaId
    });

    res.json({ success: true, resolution });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => console.log(`Payment Service running on port ${PORT}`));

export default app;