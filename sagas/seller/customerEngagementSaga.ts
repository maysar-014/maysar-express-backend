import { Saga, SagaStep, SagaContext } from '../../shared/sagaFramework';
import { eventBus } from '../../shared/events/eventBus';

// Customer Relationship Saga
export class CustomerRelationshipSaga extends Saga {
  constructor() {
    super('CustomerRelationship');
  }

  async execute(context: SagaContext<{ customerId: string; inquiryType: string; message: string }>): Promise<void> {
    await this.addStep(new CustomerInquiryStep());
    await this.addStep(new CategorizationStep());
    await this.addStep(new AssignmentStep());
    await this.addStep(new ResponseStep());
    await this.addStep(new ResolutionStep());
  }
}

class CustomerInquiryStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { customerId, inquiryType, message } = context.data;
    
    await eventBus.publish('CustomerInquiryReceived.v1', {
      customerId,
      inquiryType,
      message,
      receivedAt: new Date(),
      sagaId: context.sagaId
    });
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('CustomerInquiryCancelled.v1', {
      customerId: context.data.customerId,
      sagaId: context.sagaId
    });
  }
}

class CategorizationStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { inquiryType } = context.data;
    
    const category = this.categorizeInquiry(inquiryType);
    const priority = this.determinePriority(inquiryType);
    
    await eventBus.publish('InquiryCategorized.v1', {
      category,
      priority,
      sagaId: context.sagaId
    });
  }

  private categorizeInquiry(inquiryType: string): string {
    const categories: Record<string, string> = {
      'product_question': 'product_support',
      'order_issue': 'order_support',
      'shipping_inquiry': 'logistics_support',
      'refund_request': 'financial_support'
    };
    return categories[inquiryType] || 'general_support';
  }

  private determinePriority(inquiryType: string): string {
    const highPriority = ['refund_request', 'order_issue'];
    return highPriority.includes(inquiryType) ? 'high' : 'normal';
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('CategorizationCancelled.v1', {
      sagaId: context.sagaId
    });
  }
}

class AssignmentStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const assignedAgent = 'agent_001';
    
    await eventBus.publish('InquiryAssigned.v1', {
      assignedAgent,
      assignedAt: new Date(),
      sagaId: context.sagaId
    });
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('AssignmentCancelled.v1', {
      sagaId: context.sagaId
    });
  }
}

class ResponseStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const response = 'Thank you for your inquiry. We are reviewing your request.';
    
    await eventBus.publish('CustomerResponseSent.v1', {
      response,
      sentAt: new Date(),
      sagaId: context.sagaId
    });
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('ResponseCancelled.v1', {
      sagaId: context.sagaId
    });
  }
}

class ResolutionStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('InquiryResolved.v1', {
      resolvedAt: new Date(),
      resolution: 'inquiry_resolved',
      sagaId: context.sagaId
    });
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('ResolutionCancelled.v1', {
      sagaId: context.sagaId
    });
  }
}

// Review Management Saga
export class ReviewManagementSaga extends Saga {
  constructor() {
    super('ReviewManagement');
  }

  async execute(context: SagaContext<{ reviewId: string; productId: string; customerId: string; rating: number; comment: string }>): Promise<void> {
    await this.addStep(new ReviewReceivedStep());
    await this.addStep(new SentimentAnalysisStep());
    await this.addStep(new ResponseGenerationStep());
    await this.addStep(new ReviewPublicationStep());
    await this.addStep(new AnalyticsUpdateStep());
  }
}

class ReviewReceivedStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { reviewId, productId, customerId, rating, comment } = context.data;
    
    await eventBus.publish('ReviewReceived.v1', {
      reviewId,
      productId,
      customerId,
      rating,
      comment,
      receivedAt: new Date(),
      sagaId: context.sagaId
    });
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('ReviewRejected.v1', {
      reviewId: context.data.reviewId,
      sagaId: context.sagaId
    });
  }
}

class SentimentAnalysisStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { comment, rating } = context.data;
    
    const sentiment = this.analyzeSentiment(comment, rating);
    
    await eventBus.publish('ReviewSentimentAnalyzed.v1', {
      sentiment,
      confidence: 0.85,
      sagaId: context.sagaId
    });
  }

  private analyzeSentiment(comment: string, rating: number): string {
    if (rating >= 4) return 'positive';
    if (rating <= 2) return 'negative';
    return 'neutral';
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('SentimentAnalysisCancelled.v1', {
      sagaId: context.sagaId
    });
  }
}

class ResponseGenerationStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { rating } = context.data;
    
    const response = this.generateResponse(rating);
    
    await eventBus.publish('ReviewResponseGenerated.v1', {
      response,
      generatedAt: new Date(),
      sagaId: context.sagaId
    });
  }

  private generateResponse(rating: number): string {
    if (rating >= 4) {
      return 'Thank you for your positive feedback! We appreciate your business.';
    } else if (rating <= 2) {
      return 'We apologize for not meeting your expectations. Please contact us to resolve any issues.';
    }
    return 'Thank you for your feedback. We value your opinion and will use it to improve.';
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('ResponseGenerationCancelled.v1', {
      sagaId: context.sagaId
    });
  }
}

class ReviewPublicationStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { reviewId } = context.data;
    
    await eventBus.publish('ReviewPublished.v1', {
      reviewId,
      publishedAt: new Date(),
      status: 'published',
      sagaId: context.sagaId
    });
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('ReviewUnpublished.v1', {
      reviewId: context.data.reviewId,
      sagaId: context.sagaId
    });
  }
}

class AnalyticsUpdateStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { productId, rating } = context.data;
    
    await eventBus.publish('ReviewAnalyticsUpdated.v1', {
      productId,
      rating,
      updatedAt: new Date(),
      sagaId: context.sagaId
    });
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('AnalyticsUpdateReverted.v1', {
      productId: context.data.productId,
      sagaId: context.sagaId
    });
  }
}

// Customer Support Ticket Saga
export class CustomerSupportTicketSaga extends Saga {
  constructor() {
    super('CustomerSupportTicket');
  }

  async execute(context: SagaContext<{ ticketId: string; customerId: string; issue: string; priority: string }>): Promise<void> {
    await this.addStep(new TicketCreationStep());
    await this.addStep(new AgentAssignmentStep());
    await this.addStep(new IssueResolutionStep());
    await this.addStep(new CustomerFeedbackStep());
  }
}

class TicketCreationStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { ticketId, customerId, issue, priority } = context.data;
    
    await eventBus.publish('SupportTicketCreated.v1', {
      ticketId,
      customerId,
      issue,
      priority,
      status: 'open',
      createdAt: new Date(),
      sagaId: context.sagaId
    });
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('SupportTicketCancelled.v1', {
      ticketId: context.data.ticketId,
      sagaId: context.sagaId
    });
  }
}

class AgentAssignmentStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { ticketId, priority } = context.data;
    
    const assignedAgent = priority === 'high' ? 'senior_agent_001' : 'agent_002';
    
    await eventBus.publish('TicketAssigned.v1', {
      ticketId,
      assignedAgent,
      assignedAt: new Date(),
      sagaId: context.sagaId
    });
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('TicketAssignmentCancelled.v1', {
      ticketId: context.data.ticketId,
      sagaId: context.sagaId
    });
  }
}

class IssueResolutionStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { ticketId } = context.data;
    
    await eventBus.publish('TicketResolved.v1', {
      ticketId,
      resolution: 'Issue resolved successfully',
      resolvedAt: new Date(),
      sagaId: context.sagaId
    });
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('TicketResolutionCancelled.v1', {
      ticketId: context.data.ticketId,
      sagaId: context.sagaId
    });
  }
}

class CustomerFeedbackStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { ticketId } = context.data;
    
    await eventBus.publish('CustomerFeedbackRequested.v1', {
      ticketId,
      requestedAt: new Date(),
      sagaId: context.sagaId
    });
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('FeedbackRequestCancelled.v1', {
      ticketId: context.data.ticketId,
      sagaId: context.sagaId
    });
  }
}