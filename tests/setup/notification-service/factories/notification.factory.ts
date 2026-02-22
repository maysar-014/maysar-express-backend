import { v4 as uuidv4 } from 'uuid';

export interface NotificationFactoryProps {
  id?: string;
  userId?: string;
  type?: string;
  channel?: string;
  status?: string;
  priority?: string;
  subject?: string;
  content?: string;
  metadata?: Record<string, any>;
  scheduledAt?: Date | null;
  sentAt?: Date | null;
  deliveredAt?: Date | null;
  readAt?: Date | null;
  retryCount?: number;
  maxRetries?: number;
  lastError?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class NotificationFactory {
  static create(overrides: NotificationFactoryProps = {}) {
    const now = new Date();
    
    return {
      id: overrides.id ?? uuidv4(),
      userId: overrides.userId ?? uuidv4(),
      type: overrides.type ?? 'email',
      channel: overrides.channel ?? 'email',
      status: overrides.status ?? 'pending',
      priority: overrides.priority ?? 'medium',
      subject: overrides.subject ?? 'Test Notification',
      content: overrides.content ?? 'This is a test notification message',
      metadata: overrides.metadata ?? {
        source: 'system',
        category: 'transactional'
      },
      scheduledAt: overrides.scheduledAt ?? null,
      sentAt: overrides.sentAt ?? null,
      deliveredAt: overrides.deliveredAt ?? null,
      readAt: overrides.readAt ?? null,
      retryCount: overrides.retryCount ?? 0,
      maxRetries: overrides.maxRetries ?? 3,
      lastError: overrides.lastError ?? null,
      createdAt: overrides.createdAt ?? now,
      updatedAt: overrides.updatedAt ?? now
    };
  }

  static createEmail(overrides: NotificationFactoryProps = {}) {
    return this.create({
      ...overrides,
      type: 'email',
      channel: 'email'
    });
  }

  static createSMS(overrides: NotificationFactoryProps = {}) {
    return this.create({
      ...overrides,
      type: 'sms',
      channel: 'sms',
      subject: '',
      content: 'SMS notification message'
    });
  }

  static createPush(overrides: NotificationFactoryProps = {}) {
    return this.create({
      ...overrides,
      type: 'push',
      channel: 'push'
    });
  }

  static createInApp(overrides: NotificationFactoryProps = {}) {
    return this.create({
      ...overrides,
      type: 'in-app',
      channel: 'in-app'
    });
  }

  static createSent(overrides: NotificationFactoryProps = {}) {
    const now = new Date();
    return this.create({
      ...overrides,
      status: 'sent',
      sentAt: now
    });
  }

  static createDelivered(overrides: NotificationFactoryProps = {}) {
    const now = new Date();
    return this.create({
      ...overrides,
      status: 'delivered',
      sentAt: new Date(now.getTime() - 60000),
      deliveredAt: now
    });
  }

  static createFailed(overrides: NotificationFactoryProps = {}) {
    return this.create({
      ...overrides,
      status: 'failed',
      lastError: overrides.lastError ?? 'Delivery failed'
    });
  }

  static createUrgent(overrides: NotificationFactoryProps = {}) {
    return this.create({
      ...overrides,
      priority: 'urgent'
    });
  }

  static createScheduled(overrides: NotificationFactoryProps = {}) {
    const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
    return this.create({
      ...overrides,
      scheduledAt: overrides.scheduledAt ?? futureDate
    });
  }
}
