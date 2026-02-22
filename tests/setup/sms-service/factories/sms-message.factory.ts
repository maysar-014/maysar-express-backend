import { v4 as uuidv4 } from 'uuid';

export interface SmsMessageFactoryProps {
  id?: string;
  phoneNumber?: string;
  message?: string;
  userId?: string;
  status?: string;
  providerId?: string;
  providerMessageId?: string | null;
  retryCount?: number;
  maxRetries?: number;
  scheduledAt?: Date | null;
  sentAt?: Date | null;
  deliveredAt?: Date | null;
  failedAt?: Date | null;
  lastError?: string | null;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class SmsMessageFactory {
  static create(overrides: SmsMessageFactoryProps = {}) {
    const now = new Date();
    
    return {
      id: overrides.id ?? uuidv4(),
      phoneNumber: overrides.phoneNumber ?? '+255712345678',
      message: overrides.message ?? 'Test SMS message',
      userId: overrides.userId ?? uuidv4(),
      status: overrides.status ?? 'QUEUED',
      providerId: overrides.providerId ?? null,
      providerMessageId: overrides.providerMessageId ?? null,
      retryCount: overrides.retryCount ?? 0,
      maxRetries: overrides.maxRetries ?? 3,
      scheduledAt: overrides.scheduledAt ?? null,
      sentAt: overrides.sentAt ?? null,
      deliveredAt: overrides.deliveredAt ?? null,
      failedAt: overrides.failedAt ?? null,
      lastError: overrides.lastError ?? null,
      metadata: overrides.metadata ?? {},
      createdAt: overrides.createdAt ?? now,
      updatedAt: overrides.updatedAt ?? now
    };
  }

  static createQueued(overrides: SmsMessageFactoryProps = {}) {
    return this.create({
      ...overrides,
      status: 'QUEUED'
    });
  }

  static createSending(overrides: SmsMessageFactoryProps = {}) {
    return this.create({
      ...overrides,
      status: 'SENDING',
      providerId: overrides.providerId ?? 'africastalking'
    });
  }

  static createSent(overrides: SmsMessageFactoryProps = {}) {
    const now = new Date();
    return this.create({
      ...overrides,
      status: 'SENT',
      providerId: 'africastalking',
      providerMessageId: overrides.providerMessageId ?? `msg-${Date.now()}`,
      sentAt: now
    });
  }

  static createDelivered(overrides: SmsMessageFactoryProps = {}) {
    const now = new Date();
    return this.create({
      ...overrides,
      status: 'DELIVERED',
      providerId: 'africastalking',
      providerMessageId: `msg-${Date.now()}`,
      sentAt: new Date(now.getTime() - 60000),
      deliveredAt: now
    });
  }

  static createFailed(overrides: SmsMessageFactoryProps = {}) {
    const now = new Date();
    return this.create({
      ...overrides,
      status: 'FAILED',
      providerId: 'africastalking',
      failedAt: now,
      lastError: overrides.lastError ?? 'Network error'
    });
  }

  static createUndelivered(overrides: SmsMessageFactoryProps = {}) {
    const now = new Date();
    return this.create({
      ...overrides,
      status: 'UNDELIVERED',
      providerId: 'africastalking',
      providerMessageId: `msg-${Date.now()}`,
      sentAt: new Date(now.getTime() - 120000),
      lastError: overrides.lastError ?? 'Invalid phone number'
    });
  }

  static createCancelled(overrides: SmsMessageFactoryProps = {}) {
    return this.create({
      ...overrides,
      status: 'CANCELLED',
      lastError: overrides.lastError ?? 'User cancelled'
    });
  }

  static createScheduled(overrides: SmsMessageFactoryProps = {}) {
    const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
    return this.create({
      ...overrides,
      scheduledAt: overrides.scheduledAt ?? futureDate
    });
  }

  static createLongMessage(overrides: SmsMessageFactoryProps = {}) {
    const longMessage = 'This is a very long SMS message that will be split into multiple segments. '.repeat(5);
    return this.create({
      ...overrides,
      message: longMessage
    });
  }

  static createTanzanianNumber(overrides: SmsMessageFactoryProps = {}) {
    return this.create({
      ...overrides,
      phoneNumber: '+255712345678'
    });
  }

  static createKenyanNumber(overrides: SmsMessageFactoryProps = {}) {
    return this.create({
      ...overrides,
      phoneNumber: '+254712345678'
    });
  }
}
