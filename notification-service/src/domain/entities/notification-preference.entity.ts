import { Entity } from '../interfaces';
import { Notification } from './notification.entity';

export type PreferenceChannel = 'email' | 'sms' | 'push' | 'in-app';
export type NotificationCategory = 'marketing' | 'transactional' | 'system';

export interface QuietHours {
  start: string; // HH:mm
  end: string;   // HH:mm
  timezone?: string;
}

/**
 * NotificationPreference Entity
 * User preferences for notification delivery
 */
export class NotificationPreference implements Entity {
  public readonly id: string;
  public readonly userId: string;
  public readonly channel: PreferenceChannel;
  public readonly enabled: boolean;
  public readonly categories: Record<NotificationCategory, boolean>;
  public readonly quietHours?: QuietHours;
  public readonly frequency?: 'realtime' | 'hourly' | 'daily' | 'weekly';
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: {
    id: string;
    userId: string;
    channel: PreferenceChannel;
    enabled: boolean;
    categories: Record<NotificationCategory, boolean>;
    quietHours?: QuietHours;
    frequency?: 'realtime' | 'hourly' | 'daily' | 'weekly';
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = props.id;
    this.userId = props.userId;
    this.channel = props.channel;
    this.enabled = props.enabled;
    this.categories = props.categories;
    this.quietHours = props.quietHours;
    this.frequency = props.frequency;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: {
    id: string;
    userId: string;
    channel: PreferenceChannel;
    enabled?: boolean;
    categories?: Partial<Record<NotificationCategory, boolean>>;
    quietHours?: QuietHours;
    frequency?: 'realtime' | 'hourly' | 'daily' | 'weekly';
  }): NotificationPreference {
    const now = new Date();
    const defaultCategories: Record<NotificationCategory, boolean> = {
      marketing: true,
      transactional: true,
      system: true
    };
    return new NotificationPreference({
      ...props,
      enabled: props.enabled ?? true,
      categories: { ...defaultCategories, ...props.categories },
      createdAt: now,
      updatedAt: now
    });
  }

  canSend(notification: Notification): boolean {
    if (!this.enabled) return false;
    if (this.channel !== notification.channel) return false;
    const category = (notification.metadata.toObject() as any).category as NotificationCategory | undefined;
    if (category && this.categories[category] === false) return false;
    if (this.isInQuietHours()) {
      const priority = notification.priority;
      return priority === 'urgent' || priority === 'high';
    }
    return true;
  }

  isInQuietHours(): boolean {
    if (!this.quietHours) return false;
    const now = new Date();
    const [startH, startM] = this.quietHours.start.split(':').map(Number);
    const [endH, endM] = this.quietHours.end.split(':').map(Number);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;
    if (endMinutes <= startMinutes) endMinutes += 24 * 60;
    const wrapped = currentMinutes < startMinutes ? currentMinutes + 24 * 60 : currentMinutes;
    return wrapped >= startMinutes && wrapped < endMinutes;
  }

  updatePreference(updates: {
    enabled?: boolean;
    categories?: Partial<Record<NotificationCategory, boolean>>;
    quietHours?: QuietHours;
    frequency?: 'realtime' | 'hourly' | 'daily' | 'weekly';
  }): NotificationPreference {
    return new NotificationPreference({
      ...this,
      ...updates,
      categories: updates.categories ? { ...this.categories, ...updates.categories } : this.categories,
      updatedAt: new Date()
    });
  }
}
