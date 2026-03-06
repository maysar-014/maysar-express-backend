import express from 'express';
import { PrismaClient } from '@prisma/client';
import { eventBus } from '../../shared/events/eventBus';
import { t } from '@shared/i18n/i18n';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// Initialize courier notification handlers
initializeCourierNotificationHandlers();
initializeSellerSagaHandlers();
initializeEnablerSagaHandlers();

function initializeEnablerSagaHandlers() {
  // Task & Assignment Notifications
  eventBus.subscribe('TaskAssignmentOffered', async (event) => {
    const { taskId, enablerId } = event.data;
    
    await sendNotification({
      recipientId: enablerId,
      recipientType: 'enabler',
      type: 'task_assignment',
      title: t('notification:templates.taskAssignmentTitle'),
      message: t('notification:templates.taskAssignmentMessage', { taskId }),
      channel: 'push'
    });
  });

  eventBus.subscribe('TaskCompletionSubmitted', async (event) => {
    const { taskId, enablerId } = event.data;
    
    await sendNotification({
      recipientId: enablerId,
      recipientType: 'enabler',
      type: 'task_submitted',
      title: t('notification:templates.taskSubmittedTitle'),
      message: t('notification:templates.taskSubmittedMessage'),
      channel: 'push'
    });
  });

  // Training Notifications
  eventBus.subscribe('TrainingScheduled', async (event) => {
    const { enablerId, sellerId, trainingModule } = event.data;
    
    await sendNotification({
      recipientId: enablerId,
      recipientType: 'enabler',
      type: 'training_scheduled',
      title: t('notification:templates.trainingScheduledTitle'),
      message: t('notification:templates.trainingScheduledMessage', { trainingModule }),
      channel: 'email'
    });
  });

  eventBus.subscribe('TrainingCertificateIssued', async (event) => {
    const { enablerId, certificateId } = event.data;
    
    await sendNotification({
      recipientId: enablerId,
      recipientType: 'enabler',
      type: 'certificate_issued',
      title: t('notification:templates.certificateIssuedTitle'),
      message: t('notification:templates.certificateIssuedMessage', { certificateId }),
      channel: 'email'
    });
  });

  // Performance & Earnings Notifications
  eventBus.subscribe('EnablerPayoutNotificationSent', async (event) => {
    const { enablerId, totalEarnings } = event.data;
    
    await sendNotification({
      recipientId: enablerId,
      recipientType: 'enabler',
      type: 'payout_scheduled',
      title: t('notification:templates.payoutScheduledTitle'),
      message: t('notification:templates.payoutScheduledMessage', { totalEarnings }),
      channel: 'email'
    });
  });

  eventBus.subscribe('ImprovementPlanCreated', async (event) => {
    const { enablerId, improvementPlan } = event.data;
    
    await sendNotification({
      recipientId: enablerId,
      recipientType: 'enabler',
      type: 'improvement_plan',
      title: t('notification:templates.improvementPlanTitle'),
      message: t('notification:templates.improvementPlanMessage'),
      channel: 'email'
    });
  });

  // KYC & Settings Notifications
  eventBus.subscribe('EnablerKYCApproved', async (event) => {
    const { enablerId, kycId } = event.data;
    
    await sendNotification({
      recipientId: enablerId,
      recipientType: 'enabler',
      type: 'kyc_approved',
      title: t('notification:templates.kycApprovedTitle'),
      message: t('notification:templates.kycApprovedMessage'),
      channel: 'email'
    });
  });

  eventBus.subscribe('EnablerSettingsUpdateNotificationSent', async (event) => {
    const { enablerId } = event.data;
    
    await sendNotification({
      recipientId: enablerId,
      recipientType: 'enabler',
      type: 'settings_updated',
      title: t('notification:templates.settingsUpdatedTitle'),
      message: t('notification:templates.settingsUpdatedMessage'),
      channel: 'push'
    });
  });

  // Support & Assistance Notifications
  eventBus.subscribe('LogisticsSolutionImplemented', async (event) => {
    const { enablerId, sellerId, solutionResult } = event.data;
    
    await sendNotification({
      recipientId: enablerId,
      recipientType: 'enabler',
      type: 'support_completed',
      title: t('notification:templates.supportCompletedTitle'),
      message: t('notification:templates.supportCompletedMessage', { result: solutionResult.success ? 'resolved' : 'escalated' }),
      channel: 'push'
    });
  });

  eventBus.subscribe('SalesOutcomeTracked', async (event) => {
    const { enablerId, outcome, saleValue } = event.data;
    
    await sendNotification({
      recipientId: enablerId,
      recipientType: 'enabler',
      type: 'sales_outcome',
      title: t('notification:templates.salesOutcomeTitle'),
      message: outcome === 'sale' ? t('notification:templates.salesOutcomeMessageSale', { saleValue }) : t('notification:templates.salesOutcomeMessageOther'),
      channel: 'push'
    });
  });

  eventBus.subscribe('SellerOnboardingCompleted', async (event) => {
    const { enablerId, sellerId } = event.data;
    
    await sendNotification({
      recipientId: enablerId,
      recipientType: 'enabler',
      type: 'onboarding_completed',
      title: t('notification:templates.onboardingCompletedTitle'),
      message: t('notification:templates.onboardingCompletedMessage'),
      channel: 'push'
    });
  });
}

function initializeSellerSagaHandlers() {
  // Seller Notification Events
  eventBus.subscribe('PricingChangeNotificationSent', async (event) => {
    const { sellerId, productId } = event.data;
    
    await sendNotification({
      recipientId: sellerId,
      recipientType: 'seller',
      type: 'pricing_updated',
      title: t('notification:templates.pricingUpdatedTitle'),
      message: t('notification:templates.pricingUpdatedMessage'),
      channel: 'push'
    });
  });

  eventBus.subscribe('CampaignNotificationSent', async (event) => {
    const { sellerId, campaignId } = event.data;
    
    await sendNotification({
      recipientId: sellerId,
      recipientType: 'seller',
      type: 'campaign_activated',
      title: t('notification:templates.campaignActivatedTitle'),
      message: t('notification:templates.campaignActivatedMessage'),
      channel: 'email'
    });
  });

  eventBus.subscribe('PayoutNotificationSent', async (event) => {
    const { sellerId, payoutId } = event.data;
    
    await sendNotification({
      recipientId: sellerId,
      recipientType: 'seller',
      type: 'payout_processed',
      title: t('notification:templates.payoutProcessedTitle'),
      message: t('notification:templates.payoutProcessedMessage'),
      channel: 'email'
    });
  });

  eventBus.subscribe('SellerKYCNotificationSent', async (event) => {
    const { sellerId, kycStatus } = event.data;
    
    const message = kycStatus === 'verified' 
      ? t('notification:templates.kycStatusUpdateMessageVerified')
      : t('notification:templates.kycStatusUpdateMessagePending');
    
    await sendNotification({
      recipientId: sellerId,
      recipientType: 'seller',
      type: 'kyc_status_update',
      title: t('notification:templates.kycStatusUpdateTitle'),
      message,
      channel: 'email'
    });
  });

  eventBus.subscribe('SellerSettingsNotificationSent', async (event) => {
    const { sellerId } = event.data;
    
    await sendNotification({
      recipientId: sellerId,
      recipientType: 'seller',
      type: 'settings_updated',
      title: t('notification:templates.settingsUpdatedTitle'),
      message: t('notification:templates.settingsUpdatedMessage'),
      channel: 'push'
    });
  });

  eventBus.subscribe('SupportResolutionNotificationSent', async (event) => {
    const { sellerId, supportRequestId } = event.data;
    
    await sendNotification({
      recipientId: sellerId,
      recipientType: 'seller',
      type: 'support_resolved',
      title: t('notification:templates.supportResolvedTitle'),
      message: t('notification:templates.supportResolvedMessage'),
      channel: 'email'
    });
  });

  eventBus.subscribe('CollaborationNotificationSent', async (event) => {
    const { sellerId, enablerId } = event.data;
    
    await sendNotification({
      recipientId: sellerId,
      recipientType: 'seller',
      type: 'enabler_collaboration',
      title: t('notification:templates.enablerCollaborationTitle'),
      message: t('notification:templates.enablerCollaborationMessage'),
      channel: 'push'
    });
  });

  // Order and Fulfillment Notifications
  eventBus.subscribe('OrderShipped', async (event) => {
    const { orderId, customerId } = event.data;
    
    await sendNotification({
      recipientId: customerId,
      recipientType: 'customer',
      type: 'order_shipped',
      title: t('notification:templates.orderShippedTitle'),
      message: t('notification:templates.orderShippedMessage', { orderId }),
      channel: 'sms'
    });
  });

  eventBus.subscribe('DeliveryMonitoringStarted', async (event) => {
    const { orderId } = event.data;
    
    await sendRealTimeUpdate({
      recipientId: orderId,
      type: 'delivery_tracking',
      data: { status: 'in_transit', timestamp: new Date() }
    });
  });

  eventBus.subscribe('RefundProcessed', async (event) => {
    const { returnId, orderId, refundAmount } = event.data;
    
    await sendNotification({
      recipientId: 'customer',
      recipientType: 'customer',
      type: 'refund_processed',
      title: t('notification:templates.refundProcessedTitle'),
      message: t('notification:templates.refundProcessedMessage', { refundAmount }),
      channel: 'email'
    });
  });
}

// Notification endpoints
app.post('/api/notifications/send', async (req, res) => {
  try {
    const notification = await prisma.notification.create({
      data: req.body
    });
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/notifications/courier/:courierId', async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { recipientId: req.params.courierId, recipientType: 'courier' }
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function initializeCourierNotificationHandlers() {
  // Delivery Notifications
  eventBus.subscribe('DeliveryCompletionNotificationSent', async (event) => {
    const { courierId, deliveryId, customerId } = event.data;
    
    await sendNotification({
      recipientId: courierId,
      recipientType: 'courier',
      type: 'delivery_completed',
      title: t('notification:templates.deliveryCompletedTitle'),
      message: t('notification:templates.deliveryCompletedMessageCourier', { deliveryId }),
      channel: 'push'
    });
    
    await sendNotification({
      recipientId: customerId,
      recipientType: 'customer',
      type: 'delivery_completed',
      title: t('notification:templates.deliveryCompletedMessageCustomer'),
      message: t('notification:templates.deliveryCompletedMessageCustomerDetail'),
      channel: 'sms'
    });
  });

  // Earnings Notifications
  eventBus.subscribe('CourierPayoutNotificationSent', async (event) => {
    const { courierId, totalEarnings } = event.data;
    
    await sendNotification({
      recipientId: courierId,
      recipientType: 'courier',
      type: 'payout_scheduled',
      title: t('notification:templates.courierPayoutTitle'),
      message: t('notification:templates.courierPayoutMessage', { totalEarnings }),
      channel: 'push'
    });
  });

  // KYC Notifications
  eventBus.subscribe('CourierKYCStatusUpdated', async (event) => {
    const { courierId, verificationStatus } = event.data;
    
    const message = verificationStatus === 'verified' 
      ? t('notification:templates.courierKycStatusMessageVerified')
      : t('notification:templates.courierKycStatusMessagePending');
    
    await sendNotification({
      recipientId: courierId,
      recipientType: 'courier',
      type: 'kyc_status_update',
      title: t('notification:templates.courierKycStatusTitle'),
      message,
      channel: 'email'
    });
  });

  // Settings Notifications
  eventBus.subscribe('CourierPreferencesSynced', async (event) => {
    const { courierId } = event.data;
    
    await sendNotification({
      recipientId: courierId,
      recipientType: 'courier',
      type: 'settings_updated',
      title: t('notification:templates.courierPreferencesTitle'),
      message: t('notification:templates.courierPreferencesMessage'),
      channel: 'push'
    });
  });

  // Support Notifications
  eventBus.subscribe('CourierSupportNotificationSent', async (event) => {
    const { courierId, supportRequestId } = event.data;
    
    await sendNotification({
      recipientId: courierId,
      recipientType: 'courier',
      type: 'support_resolved',
      title: t('notification:templates.courierSupportTitle'),
      message: t('notification:templates.courierSupportMessage', { supportRequestId }),
      channel: 'email'
    });
  });

  // Vehicle Notifications
  eventBus.subscribe('VehicleStatusUpdated', async (event) => {
    const { courierId, vehicleId, status } = event.data;
    
    await sendNotification({
      recipientId: courierId,
      recipientType: 'courier',
      type: 'vehicle_status',
      title: t('notification:templates.vehicleStatusTitle'),
      message: t('notification:templates.vehicleStatusMessage', { vehicleId, status }),
      channel: 'push'
    });
  });

  // Performance Notifications
  eventBus.subscribe('PerformanceReportGenerated', async (event) => {
    const { courierId, report } = event.data;
    
    await sendNotification({
      recipientId: courierId,
      recipientType: 'courier',
      type: 'performance_report',
      title: t('notification:templates.performanceReportTitle'),
      message: t('notification:templates.performanceReportMessage'),
      channel: 'push'
    });
  });

  // Dashboard Notifications
  eventBus.subscribe('CourierDashboardRefreshed', async (event) => {
    const { courierId } = event.data;
    
    await sendRealTimeUpdate({
      recipientId: courierId,
      type: 'dashboard_refresh',
      data: { timestamp: new Date() }
    });
  });
}

async function sendNotification(notificationData) {
  try {
    const notification = await prisma.notification.create({
      data: {
        ...notificationData,
        status: 'sent',
        sentAt: new Date()
      }
    });

    switch (notificationData.channel) {
      case 'push':
        await sendPushNotification(notification);
        break;
      case 'email':
        await sendEmailNotification(notification);
        break;
      case 'sms':
        await sendSMSNotification(notification);
        break;
    }

    return notification;
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

async function sendPushNotification(notification) {
  console.log(`Push notification sent to ${notification.recipientId}: ${notification.message}`);
}

async function sendEmailNotification(notification) {
  console.log(`Email sent to ${notification.recipientId}: ${notification.message}`);
}

async function sendSMSNotification(notification) {
  console.log(`SMS sent to ${notification.recipientId}: ${notification.message}`);
}

async function sendRealTimeUpdate(updateData) {
  console.log(`Real-time update sent to ${updateData.recipientId}`);
}

const PORT = process.env.PORT || 3010;
app.listen(PORT, () => {
  console.log(`Notification Service running on port ${PORT}`);
  console.log('Courier saga notification handlers initialized');
});

export default app;