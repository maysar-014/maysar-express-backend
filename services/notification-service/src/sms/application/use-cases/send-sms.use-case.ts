import { SmsMessage } from '../../domain/entities/sms-message.entity';
import { ISmsRepository } from '../../domain/repositories/sms.repository';
import { RateLimitPolicy } from '../../domain/policies/rate-limit.policy';
import { ProviderResponse } from '../../domain/value-objects/provider-response.value-object';
import { SendSmsDto, SendSmsResponseDto } from '../dto/sms.dto';
import { SmsMapper } from '../mappers/sms.mapper';
import { RateLimitExceededError } from '../../domain/errors/sms.errors';
import { v4 as uuidv4 } from 'uuid';

/**
 * SMS Provider Interface (for use case)
 * This will be implemented in the infrastructure layer
 */
export interface ISmsProvider {
    send(phoneNumber: string, message: string): Promise<ProviderResponse>;
    getName(): string;
}

/**
 * Event Publisher Interface
 */
export interface IEventPublisher {
    publish(eventType: string, payload: any): Promise<void>;
}

/**
 * Send SMS Use Case
 * Orchestrates the process of sending an SMS message
 */
export class SendSmsUseCase {
    constructor(
        private readonly repository: ISmsRepository,
        private readonly provider: ISmsProvider,
        private readonly rateLimitPolicy: RateLimitPolicy,
        private readonly eventPublisher: IEventPublisher
    ) { }

    async execute(dto: SendSmsDto): Promise<SendSmsResponseDto> {
        // 1. Validate input
        this.validateInput(dto);

        // 2. Check rate limits
        await this.checkRateLimits(dto);

        // 3. Create domain entity
        const messageId = uuidv4();
        const message = SmsMapper.toEntity(dto, messageId);

        // 4. Persist message in QUEUED state
        const savedMessage = await this.repository.create(message);

        // 5. Publish domain events (SmsQueued)
        await this.publishDomainEvents(savedMessage);

        // 6. Attempt to send via provider
        try {
            savedMessage.markAsSending(this.provider.getName());
            await this.repository.update(savedMessage);

            const response = await this.provider.send(
                dto.phoneNumber,
                dto.message
            );

            if (response.isSuccess()) {
                savedMessage.markAsSent(response);
                await this.repository.update(savedMessage);
                await this.publishDomainEvents(savedMessage);

                return {
                    success: true,
                    messageId: savedMessage.getId(),
                    status: savedMessage.getStatus(),
                    segmentCount: savedMessage.getContent().getSegmentCount(),
                    message: 'SMS sent successfully'
                };
            } else {
                // Provider rejected
                savedMessage.markAsFailed(
                    response.getErrorMessage() || 'Provider rejected message'
                );
                await this.repository.update(savedMessage);
                await this.publishDomainEvents(savedMessage);

                return {
                    success: false,
                    messageId: savedMessage.getId(),
                    status: savedMessage.getStatus(),
                    segmentCount: savedMessage.getContent().getSegmentCount(),
                    message: response.getErrorMessage() || 'Failed to send SMS'
                };
            }
        } catch (error) {
            // Handle provider errors
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            try {
                savedMessage.markAsFailed(errorMessage);
                await this.repository.update(savedMessage);
                await this.publishDomainEvents(savedMessage);
            } catch (updateError) {
                // Log update error but don't throw
                console.error('Failed to update message status:', updateError);
            }

            return {
                success: false,
                messageId: savedMessage.getId(),
                status: 'FAILED',
                segmentCount: savedMessage.getContent().getSegmentCount(),
                message: errorMessage
            };
        }
    }

    private validateInput(dto: SendSmsDto): void {
        if (!dto.phoneNumber || !dto.phoneNumber.trim()) {
            throw new Error('Phone number is required');
        }

        if (!dto.message || !dto.message.trim()) {
            throw new Error('Message content is required');
        }

        // Additional validation will be done by value objects
    }

    private async checkRateLimits(dto: SendSmsDto): Promise<void> {
        const windows = this.rateLimitPolicy.getTimeWindows();

        // Check global rate limits
        const globalCount = await this.repository.getMessageCountInWindow(
            windows.minute.windowStart,
            windows.minute.windowEnd
        );

        const globalLimitCheck = this.rateLimitPolicy.isRateLimitExceeded(
            globalCount,
            windows.minute.windowStart,
            windows.minute.windowEnd
        );

        if (globalLimitCheck.exceeded) {
            throw new RateLimitExceededError(
                this.rateLimitPolicy.getConfig().maxMessagesPerMinute,
                60000,
                globalLimitCheck.retryAfter
            );
        }

        // Check per-user rate limits
        if (dto.userId) {
            const userCount = await this.repository.getMessageCountInWindow(
                windows.hour.windowStart,
                windows.hour.windowEnd,
                { userId: dto.userId }
            );

            const userLimitCheck = this.rateLimitPolicy.isUserRateLimitExceeded(userCount);
            if (userLimitCheck.exceeded) {
                throw new RateLimitExceededError(
                    this.rateLimitPolicy.getConfig().perUserLimitPerHour || 0,
                    3600000
                );
            }
        }

        // Check per-phone-number rate limits
        const phoneNumberCount = await this.repository.getMessageCountInWindow(
            windows.day.windowStart,
            windows.day.windowEnd,
            { phoneNumber: dto.phoneNumber }
        );

        const phoneNumberLimitCheck = this.rateLimitPolicy.isPhoneNumberRateLimitExceeded(
            phoneNumberCount
        );

        if (phoneNumberLimitCheck.exceeded) {
            throw new RateLimitExceededError(
                this.rateLimitPolicy.getConfig().perPhoneNumberLimitPerDay || 0,
                86400000
            );
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
