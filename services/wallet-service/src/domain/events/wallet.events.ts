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

export type WalletDomainEvent =
    | WalletCredited
    | WalletDebited
    | FundsFrozen
    | FundsUnfrozen
    | WalletStatusChanged;
