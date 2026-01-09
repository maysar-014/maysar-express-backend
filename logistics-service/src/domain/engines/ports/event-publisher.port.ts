export interface DomainEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  eventData: any;
  timestamp: Date;
  metadata?: {
    correlationId?: string;
    causationId?: string;
    userId?: string;
  };
}

export interface EventPublisherPort {
  publish(event: DomainEvent): Promise<void>;
  publishBatch(events: DomainEvent[]): Promise<void>;
  subscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): void;
  unsubscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): void;
}
