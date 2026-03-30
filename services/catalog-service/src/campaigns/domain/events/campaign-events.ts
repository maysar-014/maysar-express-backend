import { CampaignType } from '../types/campaign.types';

export abstract class CampaignDomainEvent {
    public readonly eventId: string;
    public readonly aggregateId: string;
    public readonly occurredAt: Date;
    public readonly eventVersion: number;

    constructor(
        eventId: string,
        aggregateId: string,
        occurredAt: Date = new Date(),
        eventVersion: number = 1
    ) {
        this.eventId = eventId;
        this.aggregateId = aggregateId;
        this.occurredAt = occurredAt;
        this.eventVersion = eventVersion;
    }

    abstract get eventType(): string;
}

export class CampaignCreatedEvent extends CampaignDomainEvent {
    constructor(
        eventId: string,
        aggregateId: string,
        public readonly name: string,
        public readonly type: CampaignType,
        public readonly sellerId: string,
        occurredAt: Date = new Date()
    ) {
        super(eventId, aggregateId, occurredAt);
    }

    get eventType(): string {
        return 'CampaignCreated';
    }
}

export class CampaignScheduledEvent extends CampaignDomainEvent {
    constructor(
        eventId: string,
        aggregateId: string,
        public readonly startDate: Date,
        public readonly endDate?: Date,
        occurredAt: Date = new Date()
    ) {
        super(eventId, aggregateId, occurredAt);
    }

    get eventType(): string {
        return 'CampaignScheduled';
    }
}

export class CampaignLaunchedEvent extends CampaignDomainEvent {
    constructor(
        eventId: string,
        aggregateId: string,
        occurredAt: Date = new Date()
    ) {
        super(eventId, aggregateId, occurredAt);
    }

    get eventType(): string {
        return 'CampaignLaunched';
    }
}

export class CampaignPausedEvent extends CampaignDomainEvent {
    constructor(
        eventId: string,
        aggregateId: string,
        occurredAt: Date = new Date()
    ) {
        super(eventId, aggregateId, occurredAt);
    }

    get eventType(): string {
        return 'CampaignPaused';
    }
}

export class CampaignResumedEvent extends CampaignDomainEvent {
    constructor(
        eventId: string,
        aggregateId: string,
        occurredAt: Date = new Date()
    ) {
        super(eventId, aggregateId, occurredAt);
    }

    get eventType(): string {
        return 'CampaignResumed';
    }
}

export class CampaignCompletedEvent extends CampaignDomainEvent {
    constructor(
        eventId: string,
        aggregateId: string,
        occurredAt: Date = new Date()
    ) {
        super(eventId, aggregateId, occurredAt);
    }

    get eventType(): string {
        return 'CampaignCompleted';
    }
}

export class CampaignCancelledEvent extends CampaignDomainEvent {
    constructor(
        eventId: string,
        aggregateId: string,
        public readonly reason?: string,
        occurredAt: Date = new Date()
    ) {
        super(eventId, aggregateId, occurredAt);
    }

    get eventType(): string {
        return 'CampaignCancelled';
    }
}

export type CampaignEvent =
    | CampaignCreatedEvent
    | CampaignScheduledEvent
    | CampaignLaunchedEvent
    | CampaignPausedEvent
    | CampaignResumedEvent
    | CampaignCompletedEvent
    | CampaignCancelledEvent;
