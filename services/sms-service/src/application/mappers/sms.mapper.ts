import { SmsMessage, SmsStatus } from '../../domain/entities/sms-message.entity';
import { PhoneNumber } from '../../domain/value-objects/phone-number.value-object';
import { MessageContent } from '../../domain/value-objects/message-content.value-object';
import { SendSmsDto, SmsResponseDto, SmsStatusDto } from '../dto/sms.dto';

/**
 * SMS Mapper
 * Maps between domain entities and DTOs
 */
export class SmsMapper {
    /**
     * Convert DTO to domain entity
     */
    static toEntity(dto: SendSmsDto, id: string): SmsMessage {
        return SmsMessage.create({
            id,
            phoneNumber: dto.phoneNumber,
            content: dto.message,
            userId: dto.userId,
            scheduledAt: dto.scheduledAt,
            metadata: dto.metadata
        });
    }

    /**
     * Convert domain entity to full response DTO
     */
    static toResponseDto(entity: SmsMessage): SmsResponseDto {
        return {
            id: entity.getId(),
            phoneNumber: entity.getPhoneNumber().getValue(),
            message: entity.getContent().getValue(),
            status: entity.getStatus(),
            userId: entity.getUserId(),
            providerId: entity.getProviderId(),
            providerMessageId: entity.getProviderMessageId(),
            retryCount: entity.getRetryCount(),
            maxRetries: entity.getMaxRetries(),
            segmentCount: entity.getContent().getSegmentCount(),
            encoding: entity.getContent().getEncoding(),
            scheduledAt: entity.getScheduledAt()?.toISOString(),
            sentAt: entity.getSentAt()?.toISOString(),
            deliveredAt: entity.getDeliveredAt()?.toISOString(),
            failedAt: entity.getFailedAt()?.toISOString(),
            lastError: entity.getLastError(),
            metadata: entity.getMetadata(),
            createdAt: entity.getCreatedAt().toISOString(),
            updatedAt: entity.getUpdatedAt().toISOString()
        };
    }

    /**
     * Convert domain entity to status DTO
     */
    static toStatusDto(entity: SmsMessage): SmsStatusDto {
        return {
            messageId: entity.getId(),
            status: entity.getStatus(),
            phoneNumber: entity.getPhoneNumber().getValue(),
            sentAt: entity.getSentAt()?.toISOString(),
            deliveredAt: entity.getDeliveredAt()?.toISOString(),
            failedAt: entity.getFailedAt()?.toISOString(),
            lastError: entity.getLastError(),
            retryCount: entity.getRetryCount(),
            canRetry: entity.canRetry()
        };
    }

    /**
     * Convert multiple entities to response DTOs
     */
    static toResponseDtoList(entities: SmsMessage[]): SmsResponseDto[] {
        return entities.map(entity => this.toResponseDto(entity));
    }

    /**
     * Convert multiple entities to status DTOs
     */
    static toStatusDtoList(entities: SmsMessage[]): SmsStatusDto[] {
        return entities.map(entity => this.toStatusDto(entity));
    }

    /**
     * Extract domain event payload for publishing
     */
    static toDomainEventPayload(entity: SmsMessage): Record<string, any> {
        return {
            messageId: entity.getId(),
            phoneNumber: entity.getPhoneNumber().getValue(),
            status: entity.getStatus(),
            userId: entity.getUserId(),
            providerId: entity.getProviderId(),
            providerMessageId: entity.getProviderMessageId(),
            retryCount: entity.getRetryCount(),
            timestamp: new Date().toISOString()
        };
    }
}
