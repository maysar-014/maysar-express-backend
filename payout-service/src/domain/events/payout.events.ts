/**
 * Payout Domain Events
 */

export interface DomainEvent {
    eventId: string;
    eventType: string;
    aggregateId: string;
    aggregateType: string;
    occurredAt: Date;
    version: number;
}

export interface PayoutInitiated extends DomainEvent {
    eventType: 'PayoutInitiated';
    aggregateType: 'Payout';
    payload: {
        payoutId: string;
        sellerId: string;
        amount: number;
        currency: string;
        method: string;
        requestedAt: Date;
    };
}

export interface PayoutProcessing extends DomainEvent {
    eventType: 'PayoutProcessing';
    aggregateType: 'Payout';
    payload: {
        payoutId: string;
        sellerId: string;
        amount: number;
        fee: number;
        netAmount: number;
        processedAt: Date;
    };
}

export interface PayoutCompleted extends DomainEvent {
    eventType: 'PayoutCompleted';
    aggregateType: 'Payout';
    payload: {
        payoutId: string;
        sellerId: string;
        amount: number;
        netAmount: number;
        providerPayoutId?: string;
        completedAt: Date;
    };
}

export interface PayoutFailed extends DomainEvent {
    eventType: 'PayoutFailed';
    aggregateType: 'Payout';
    payload: {
        payoutId: string;
        sellerId: string;
        amount: number;
        failureReason: string;
        failedAt: Date;
    };
}

export interface PayoutCancelled extends DomainEvent {
    eventType: 'PayoutCancelled';
    aggregateType: 'Payout';
    payload: {
        payoutId: string;
        sellerId: string;
        reason: string;
        cancelledAt: Date;
    };
}

export type PayoutDomainEvent =
    | PayoutInitiated
    | PayoutProcessing
    | PayoutCompleted
    | PayoutFailed
    | PayoutCancelled;
