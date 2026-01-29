import { UserRegisteredEvent } from '../../domain/events';
import { logger } from '../../infrastructure/services/logger.service';
import { BaseSaga, SagaStep, SagaError } from './saga-base';
import { v4 as uuidv4 } from 'uuid';

export interface UserRegistrationContext {
  event: UserRegisteredEvent;
  emailSent: boolean;
  notificationSent: boolean;
  metadata: {
    correlationId: string;
    userId: string;
    timestamp: Date;
  };
}

const DEFAULT_RETRY_OPTIONS = {
  maxRetries: 3,
  retryDelayMs: 1000,
  timeoutMs: 30000
};

export class UserRegistrationSaga extends BaseSaga<UserRegistrationContext> {
  constructor(event: UserRegisteredEvent) {
    const correlationId = event.metadata?.correlationId || uuidv4();
    const context: UserRegistrationContext = {
      event,
      emailSent: false,
      notificationSent: false,
      metadata: {
        correlationId,
        userId: event.aggregateId,
        timestamp: new Date()
      }
    };
    
    super(`user-registration-${correlationId}`, context);
    this.initializeSteps();
  }

  private initializeSteps(): void {
    this.addStep(this.createWelcomeEmailStep());
    this.addStep(this.createNotificationStep());
  }

  private createWelcomeEmailStep(): SagaStep<UserRegistrationContext> {
    return {
      name: 'SendWelcomeEmail',
      execute: async (context) => {
        const { userId } = context.metadata;
        logger.info('Sending welcome email', { userId, correlationId: context.metadata.correlationId });
        
        // Simulate email sending with retry logic
        await this.withRetry(
          async () => {
            // TODO: Implement actual email sending
            context.emailSent = true;
            logger.info('Welcome email sent successfully', { userId });
          },
          {
            ...DEFAULT_RETRY_OPTIONS,
            operation: 'send_welcome_email',
            context: { userId }
          }
        );
      },
      compensate: async (context) => {
        if (!context.emailSent) return;
        
        const { userId } = context.metadata;
        logger.info('Compensating: Sending welcome email cancellation', { userId });
        
        await this.withRetry(
          async () => {
            // TODO: Implement actual compensation (e.g., send cancellation email)
            context.emailSent = false;
            logger.info('Welcome email compensation completed', { userId });
          },
          {
            ...DEFAULT_RETRY_OPTIONS,
            operation: 'compensate_welcome_email',
            context: { userId }
          }
        );
      },
      options: {
        maxRetries: 3,
        retryDelayMs: 1000,
        timeoutMs: 15000
      }
    };
  }

  private createNotificationStep(): SagaStep<UserRegistrationContext> {
    return {
      name: 'SendNotification',
      execute: async (context) => {
        const { userId } = context.metadata;
        logger.info('Sending registration notification', { userId });
        
        await this.withRetry(
          async () => {
            // TODO: Implement actual notification sending
            context.notificationSent = true;
            logger.info('Registration notification sent successfully', { userId });
          },
          {
            ...DEFAULT_RETRY_OPTIONS,
            operation: 'send_notification',
            context: { userId }
          }
        );
      },
      compensate: async (context) => {
        if (!context.notificationSent) return;
        
        const { userId } = context.metadata;
        logger.info('Compensating: Reverting notification', { userId });
        
        await this.withRetry(
          async () => {
            // TODO: Implement actual notification rollback
            context.notificationSent = false;
            logger.info('Notification compensation completed', { userId });
          },
          {
            ...DEFAULT_RETRY_OPTIONS,
            operation: 'compensate_notification',
            context: { userId }
          }
        );
      },
      options: {
        maxRetries: 2,
        retryDelayMs: 500,
        timeoutMs: 10000
      }
    };
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries: number;
      retryDelayMs: number;
      operation: string;
      context: Record<string, any>;
    }
  ): Promise<T> {
    const { maxRetries, retryDelayMs, operation: opName, context } = options;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const isLastAttempt = attempt === maxRetries;
        
        logger.warn(`Attempt ${attempt}/${maxRetries} failed for ${opName}`, {
          error: lastError.message,
          stack: lastError.stack,
          attempt,
          maxRetries,
          ...context
        });

        if (isLastAttempt) break;
        
        const delay = retryDelayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new SagaError(
      `Operation '${opName}' failed after ${maxRetries} attempts`,
      { ...context, lastError: lastError?.message }
    );
  }
}

export async function executeUserRegistrationSaga(event: UserRegisteredEvent): Promise<void> {
  const saga = new UserRegistrationSaga(event);
  
  try {
    await saga.execute();
    logger.info('User registration saga completed successfully', {
      userId: event.aggregateId,
      correlationId: event.metadata?.correlationId
    });
  } catch (error) {
    logger.error('User registration saga failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId: event.aggregateId,
      correlationId: event.metadata?.correlationId
    });
    throw error;
  }
}
