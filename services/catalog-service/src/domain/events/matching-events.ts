import crypto from 'crypto';
import { MatchResult } from '../value-objects/match-result.value-object';
import { ProductCandidate } from '../engines/catalog-matching.engine';

// Base interface for domain events (assuming one exists, or defining one here)
export interface DomainEvent {
    eventId: string;
    occurredAt: Date;
    eventType: string;
}

export abstract class MatchingDomainEvent implements DomainEvent {
    public readonly eventId: string; // generated
    public readonly occurredAt: Date;
    public abstract readonly eventType: string;

    constructor(
        public readonly sellerId: string,
        public readonly candidate: ProductCandidate,
        public readonly matchResult: MatchResult
    ) {
        this.eventId = crypto.randomUUID(); // Requires node 19+ or polyfill, or use uuid lib
        this.occurredAt = new Date();
    }
}

export class ProductMatchFoundEvent extends MatchingDomainEvent {
    public readonly eventType = 'ProductMatchFound';
}

export class ProductMatchConfirmationRequiredEvent extends MatchingDomainEvent {
    public readonly eventType = 'ProductMatchConfirmationRequired';
    constructor(
        sellerId: string,
        candidate: ProductCandidate,
        matchResult: MatchResult,
        public readonly confirmationId: string
    ) {
        super(sellerId, candidate, matchResult);
    }
}

export class ProductMatchConfirmedEvent implements DomainEvent {
    public readonly eventId: string;
    public readonly occurredAt: Date;
    public readonly eventType = 'ProductMatchConfirmed';

    constructor(
        public readonly sellerId: string,
        public readonly confirmationId: string,
        public readonly auditId: string,
        public readonly confirmedProductId: string
    ) {
        this.eventId = crypto.randomUUID();
        this.occurredAt = new Date();
    }
}

export class ProductMatchRejectedEvent implements DomainEvent {
    public readonly eventId: string;
    public readonly occurredAt: Date;
    public readonly eventType = 'ProductMatchRejected';

    constructor(
        public readonly sellerId: string,
        public readonly confirmationId: string,
        public readonly auditId: string
    ) {
        this.eventId = crypto.randomUUID();
        this.occurredAt = new Date();
    }
}

export class NewProductCreatedEvent implements DomainEvent {
    public readonly eventId: string;
    public readonly occurredAt: Date;
    public readonly eventType = 'NewProductCreated';

    constructor(
        public readonly productId: string,
        public readonly sellerId: string,
        public readonly matchResult: MatchResult // The NO_MATCH result
    ) {
        this.eventId = crypto.randomUUID();
        this.occurredAt = new Date();
    }
}
