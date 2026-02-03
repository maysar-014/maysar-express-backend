/**
 * Domain Events for Notification Service
 */

export interface DomainEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  eventVersion: number;
  occurredAt: Date;
  metadata?: Record<string, any>;
}

export class NotificationCreatedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'NotificationCreated';
  readonly aggregateType = 'Notification';
  readonly eventVersion = 1;
  readonly occurredAt: Date;
  readonly metadata?: Record<string, any>;

  constructor(
    public readonly aggregateId: string,
    public readonly userId: string,
    public readonly channel: string,
    public readonly priority: string,
    metadata?: Record<string, any>
  ) {
    this.eventId = `notification-created-${aggregateId}-${Date.now()}`;
    this.occurredAt = new Date();
    this.metadata = metadata;
  }
}

export class NotificationSentEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'NotificationSent';
  readonly aggregateType = 'Notification';
  readonly eventVersion = 1;
  readonly occurredAt: Date;
  readonly metadata?: Record<string, any>;

  constructor(
    public readonly aggregateId: string,
    public readonly userId: string,
    public readonly channel: string,
    metadata?: Record<string, any>
  ) {
    this.eventId = `notification-sent-${aggregateId}-${Date.now()}`;
    this.occurredAt = new Date();
    this.metadata = metadata;
  }
}

export class NotificationDeliveredEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'NotificationDelivered';
  readonly aggregateType = 'Notification';
  readonly eventVersion = 1;
  readonly occurredAt: Date;
  readonly metadata?: Record<string, any>;

  constructor(
    public readonly aggregateId: string,
    public readonly userId: string,
    public readonly channel: string,
    metadata?: Record<string, any>
  ) {
    this.eventId = `notification-delivered-${aggregateId}-${Date.now()}`;
    this.occurredAt = new Date();
    this.metadata = metadata;
  }
}

export class NotificationFailedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'NotificationFailed';
  readonly aggregateType = 'Notification';
  readonly eventVersion = 1;
  readonly occurredAt: Date;
  readonly metadata?: Record<string, any>;

  constructor(
    public readonly aggregateId: string,
    public readonly userId: string,
    public readonly channel: string,
    public readonly error: string,
    public readonly retryCount: number,
    metadata?: Record<string, any>
  ) {
    this.eventId = `notification-failed-${aggregateId}-${Date.now()}`;
    this.occurredAt = new Date();
    this.metadata = metadata;
  }
}

export class NotificationReadEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'NotificationRead';
  readonly aggregateType = 'Notification';
  readonly eventVersion = 1;
  readonly occurredAt: Date;
  readonly metadata?: Record<string, any>;

  constructor(
    public readonly aggregateId: string,
    public readonly userId: string,
    metadata?: Record<string, any>
  ) {
    this.eventId = `notification-read-${aggregateId}-${Date.now()}`;
    this.occurredAt = new Date();
    this.metadata = metadata;
  }
}

export class NotificationRetryScheduledEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'NotificationRetryScheduled';
  readonly aggregateType = 'Notification';
  readonly eventVersion = 1;
  readonly occurredAt: Date;
  readonly metadata?: Record<string, any>;

  constructor(
    public readonly aggregateId: string,
    public readonly retryAt: Date,
    public readonly retryCount: number,
    metadata?: Record<string, any>
  ) {
    this.eventId = `notification-retry-${aggregateId}-${Date.now()}`;
    this.occurredAt = new Date();
    this.metadata = metadata;
  }
}

export class TemplateCreatedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'TemplateCreated';
  readonly aggregateType = 'NotificationTemplate';
  readonly eventVersion = 1;
  readonly occurredAt: Date;
  readonly metadata?: Record<string, any>;

  constructor(
    public readonly aggregateId: string,
    public readonly name: string,
    public readonly channel: string,
    metadata?: Record<string, any>
  ) {
    this.eventId = `template-created-${aggregateId}-${Date.now()}`;
    this.occurredAt = new Date();
    this.metadata = metadata;
  }
}

export class PreferenceUpdatedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'PreferenceUpdated';
  readonly aggregateType = 'NotificationPreference';
  readonly eventVersion = 1;
  readonly occurredAt: Date;
  readonly metadata?: Record<string, any>;

  constructor(
    public readonly aggregateId: string,
    public readonly userId: string,
    public readonly channel: string,
    metadata?: Record<string, any>
  ) {
    this.eventId = `preference-updated-${aggregateId}-${Date.now()}`;
    this.occurredAt = new Date();
    this.metadata = metadata;
  }
}

export interface IDomainEventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishMany(events: DomainEvent[]): Promise<void>;
}
