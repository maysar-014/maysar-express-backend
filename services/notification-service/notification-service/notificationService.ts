import express from 'express';
import { PrismaClient } from '@prisma/client';
import { eventBus } from '../../shared/events/eventBus';

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
      title: 'New Task Available',
      message: `Task ${taskId} has been assigned to you`,
      channel: 'push'
    });
  });

  eventBus.subscribe('TaskCompletionSubmitted', async (event) => {
    const { taskId, enablerId } = event.data;
    
    await sendNotification({
      recipientId: enablerId,
      recipientType: 'enabler',
      type: 'task_submitted',
      title: 'Task Submitted',
      message: 'Your task completion has been submitted for review',
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
      title: 'Training Scheduled',
      message: `Training session for ${trainingModule} has been scheduled`,
      channel: 'email'
    });
  });

  eventBus.subscribe('TrainingCertificateIssued', async (event) => {
    const { enablerId, certificateId } = event.data;
    
    await sendNotification({
      recipientId: enablerId,
      recipientType: 'enabler',
      type: 'certificate_issued',
      title: 'Certificate Issued',
      message: `Training certificate ${certificateId} has been issued`,
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
      title: 'Payout Scheduled',
      message: `Your payout of $${totalEarnings} has been scheduled`,
      channel: 'email'
    });
  });

  eventBus.subscribe('ImprovementPlanCreated', async (event) => {
    const { enablerId, improvementPlan } = event.data;
    
    await sendNotification({
      recipientId: enablerId,
      recipientType: 'enabler',
      type: 'improvement_plan',
      title: 'Performance Improvement Plan',
      message: 'A new improvement plan has been created for you',
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
      title: 'KYC Verification Approved',
      message: 'Your KYC verification has been approved',
      channel: 'email'
    });
  });

  eventBus.subscribe('EnablerSettingsUpdateNotificationSent', async (event) => {
    const { enablerId } = event.data;
    
    await sendNotification({
      recipientId: enablerId,
      recipientType: 'enabler',
      type: 'settings_updated',
      title: 'Settings Updated',
      message: 'Your account settings have been updated successfully',
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
      title: 'Support Task Completed',
      message: `Logistics support for seller has been ${solutionResult.success ? 'resolved' : 'escalated'}`,
      channel: 'push'
    });
  });

  eventBus.subscribe('SalesOutcomeTracked', async (event) => {
    const { enablerId, outcome, saleValue } = event.data;
    
    await sendNotification({
      recipientId: enablerId,
      recipientType: 'enabler',
      type: 'sales_outcome',
      title: 'Sales Support Outcome',
      message: outcome === 'sale' ? `Sale completed: $${saleValue}` : 'Sales support completed',
      channel: 'push'
    });
  });

  eventBus.subscribe('SellerOnboardingCompleted', async (event) => {
    const { enablerId, sellerId } = event.data;
    
    await sendNotification({
      recipientId: enablerId,
      recipientType: 'enabler',
      type: 'onboarding_completed',
      title: 'Seller Onboarding Completed',
      message: 'Seller onboarding has been completed successfully',
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
      title: 'Pricing Updated',
      message: `Product pricing has been updated successfully`,
      channel: 'push'
    });
  });

  eventBus.subscribe('CampaignNotificationSent', async (event) => {
    const { sellerId, campaignId } = event.data;
    
    await sendNotification({
      recipientId: sellerId,
      recipientType: 'seller',
      type: 'campaign_activated',
      title: 'Campaign Activated',
      message: `Your promotional campaign has been activated`,
      channel: 'email'
    });
  });

  eventBus.subscribe('PayoutNotificationSent', async (event) => {
    const { sellerId, payoutId } = event.data;
    
    await sendNotification({
      recipientId: sellerId,
      recipientType: 'seller',
      type: 'payout_processed',
      title: 'Payout Processed',
      message: `Your payout has been processed successfully`,
      channel: 'email'
    });
  });

  eventBus.subscribe('SellerKYCNotificationSent', async (event) => {
    const { sellerId, kycStatus } = event.data;
    
    const message = kycStatus === 'verified' 
      ? 'Your KYC verification has been approved'
      : 'Your KYC verification requires additional documents';
    
    await sendNotification({
      recipientId: sellerId,
      recipientType: 'seller',
      type: 'kyc_status_update',
      title: 'KYC Status Update',
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
      title: 'Settings Updated',
      message: 'Your account settings have been updated successfully',
      channel: 'push'
    });
  });

  eventBus.subscribe('SupportResolutionNotificationSent', async (event) => {
    const { sellerId, supportRequestId } = event.data;
    
    await sendNotification({
      recipientId: sellerId,
      recipientType: 'seller',
      type: 'support_resolved',
      title: 'Support Request Resolved',
      message: `Your support request has been resolved`,
      channel: 'email'
    });
  });

  eventBus.subscribe('CollaborationNotificationSent', async (event) => {
    const { sellerId, enablerId } = event.data;
    
    await sendNotification({
      recipientId: sellerId,
      recipientType: 'seller',
      type: 'enabler_collaboration',
      title: 'Enabler Collaboration Established',
      message: 'You have been matched with an enabler for assistance',
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
      title: 'Order Shipped',
      message: `Your order ${orderId} has been shipped`,
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
      title: 'Refund Processed',
      message: `Your refund of $${refundAmount} has been processed`,
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
      title: 'Delivery Completed',
      message: `Delivery ${deliveryId} has been completed successfully`,
      channel: 'push'
    });
    
    await sendNotification({
      recipientId: customerId,
      recipientType: 'customer',
      type: 'delivery_completed',
      title: 'Package Delivered',
      message: 'Your package has been delivered',
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
      title: 'Payout Scheduled',
      message: `Your payout of $${totalEarnings} has been scheduled`,
      channel: 'push'
    });
  });

  // KYC Notifications
  eventBus.subscribe('CourierKYCStatusUpdated', async (event) => {
    const { courierId, verificationStatus } = event.data;
    
    const message = verificationStatus === 'verified' 
      ? 'Your KYC verification has been approved'
      : 'Your KYC verification requires additional documents';
    
    await sendNotification({
      recipientId: courierId,
      recipientType: 'courier',
      type: 'kyc_status_update',
      title: 'KYC Status Update',
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
      title: 'Settings Updated',
      message: 'Your preferences have been updated successfully',
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
      title: 'Support Request Resolved',
      message: `Your support request #${supportRequestId} has been resolved`,
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
      title: 'Vehicle Status Updated',
      message: `Your vehicle ${vehicleId} status is now ${status}`,
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
      title: 'Performance Report Available',
      message: 'Your monthly performance report is ready to view',
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