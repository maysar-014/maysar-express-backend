/**
 * Domain Events for SMS Service
 * These events represent state changes in the SMS message lifecycle
 */

export interface DomainEvent {
    eventId: string;
    eventType: string;
    occurredAt: Date;
    aggregateId: string;
    payload: Record<string, unknown>;
}

export class SmsQueued implements DomainEvent {
    public readonly eventId: string;
    public readonly eventType = 'SmsQueued';
    public readonly occurredAt: Date;
    public readonly aggregateId: string;
    public readonly payload: {
        messageId: string;
        phoneNumber: string;
        userId?: string;
        segmentCount: number;
    };

    constructor(messageId: string, phoneNumber: string, segmentCount: number, userId?: string) {
        this.eventId = this.generateEventId();
        this.occurredAt = new Date();
        this.aggregateId = messageId;
        this.payload = {
            messageId,
            phoneNumber,
            userId,
            segmentCount
        };
    }

    private generateEventId(): string {
        return `${this.eventType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}

export class SmsSending implements DomainEvent {
    public readonly eventId: string;
    public readonly eventType = 'SmsSending';
    public readonly occurredAt: Date;
    public readonly aggregateId: string;
    public readonly payload: {
        messageId: string;
        phoneNumber: string;
        providerId: string;
    };

    constructor(messageId: string, phoneNumber: string, providerId: string) {
        this.eventId = this.generateEventId();
        this.occurredAt = new Date();
        this.aggregateId = messageId;
        this.payload = {
            messageId,
            phoneNumber,
            providerId
        };
    }

    private generateEventId(): string {
        return `${this.eventType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}

export class SmsSent implements DomainEvent {
    public readonly eventId: string;
    public readonly eventType = 'SmsSent';
    public readonly occurredAt: Date;
    public readonly aggregateId: string;
    public readonly payload: {
        messageId: string;
        phoneNumber: string;
        providerId: string;
        providerMessageId: string;
        sentAt: Date;
    };

    constructor(
        messageId: string,
        phoneNumber: string,
        providerId: string,
        providerMessageId: string
    ) {
        this.eventId = this.generateEventId();
        this.occurredAt = new Date();
        this.aggregateId = messageId;
        this.payload = {
            messageId,
            phoneNumber,
            providerId,
            providerMessageId,
            sentAt: new Date()
        };
    }

    private generateEventId(): string {
        return `${this.eventType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}

export class SmsDelivered implements DomainEvent {
    public readonly eventId: string;
    public readonly eventType = 'SmsDelivered';
    public readonly occurredAt: Date;
    public readonly aggregateId: string;
    public readonly payload: {
        messageId: string;
        phoneNumber: string;
        providerId: string;
        providerMessageId: string;
        deliveredAt: Date;
    };

    constructor(
        messageId: string,
        phoneNumber: string,
        providerId: string,
        providerMessageId: string
    ) {
        this.eventId = this.generateEventId();
        this.occurredAt = new Date();
        this.aggregateId = messageId;
        this.payload = {
            messageId,
            phoneNumber,
            providerId,
            providerMessageId,
            deliveredAt: new Date()
        };
    }

    private generateEventId(): string {
        return `${this.eventType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}

export class SmsFailed implements DomainEvent {
    public readonly eventId: string;
    public readonly eventType = 'SmsFailed';
    public readonly occurredAt: Date;
    public readonly aggregateId: string;
    public readonly payload: {
        messageId: string;
        phoneNumber: string;
        providerId?: string;
        error: string;
        retryCount: number;
        canRetry: boolean;
    };

    constructor(
        messageId: string,
        phoneNumber: string,
        error: string,
        retryCount: number,
        canRetry: boolean,
        providerId?: string
    ) {
        this.eventId = this.generateEventId();
        this.occurredAt = new Date();
        this.aggregateId = messageId;
        this.payload = {
            messageId,
            phoneNumber,
            providerId,
            error,
            retryCount,
            canRetry
        };
    }

    private generateEventId(): string {
        return `${this.eventType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}

export class SmsCancelled implements DomainEvent {
    public readonly eventId: string;
    public readonly eventType = 'SmsCancelled';
    public readonly occurredAt: Date;
    public readonly aggregateId: string;
    public readonly payload: {
        messageId: string;
        phoneNumber: string;
        reason: string;
        retryCount: number;
    };

    constructor(messageId: string, phoneNumber: string, reason: string, retryCount: number) {
        this.eventId = this.generateEventId();
        this.occurredAt = new Date();
        this.aggregateId = messageId;
        this.payload = {
            messageId,
            phoneNumber,
            reason,
            retryCount
        };
    }

    private generateEventId(): string {
        return `${this.eventType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}

export class SmsUndelivered implements DomainEvent {
    public readonly eventId: string;
    public readonly eventType = 'SmsUndelivered';
    public readonly occurredAt: Date;
    public readonly aggregateId: string;
    public readonly payload: {
        messageId: string;
        phoneNumber: string;
        providerId: string;
        providerMessageId: string;
        reason?: string;
    };

    constructor(
        messageId: string,
        phoneNumber: string,
        providerId: string,
        providerMessageId: string,
        reason?: string
    ) {
        this.eventId = this.generateEventId();
        this.occurredAt = new Date();
        this.aggregateId = messageId;
        this.payload = {
            messageId,
            phoneNumber,
            providerId,
            providerMessageId,
            reason
        };
    }

    private generateEventId(): string {
        return `${this.eventType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
