import { Notification } from '../entities/notification.entity';
import { NotificationTemplate } from '../entities/notification-template.entity';
import { NotificationPreference } from '../entities/notification-preference.entity';

export interface NotificationSearchCriteria {
  userId?: string;
  status?: string;
  channel?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export interface INotificationRepository {
  findById(id: string): Promise<Notification | null>;
  create(notification: Notification): Promise<Notification>;
  update(notification: Notification): Promise<Notification>;
  delete(id: string): Promise<void>;
  findByUserId(userId: string, limit?: number, offset?: number): Promise<Notification[]>;
  findByStatus(status: string, limit?: number, offset?: number): Promise<Notification[]>;
  findPending(limit?: number): Promise<Notification[]>;
  search(criteria: NotificationSearchCriteria): Promise<Notification[]>;
  markAsSent(id: string, sentAt: Date): Promise<void>;
  markAsDelivered(id: string, deliveredAt: Date): Promise<void>;
  markAsRead(id: string, readAt: Date): Promise<void>;
  recordFailure(id: string, error: string): Promise<void>;
  getSentCountLastHour(userId: string, channel: string): Promise<number>;
}

export interface INotificationTemplateRepository {
  findById(id: string): Promise<NotificationTemplate | null>;
  findByName(name: string): Promise<NotificationTemplate | null>;
  create(template: NotificationTemplate): Promise<NotificationTemplate>;
  update(template: NotificationTemplate): Promise<NotificationTemplate>;
  delete(id: string): Promise<void>;
  findByChannel(channel: string): Promise<NotificationTemplate[]>;
  findActive(): Promise<NotificationTemplate[]>;
}

export interface INotificationPreferenceRepository {
  findById(id: string): Promise<NotificationPreference | null>;
  findByUserId(userId: string): Promise<NotificationPreference[]>;
  findByUserAndChannel(userId: string, channel: string): Promise<NotificationPreference | null>;
  create(preference: NotificationPreference): Promise<NotificationPreference>;
  update(preference: NotificationPreference): Promise<NotificationPreference>;
  delete(id: string): Promise<void>;
}

export interface PushTokenRecord {
  id: string;
  userId: string;
  token: string;
  platform?: string | null;
  deviceId?: string | null;
  isActive: boolean;
  lastSeenAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPushTokenRepository {
  upsertToken(params: {
    userId: string;
    token: string;
    platform?: string;
    deviceId?: string;
  }): Promise<PushTokenRecord>;
  listActiveTokensByUserId(userId: string): Promise<PushTokenRecord[]>;
  deactivateToken(userId: string, token: string): Promise<boolean>;
}
