import { Entity } from '../interfaces';
import { NotificationContent } from '../value-objects/notification-content.value-object';
import { DeliveryAddress } from '../value-objects/delivery-address.value-object';
import { NotificationMetadata } from '../value-objects/notification-metadata.value-object';

export type NotificationType = 'email' | 'sms' | 'push' | 'in-app';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'delivered' | 'read';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Notification Entity
 * Represents a notification in the Maysar notification system
 */
export class Notification implements Entity {
  public readonly id: string;
  public readonly userId: string;
  public readonly type: NotificationType;
  public readonly channel: NotificationType;
  public readonly status: NotificationStatus;
  public readonly priority: NotificationPriority;
  public readonly subject: string;
  public readonly content: NotificationContent;
  public readonly metadata: NotificationMetadata;
  public readonly scheduledAt?: Date;
  public readonly sentAt?: Date;
  public readonly deliveredAt?: Date;
  public readonly readAt?: Date;
  public readonly retryCount: number;
  public readonly maxRetries: number;
  public readonly lastError?: string;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly deliveryAddress?: DeliveryAddress;

  constructor(props: {
    id: string;
    userId: string;
    type: NotificationType;
    channel: NotificationType;
    status: NotificationStatus;
    priority: NotificationPriority;
    subject: string;
    content: NotificationContent;
    metadata: NotificationMetadata;
    scheduledAt?: Date;
    sentAt?: Date;
    deliveredAt?: Date;
    readAt?: Date;
    retryCount: number;
    maxRetries: number;
    lastError?: string;
    createdAt: Date;
    updatedAt: Date;
    deliveryAddress?: DeliveryAddress;
  }) {
    this.id = props.id;
    this.userId = props.userId;
    this.type = props.type;
    this.channel = props.channel;
    this.status = props.status;
    this.priority = props.priority;
    this.subject = props.subject;
    this.content = props.content;
    this.metadata = props.metadata;
    this.scheduledAt = props.scheduledAt;
    this.sentAt = props.sentAt;
    this.deliveredAt = props.deliveredAt;
    this.readAt = props.readAt;
    this.retryCount = props.retryCount;
    this.maxRetries = props.maxRetries;
    this.lastError = props.lastError;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.deliveryAddress = props.deliveryAddress;
  }

  static create(props: {
    id: string;
    userId: string;
    type: NotificationType;
    channel: NotificationType;
    subject: string;
    content: NotificationContent;
    metadata?: NotificationMetadata;
    priority?: NotificationPriority;
    scheduledAt?: Date;
    maxRetries?: number;
    deliveryAddress?: DeliveryAddress;
  }): Notification {
    const now = new Date();
    return new Notification({
      ...props,
      status: 'pending',
      priority: props.priority ?? 'medium',
      metadata: props.metadata ?? NotificationMetadata.create({}),
      retryCount: 0,
      maxRetries: props.maxRetries ?? 3,
      createdAt: now,
      updatedAt: now
    });
  }

  markAsSent(): Notification {
    return new Notification({
      ...this,
      status: 'sent',
      sentAt: new Date(),
      updatedAt: new Date()
    });
  }

  markAsDelivered(): Notification {
    return new Notification({
      ...this,
      status: 'delivered',
      deliveredAt: new Date(),
      updatedAt: new Date()
    });
  }

  markAsRead(): Notification {
    return new Notification({
      ...this,
      status: 'read',
      readAt: new Date(),
      updatedAt: new Date()
    });
  }

  markAsFailed(error: string): Notification {
    return new Notification({
      ...this,
      status: 'failed',
      lastError: error,
      updatedAt: new Date()
    });
  }

  canRetry(): boolean {
    return this.status === 'failed' && this.retryCount < this.maxRetries;
  }

  incrementRetryCount(): Notification {
    return new Notification({
      ...this,
      retryCount: this.retryCount + 1,
      status: 'pending',
      updatedAt: new Date()
    });
  }

  isExpired(): boolean {
    if (!this.scheduledAt) return false;
    const expiryWindow = 7 * 24 * 60 * 60 * 1000; // 7 days
    return Date.now() - this.scheduledAt.getTime() > expiryWindow;
  }

  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.id?.trim()) errors.push('Notification ID is required');
    if (!this.userId?.trim()) errors.push('User ID is required');
    if (!this.type) errors.push('Notification type is required');
    if (!this.channel) errors.push('Channel is required');
    if (!this.status) errors.push('Status is required');
    if (!this.subject?.trim()) errors.push('Subject is required');
    if (!this.content?.isValid()) errors.push('Invalid notification content');
    if (this.retryCount < 0) errors.push('Retry count cannot be negative');
    if (this.maxRetries < 0) errors.push('Max retries cannot be negative');
    if (this.scheduledAt && this.scheduledAt < new Date() && this.status === 'pending') {
      errors.push('Scheduled time cannot be in the past for pending notifications');
    }

    return { isValid: errors.length === 0, errors };
  }
}
