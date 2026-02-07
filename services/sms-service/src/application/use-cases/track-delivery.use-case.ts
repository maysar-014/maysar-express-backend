import { ISmsRepository } from '../../domain/repositories/sms.repository';
import { SmsStatusDto } from '../dto/sms.dto';
import { SmsMapper } from '../mappers/sms.mapper';
import { MessageNotFoundError } from '../../domain/errors/sms.errors';

/**
 * Track Delivery Use Case
 * Retrieves the current status and delivery information of an SMS message
 */
export class TrackDeliveryUseCase {
    constructor(private readonly repository: ISmsRepository) { }

    async execute(messageId: string): Promise<SmsStatusDto> {
        // 1. Find message by ID
        const message = await this.repository.findById(messageId);

        if (!message) {
            throw new MessageNotFoundError(messageId);
        }

        // 2. Convert to status DTO
        return SmsMapper.toStatusDto(message);
    }

    /**
     * Track multiple messages by IDs
     */
    async executeMany(messageIds: string[]): Promise<SmsStatusDto[]> {
        const statuses: SmsStatusDto[] = [];

        for (const messageId of messageIds) {
            try {
                const status = await this.execute(messageId);
                statuses.push(status);
            } catch (error) {
                // Continue with other messages even if one fails
                if (error instanceof MessageNotFoundError) {
                    statuses.push({
                        messageId,
                        status: 'NOT_FOUND',
                        phoneNumber: '',
                        retryCount: 0,
                        canRetry: false
                    });
                } else {
                    throw error;
                }
            }
        }

        return statuses;
    }

    /**
     * Track messages by phone number
     */
    async executeByPhoneNumber(
        phoneNumber: string,
        limit: number = 10
    ): Promise<SmsStatusDto[]> {
        const messages = await this.repository.findByPhoneNumber(phoneNumber, limit);
        return SmsMapper.toStatusDtoList(messages);
    }

    /**
     * Track messages by user ID
     */
    async executeByUserId(userId: string, limit: number = 10): Promise<SmsStatusDto[]> {
        const messages = await this.repository.findByUserId(userId, limit);
        return SmsMapper.toStatusDtoList(messages);
    }
}
