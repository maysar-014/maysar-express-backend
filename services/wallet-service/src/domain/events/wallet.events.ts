/**
 * Wallet Domain Events
 */

export interface DomainEvent {
    eventId: string;
    eventType: string;
    aggregateId: string;
    aggregateType: string;
    occurredAt: Date;
    version: number;
}

export interface WalletCredited extends DomainEvent {
    eventType: 'WalletCredited';
    aggregateType: 'Wallet';
    payload: {
        walletId: string;
        userId: string;
        amount: number;
        currency: string;
        balanceBefore: number;
        balanceAfter: number;
        transactionId: string;
        reason: string;
    };
}

export interface WalletDebited extends DomainEvent {
    eventType: 'WalletDebited';
    aggregateType: 'Wallet';
    payload: {
        walletId: string;
        userId: string;
        amount: number;
        currency: string;
        balanceBefore: number;
        balanceAfter: number;
        transactionId: string;
        reason: string;
    };
}

export interface FundsFrozen extends DomainEvent {
    eventType: 'FundsFrozen';
    aggregateType: 'Wallet';
    payload: {
        walletId: string;
        userId: string;
        frozenAmount: number;
        reason: string;
        frozenAt: Date;
    };
}

export interface FundsUnfrozen extends DomainEvent {
    eventType: 'FundsUnfrozen';
    aggregateType: 'Wallet';
    payload: {
        walletId: string;
        userId: string;
        unfrozenAmount: number;
        reason: string;
        unfrozenAt: Date;
    };
}

export interface WalletStatusChanged extends DomainEvent {
    eventType: 'WalletStatusChanged';
    aggregateType: 'Wallet';
    payload: {
        walletId: string;
        userId: string;
        oldStatus: string;
        newStatus: string;
        reason: string;
        changedAt: Date;
    };
}

export interface HoldPlaced extends DomainEvent {
    eventType: 'HoldPlaced';
    aggregateType: 'Wallet';
    payload: {
        holdId: string;
        walletId: string;
        userId: string;
        amount: number;
        reason: string;
        expiresAt: Date;
    };
}

export interface HoldReleased extends DomainEvent {
    eventType: 'HoldReleased';
    aggregateType: 'Wallet';
    payload: {
        holdId: string;
        walletId: string;
        userId: string;
        reason: string;
    };
}

export interface HoldCaptured extends DomainEvent {
    eventType: 'HoldCaptured';
    aggregateType: 'Wallet';
    payload: {
        holdId: string;
        walletId: string;
        userId: string;
        transactionId: string;
        amount: number;
    };
}

export interface HoldExpired extends DomainEvent {
    eventType: 'HoldExpired';
    aggregateType: 'Wallet';
    payload: {
        holdId: string;
        walletId: string;
    };
}

export type WalletDomainEvent =
    | WalletCredited
    | WalletDebited
    | FundsFrozen
    | FundsUnfrozen
    | WalletStatusChanged
    | HoldPlaced
    | HoldReleased
    | HoldCaptured
    | HoldExpired;
