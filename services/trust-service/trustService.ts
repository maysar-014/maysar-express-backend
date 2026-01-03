import express from 'express';
import { PrismaClient } from '@prisma/client';
import { eventBus } from '../../shared/events/eventBus';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// Initialize event handlers
initializeEventHandlers();
initializeSellerSagaHandlers();
initializeEnablerSagaHandlers();

function initializeEnablerSagaHandlers() {
  // Training & Onboarding Events
  eventBus.subscribe('SellerRegistrationInitiated', async (event) => {
    const { enablerId, registrationId } = event.data;
    
    await eventBus.publish({
      type: 'DocumentCollectionStarted',
      data: { registrationId, enablerId, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('DocumentCollectionStarted', async (event) => {
    const { registrationId, enablerId } = event.data;
    
    await eventBus.publish({
      type: 'KYCAssistanceProvided',
      data: { registrationId, enablerId, kycStatus: 'assisted', sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('KYCAssistanceProvided', async (event) => {
    const { registrationId, enablerId } = event.data;
    
    const sellerId = `SELLER-${Date.now()}`;
    
    await eventBus.publish({
      type: 'SellerAccountCreated',
      data: { registrationId, sellerId, enablerId, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('SellerAccountCreated', async (event) => {
    const { registrationId, sellerId, enablerId } = event.data;
    
    await eventBus.publish({
      type: 'SellerOnboardingCompleted',
      data: { registrationId, sellerId, enablerId, completedAt: new Date(), sagaId: event.sagaId }
    });
  });

  // Customer Support & Inquiry Events
  eventBus.subscribe('LogisticsSupportRequestReceived', async (event) => {
    const { enablerId, sellerId, supportType } = event.data;
    
    await eventBus.publish({
      type: 'LogisticsIssueDiagnosed',
      data: { enablerId, sellerId, diagnosis: { estimatedTime: '2 hours' }, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('LogisticsIssueDiagnosed', async (event) => {
    const { enablerId, sellerId } = event.data;
    
    await eventBus.publish({
      type: 'LogisticsSolutionImplemented',
      data: { enablerId, sellerId, solutionResult: { success: true }, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('SalesInquiryReceived', async (event) => {
    const { enablerId, sellerId, inquiryType } = event.data;
    
    await eventBus.publish({
      type: 'CustomerProfileResearched',
      data: { enablerId, sellerId, customerProfile: { riskLevel: 'low' }, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('CustomerProfileResearched', async (event) => {
    const { enablerId, sellerId } = event.data;
    
    await eventBus.publish({
      type: 'SalesStrategyDeveloped',
      data: { enablerId, sellerId, salesStrategy: { approach: 'consultative' }, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('SalesStrategyDeveloped', async (event) => {
    const { enablerId, sellerId } = event.data;
    
    await eventBus.publish({
      type: 'CustomerEngagementCompleted',
      data: { enablerId, sellerId, engagementResult: { outcome: 'sale', saleValue: 500 }, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('CustomerEngagementCompleted', async (event) => {
    const { enablerId, sellerId, engagementResult } = event.data;
    
    await eventBus.publish({
      type: 'SalesOutcomeTracked',
      data: { enablerId, sellerId, outcome: engagementResult.outcome, saleValue: engagementResult.saleValue, sagaId: event.sagaId }
    });
  });
}

function initializeSellerSagaHandlers() {
  // Customer Relationship Saga Events
  eventBus.subscribe('CustomerInquiryReceived', async (event) => {
    const { customerId, inquiryType, message } = event.data;
    
    const category = categorizeInquiry(inquiryType);
    const priority = inquiryType === 'refund_request' ? 'high' : 'normal';
    
    await eventBus.publish({
      type: 'InquiryCategorized',
      data: { customerId, category, priority, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('InquiryCategorized', async (event) => {
    const { category } = event.data;
    
    const assignedAgent = 'agent_001';
    
    await eventBus.publish({
      type: 'InquiryAssigned',
      data: { assignedAgent, assignedAt: new Date(), sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('InquiryAssigned', async (event) => {
    const response = 'Thank you for your inquiry. We are reviewing your request.';
    
    await eventBus.publish({
      type: 'CustomerResponseSent',
      data: { response, sentAt: new Date(), sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('CustomerResponseSent', async (event) => {
    await eventBus.publish({
      type: 'InquiryResolved',
      data: { resolvedAt: new Date(), resolution: 'inquiry_resolved', sagaId: event.sagaId }
    });
  });

  // Review Management Saga Events
  eventBus.subscribe('ReviewReceived', async (event) => {
    const { reviewId, productId, customerId, rating, comment } = event.data;
    
    const sentiment = analyzeSentiment(comment);
    
    await prisma.review.create({
      data: {
        id: reviewId,
        productId,
        customerId,
        rating,
        content: comment,
        sentiment,
        status: 'published'
      }
    });
    
    await eventBus.publish({
      type: 'ReviewSentimentAnalyzed',
      data: { reviewId, sentiment, confidence: 0.85, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('ReviewSentimentAnalyzed', async (event) => {
    const { rating } = event.data;
    
    const response = rating >= 4 
      ? 'Thank you for your positive feedback! We appreciate your business.'
      : 'We apologize for not meeting your expectations. Please contact us to resolve any issues.';
    
    await eventBus.publish({
      type: 'ReviewResponseGenerated',
      data: { response, generatedAt: new Date(), sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('ReviewResponseGenerated', async (event) => {
    const { reviewId } = event.data;
    
    await eventBus.publish({
      type: 'ReviewPublished',
      data: { reviewId, publishedAt: new Date(), status: 'published', sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('ReviewPublished', async (event) => {
    const { productId, rating } = event.data;
    
    await eventBus.publish({
      type: 'ReviewAnalyticsUpdated',
      data: { productId, rating, updatedAt: new Date(), sagaId: event.sagaId }
    });
  });

  // Customer Support Ticket Saga Events
  eventBus.subscribe('SupportTicketCreated', async (event) => {
    const { ticketId, customerId, issue, priority } = event.data;
    
    await prisma.supportTicket.create({
      data: {
        id: ticketId,
        customerId,
        subject: issue,
        priority: priority || 'medium',
        status: 'open'
      }
    });
    
    await eventBus.publish({
      type: 'TicketAssigned',
      data: { ticketId, assignedAgent: priority === 'high' ? 'senior_agent_001' : 'agent_002', assignedAt: new Date(), sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('TicketAssigned', async (event) => {
    const { ticketId } = event.data;
    
    await eventBus.publish({
      type: 'TicketResolved',
      data: { ticketId, resolution: 'Issue resolved successfully', resolvedAt: new Date(), sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('TicketResolved', async (event) => {
    const { ticketId } = event.data;
    
    await eventBus.publish({
      type: 'CustomerFeedbackRequested',
      data: { ticketId, requestedAt: new Date(), sagaId: event.sagaId }
    });
  });

  // Seller Support Saga Events
  eventBus.subscribe('SellerSupportRequestCreated', async (event) => {
    const { sellerId, supportRequest } = event.data;
    
    const ticket = await prisma.supportTicket.create({
      data: {
        sellerId,
        subject: supportRequest.subject,
        description: supportRequest.description,
        priority: supportRequest.priority || 'medium',
        status: 'open',
        type: 'seller_support'
      }
    });
    
    await eventBus.publish({
      type: 'SupportRequestAssigned',
      data: { sellerId, supportRequestId: ticket.id, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('SupportRequestAssigned', async (event) => {
    const { sellerId, supportRequestId } = event.data;
    
    const assignedAgent = `seller-support-agent-${Math.floor(Math.random() * 3) + 1}`;
    
    await prisma.supportTicket.update({
      where: { id: supportRequestId },
      data: { assignedTo: assignedAgent }
    });
    
    await eventBus.publish({
      type: 'SellerSupportRequestResolved',
      data: { sellerId, supportRequestId, resolution: 'Support provided', sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('SellerSupportRequestResolved', async (event) => {
    const { sellerId, supportRequestId, resolution } = event.data;
    
    await prisma.supportTicket.update({
      where: { id: supportRequestId },
      data: { 
        status: 'resolved',
        resolution,
        resolvedAt: new Date()
      }
    });
    
    await eventBus.publish({
      type: 'SupportResolutionNotificationSent',
      data: { sellerId, supportRequestId, sagaId: event.sagaId }
    });
  });
}

// Review management endpoints
app.post('/api/reviews', async (req, res) => {
  try {
    const review = await prisma.review.create({
      data: req.body
    });
    res.json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reviews/:productId', async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { productId: req.params.productId },
      include: { responses: true }
    });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function initializeEventHandlers() {
  // Customer Relationship Saga Events
  eventBus.subscribe('CustomerInquiryReceived', async (event) => {
    const { sellerId, customerId, inquiry } = event.data;
    
    // Categorize inquiry
    const category = categorizeInquiry(inquiry.subject);
    
    await eventBus.publish({
      type: 'InquiryCategorized',
      data: { sellerId, customerId, inquiryId: inquiry.id, category, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('InquiryCategorized', async (event) => {
    const { sellerId, inquiryId, category } = event.data;
    
    // Assign to appropriate team member
    const assignedTo = await assignInquiry(category);
    
    await eventBus.publish({
      type: 'InquiryAssigned',
      data: { sellerId, inquiryId, assignedTo, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('InquiryAssigned', async (event) => {
    const { sellerId, inquiryId } = event.data;
    
    // Generate response
    const response = await generateResponse(inquiryId);
    
    await eventBus.publish({
      type: 'InquiryResolved',
      data: { sellerId, inquiryId, response, sagaId: event.sagaId }
    });
  });

  // Review Management Saga Events
  eventBus.subscribe('ReviewReceived', async (event) => {
    const { sellerId, productId, review } = event.data;
    
    // Analyze sentiment
    const sentiment = analyzeSentiment(review.content);
    
    await prisma.review.create({
      data: {
        productId,
        customerId: review.customerId,
        rating: review.rating,
        content: review.content,
        sentiment,
        status: 'published'
      }
    });
    
    await eventBus.publish({
      type: 'ReviewSentimentAnalyzed',
      data: { sellerId, productId, reviewId: review.id, sentiment, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('ReviewSentimentAnalyzed', async (event) => {
    const { sellerId, reviewId, sentiment } = event.data;
    
    // Generate appropriate response
    const responseTemplate = getResponseTemplate(sentiment);
    
    await eventBus.publish({
      type: 'ReviewResponseGenerated',
      data: { sellerId, reviewId, responseTemplate, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('ReviewResponseGenerated', async (event) => {
    const { sellerId, reviewId, responseTemplate } = event.data;
    
    // Publish response
    await prisma.reviewResponse.create({
      data: {
        reviewId,
        sellerId,
        content: responseTemplate,
        status: 'published'
      }
    });
    
    await eventBus.publish({
      type: 'ReviewResponsePublished',
      data: { sellerId, reviewId, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('ReviewResponsePublished', async (event) => {
    const { sellerId, reviewId } = event.data;
    
    // Update analytics
    await eventBus.publish({
      type: 'ReviewAnalyticsUpdated',
      data: { sellerId, reviewId, sagaId: event.sagaId }
    });
  });

  // Customer Support Ticket Saga Events
  eventBus.subscribe('SupportTicketCreated', async (event) => {
    const { sellerId, customerId, ticket } = event.data;
    
    const supportTicket = await prisma.supportTicket.create({
      data: {
        sellerId,
        customerId,
        subject: ticket.subject,
        description: ticket.description,
        priority: ticket.priority || 'medium',
        status: 'open'
      }
    });
    
    await eventBus.publish({
      type: 'SupportTicketCategorized',
      data: { sellerId, ticketId: supportTicket.id, category: ticket.category, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('SupportTicketCategorized', async (event) => {
    const { sellerId, ticketId, category } = event.data;
    
    // Assign to support agent
    const assignedAgent = await assignSupportTicket(category);
    
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { assignedTo: assignedAgent }
    });
    
    await eventBus.publish({
      type: 'SupportTicketAssigned',
      data: { sellerId, ticketId, assignedAgent, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('SupportTicketAssigned', async (event) => {
    const { sellerId, ticketId } = event.data;
    
    // Process ticket resolution
    await eventBus.publish({
      type: 'SupportTicketResolved',
      data: { sellerId, ticketId, resolution: 'Ticket resolved successfully', sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('SupportTicketResolved', async (event) => {
    const { sellerId, ticketId, resolution } = event.data;
    
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { 
        status: 'resolved',
        resolution,
        resolvedAt: new Date()
      }
    });
    
    await eventBus.publish({
      type: 'SupportTicketNotificationSent',
      data: { sellerId, ticketId, sagaId: event.sagaId }
    });
  });

  // Seller Support Saga Events
  eventBus.subscribe('SellerSupportRequestCreated', async (event) => {
    const { sellerId, supportRequest } = event.data;
    
    const ticket = await prisma.supportTicket.create({
      data: {
        sellerId,
        subject: supportRequest.subject,
        description: supportRequest.description,
        priority: supportRequest.priority || 'medium',
        status: 'open',
        type: 'seller_support'
      }
    });
    
    await eventBus.publish({
      type: 'SupportRequestAssigned',
      data: { sellerId, supportRequestId: ticket.id, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('SupportRequestAssigned', async (event) => {
    const { sellerId, supportRequestId } = event.data;
    
    // Assign to appropriate support team
    const assignedAgent = await assignSellerSupport();
    
    await prisma.supportTicket.update({
      where: { id: supportRequestId },
      data: { assignedTo: assignedAgent }
    });
    
    await eventBus.publish({
      type: 'SellerSupportRequestResolved',
      data: { sellerId, supportRequestId, resolution: 'Support provided', sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('SellerSupportRequestResolved', async (event) => {
    const { sellerId, supportRequestId, resolution } = event.data;
    
    await prisma.supportTicket.update({
      where: { id: supportRequestId },
      data: { 
        status: 'resolved',
        resolution,
        resolvedAt: new Date()
      }
    });
    
    await eventBus.publish({
      type: 'SupportResolutionNotificationSent',
      data: { sellerId, supportRequestId, sagaId: event.sagaId }
    });
  });
}

// Helper functions
function categorizeInquiry(subject: string): string {
  if (subject.toLowerCase().includes('order')) return 'order_inquiry';
  if (subject.toLowerCase().includes('product')) return 'product_inquiry';
  if (subject.toLowerCase().includes('shipping')) return 'shipping_inquiry';
  return 'general_inquiry';
}

async function assignInquiry(category: string): Promise<string> {
  // Simple assignment logic
  const agents = {
    'order_inquiry': 'order-specialist',
    'product_inquiry': 'product-specialist',
    'shipping_inquiry': 'shipping-specialist',
    'general_inquiry': 'general-support'
  };
  return agents[category] || 'general-support';
}

async function generateResponse(inquiryId: string): Promise<string> {
  return `Thank you for your inquiry. We have reviewed your request and will provide a detailed response shortly.`;
}

function analyzeSentiment(content: string): 'positive' | 'negative' | 'neutral' {
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love'];
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst'];
  
  const lowerContent = content.toLowerCase();
  const positiveCount = positiveWords.filter(word => lowerContent.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerContent.includes(word)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

function getResponseTemplate(sentiment: 'positive' | 'negative' | 'neutral'): string {
  const templates = {
    'positive': 'Thank you for your positive feedback! We appreciate your business.',
    'negative': 'We apologize for any inconvenience. We will work to improve your experience.',
    'neutral': 'Thank you for your feedback. We value your input.'
  };
  return templates[sentiment];
}

async function assignSupportTicket(category: string): Promise<string> {
  return `support-agent-${Math.floor(Math.random() * 5) + 1}`;
}

async function assignSellerSupport(): Promise<string> {
  return `seller-support-agent-${Math.floor(Math.random() * 3) + 1}`;
}

const PORT = process.env.PORT || 3009;
app.listen(PORT, () => {
  console.log(`Trust Service running on port ${PORT}`);
  console.log('Seller saga event handlers initialized');
});

export default app;