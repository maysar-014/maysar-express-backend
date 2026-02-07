import { ISmsRepository } from '../../domain/repositories/sms.repository';
import { RetryPolicy } from '../../domain/policies/retry.policy';
import { ISmsProvider, IEventPublisher } from './send-sms.use-case';
import { RetryResultDto, RetryFailedMessagesResponseDto } from '../dto/sms.dto';
import { SmsMessage } from '../../domain/entities/sms-message.entity';
import { ProviderResponse } from '../../domain/value-objects/provider-response.value-object';

/**
 * Retry Failed Messages Use Case
 * Handles retrying of failed SMS messages based on retry policy
 */
export class RetryFailedMessagesUseCase {
    constructor(
        private readonly repository: ISmsRepository,
        private readonly provider: ISmsProvider,
        private readonly retryPolicy: RetryPolicy,
        private readonly eventPublisher: IEventPublisher
    ) { }

    async execute(options?: {
        maxRetries?: number;
        limit?: number;
    }): Promise<RetryFailedMessagesResponseDto> {
        const maxRetries = options?.maxRetries ?? this.retryPolicy.getMaxRetries();
        const limit = options?.limit ?? 100;

        // 1. Find failed messages eligible for retry
        const failedMessages = await this.repository.findFailedMessagesForRetry(maxRetries);

        // 2. Filter by retry policy and limit
        const eligibleMessages = failedMessages
            .filter(message => this.retryPolicy.canRetry(message))
            .filter(message => this.retryPolicy.isRetryDue(message))
            .slice(0, limit);

        const results: RetryResultDto[] = [];
        let totalRetried = 0;
        let totalFailed = 0;

        // 3. Retry each message
        for (const message of eligibleMessages) {
            const result = await this.retryMessage(message);
            results.push(result);

            if (result.success) {
                totalRetried++;
            } else {
                totalFailed++;
            }
        }

        return {
            totalProcessed: eligibleMessages.length,
            totalRetried,
            totalFailed,
            results
        };
    }

    /**
     * Retry a single message by ID
     */
    async executeById(messageId: string): Promise<RetryResultDto> {
        const message = await this.repository.findById(messageId);

        if (!message) {
            return {
                messageId,
                success: false,
                newStatus: 'NOT_FOUND',
                retryCount: 0,
                message: 'Message not found'
            };
        }

        if (!this.retryPolicy.canRetry(message)) {
            return {
                messageId,
                success: false,
                newStatus: message.getStatus(),
                retryCount: message.getRetryCount(),
                message: 'Message is not eligible for retry'
            };
        }

        return await this.retryMessage(message);
    }

    private async retryMessage(message: SmsMessage): Promise<RetryResultDto> {
        try {
            // 1. Increment retry count and reset status
            message.incrementRetryCount();
            await this.repository.update(message);

            // 2. Mark as sending
            message.markAsSending(this.provider.getName());
            await this.repository.update(message);

            // 3. Attempt to send via provider
            const response = await this.provider.send(
                message.getPhoneNumber().getValue(),
                message.getContent().getValue()
            );

            if (response.isSuccess()) {
                // Success - mark as sent
                message.markAsSent(response);
                await this.repository.update(message);
                await this.publishDomainEvents(message);

                return {
                    messageId: message.getId(),
                    success: true,
                    newStatus: message.getStatus(),
                    retryCount: message.getRetryCount(),
                    message: 'Message sent successfully'
                };
            } else {
                // Provider rejected
                message.markAsFailed(
                    response.getErrorMessage() || 'Provider rejected message'
                );
                await this.repository.update(message);
                await this.publishDomainEvents(message);

                return {
                    messageId: message.getId(),
                    success: false,
                    newStatus: message.getStatus(),
                    retryCount: message.getRetryCount(),
                    message: response.getErrorMessage() || 'Retry failed'
                };
            }
        } catch (error) {
            // Handle errors
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            try {
                message.markAsFailed(errorMessage);
                await this.repository.update(message);
                await this.publishDomainEvents(message);
            } catch (updateError) {
                console.error('Failed to update message status:', updateError);
            }

            return {
                messageId: message.getId(),
                success: false,
                newStatus: 'FAILED',
                retryCount: message.getRetryCount(),
                message: errorMessage
            };
        }
    }

    private async publishDomainEvents(message: SmsMessage): Promise<void> {
        const events = message.getDomainEvents();

        for (const event of events) {
            await this.eventPublisher.publish(event.eventType, event.payload);
        }

        message.clearDomainEvents();
    }
}
