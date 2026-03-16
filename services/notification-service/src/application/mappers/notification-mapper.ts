import { Notification } from '../../domain/entities/notification.entity';
import { NotificationTemplate } from '../../domain/entities/notification-template.entity';
import { NotificationPreference } from '../../domain/entities/notification-preference.entity';
import { NotificationContent } from '../../domain/value-objects/notification-content.value-object';
import { DeliveryAddress } from '../../domain/value-objects/delivery-address.value-object';
import { NotificationMetadata } from '../../domain/value-objects/notification-metadata.value-object';
import {
  CreateNotificationDto,
  NotificationResponseDto,
  NotificationSummaryDto,
  UpdatePreferenceDto
} from '../dto/notification.dto';
import { CreateTemplateDto, TemplateResponseDto } from '../dto/template.dto';
import { PreferenceResponseDto } from '../dto/preference.dto';
import { getModelPrefix, makeId } from '@shared/ids/id';

export class NotificationMapper {
  static toEntity(dto: CreateNotificationDto): Notification {
    const content = NotificationContent.create(dto.content, dto.contentHtml);
    const metadata = NotificationMetadata.create(dto.metadata ?? {});
    const deliveryAddress = dto.deliveryAddress && dto.deliveryAddressType
      ? DeliveryAddress.create(dto.deliveryAddress, dto.deliveryAddressType)
      : undefined;
    return Notification.create({
      id: makeId(getModelPrefix('Notification')),
      userId: dto.userId,
      type: dto.type,
      channel: dto.channel,
      subject: dto.subject,
      content,
      metadata,
      priority: dto.priority,
      scheduledAt: dto.scheduledAt,
      deliveryAddress,
      maxRetries: 3
    });
  }

  static toResponseDto(entity: Notification): NotificationResponseDto {
    return {
      id: entity.id,
      userId: entity.userId,
      type: entity.type,
      channel: entity.channel,
      status: entity.status,
      priority: entity.priority,
      subject: entity.subject,
      content: entity.content.getValue(),
      metadata: entity.metadata.toObject(),
      scheduledAt: entity.scheduledAt,
      sentAt: entity.sentAt,
      deliveredAt: entity.deliveredAt,
      readAt: entity.readAt,
      retryCount: entity.retryCount,
      maxRetries: entity.maxRetries,
      lastError: entity.lastError,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }

  static toSummaryDto(entity: Notification): NotificationSummaryDto {
    return {
      id: entity.id,
      userId: entity.userId,
      type: entity.type,
      channel: entity.channel,
      status: entity.status,
      subject: entity.subject,
      sentAt: entity.sentAt,
      createdAt: entity.createdAt
    };
  }

  static toPersistence(entity: Notification): Record<string, any> {
    return {
      id: entity.id,
      userId: entity.userId,
      type: entity.type,
      channel: entity.channel,
      status: entity.status,
      priority: entity.priority,
      subject: entity.subject,
      content: entity.content.getValue(),
      contentHtml: entity.content.getHtml(),
      metadata: entity.metadata.toObject(),
      scheduledAt: entity.scheduledAt,
      sentAt: entity.sentAt,
      deliveredAt: entity.deliveredAt,
      readAt: entity.readAt,
      retryCount: entity.retryCount,
      maxRetries: entity.maxRetries,
      lastError: entity.lastError,
      deliveryAddress: entity.deliveryAddress?.getValue(),
      deliveryAddressType: entity.deliveryAddress?.getType(),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }

  static templateToEntity(dto: CreateTemplateDto): NotificationTemplate {
    return NotificationTemplate.create({
      id: makeId(getModelPrefix('NotificationTemplate')),
      name: dto.name,
      type: dto.type,
      channel: dto.channel,
      subject: dto.subject,
      bodyTemplate: dto.bodyTemplate,
      variables: dto.variables,
      createdBy: dto.createdBy
    });
  }

  static templateToResponseDto(entity: NotificationTemplate): TemplateResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      type: entity.type,
      channel: entity.channel,
      subject: entity.subject,
      bodyTemplate: entity.bodyTemplate,
      variables: entity.variables,
      isActive: entity.isActive,
      version: entity.version,
      createdBy: entity.createdBy,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }

  static preferenceToResponseDto(entity: NotificationPreference): PreferenceResponseDto {
    return {
      id: entity.id,
      userId: entity.userId,
      channel: entity.channel,
      enabled: entity.enabled,
      categories: entity.categories,
      quietHours: entity.quietHours,
      frequency: entity.frequency,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }

  static preferenceUpdateFromDto(
    entity: NotificationPreference,
    dto: UpdatePreferenceDto
  ): NotificationPreference {
    return entity.updatePreference({
      enabled: dto.enabled,
      categories: (dto as any).categories,
      quietHours: dto.quietHours,
      frequency: (dto as any).frequency
    });
  }

}
