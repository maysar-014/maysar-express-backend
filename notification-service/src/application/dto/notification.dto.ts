/**
 * Notification DTOs
 */

export type NotificationTypeDto = 'email' | 'sms' | 'push' | 'in-app';
export type NotificationStatusDto = 'pending' | 'sent' | 'failed' | 'delivered' | 'read';
export type NotificationPriorityDto = 'low' | 'medium' | 'high' | 'urgent';

export interface CreateNotificationDto {
  userId: string;
  type: NotificationTypeDto;
  channel: NotificationTypeDto;
  subject: string;
  content: string;
  contentHtml?: string;
  priority?: NotificationPriorityDto;
  scheduledAt?: Date;
  metadata?: Record<string, string | number | boolean>;
  deliveryAddress?: string;
  deliveryAddressType?: 'email' | 'phone' | 'device_token';
  templateId?: string;
  templateVariables?: Record<string, string>;
}

export interface UpdateNotificationDto {
  status?: NotificationStatusDto;
  subject?: string;
  content?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface NotificationResponseDto {
  id: string;
  userId: string;
  type: NotificationTypeDto;
  channel: NotificationTypeDto;
  status: NotificationStatusDto;
  priority: NotificationPriorityDto;
  subject: string;
  content: string;
  metadata: Record<string, string | number | boolean>;
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationSummaryDto {
  id: string;
  userId: string;
  type: NotificationTypeDto;
  channel: NotificationTypeDto;
  status: NotificationStatusDto;
  subject: string;
  sentAt?: Date;
  createdAt: Date;
}

export interface BulkNotificationDto {
  notifications: CreateNotificationDto[];
}

export interface NotificationSearchDto {
  userId?: string;
  status?: NotificationStatusDto;
  channel?: NotificationTypeDto;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface NotificationListResponseDto {
  items: NotificationResponseDto[] | NotificationSummaryDto[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
