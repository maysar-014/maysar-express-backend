/**
 * Domain Events
 * Event definitions for payment domain
 */

// Base Event Interface
export interface DomainEvent {
    eventId: string;
    eventType: string;
    aggregateId: string;
    aggregateType: string;
    occurredAt: Date;
    version: number;
}

// Payment Events
export interface PaymentInitiated extends DomainEvent {
    eventType: 'PaymentInitiated';
    aggregateType: 'Payment';
    payload: {
        paymentId: string;
        orderId: string;
        userId: string;
        amount: number;
        currency: string;
        method: string;
        provider: string;
    };
}

export interface PaymentProcessing extends DomainEvent {
    eventType: 'PaymentProcessing';
    aggregateType: 'Payment';
    payload: {
        paymentId: string;
        providerReference?: string;
    };
}

export interface PaymentCompleted extends DomainEvent {
    eventType: 'PaymentCompleted';
    aggregateType: 'Payment';
    payload: {
        paymentId: string;
        orderId: string;
        userId: string;
        amount: number;
        currency: string;
        providerTransactionId?: string;
        completedAt: Date;
    };
}

export interface PaymentFailed extends DomainEvent {
    eventType: 'PaymentFailed';
    aggregateType: 'Payment';
    payload: {
        paymentId: string;
        orderId: string;
        userId: string;
        amount: number;
        failureReason: string;
        failedAt: Date;
    };
}

export interface PaymentRefunded extends DomainEvent {
    eventType: 'PaymentRefunded';
    aggregateType: 'Payment';
    payload: {
        paymentId: string;
        refundId: string;
        orderId: string;
        userId: string;
        refundAmount: number;
        totalRefunded: number;
        refundedAt: Date;
    };
}

export interface PaymentCancelled extends DomainEvent {
    eventType: 'PaymentCancelled';
    aggregateType: 'Payment';
    payload: {
        paymentId: string;
        orderId: string;
        userId: string;
        reason: string;
        cancelledAt: Date;
    };
}

// Wallet Events
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

export interface WalletFrozen extends DomainEvent {
    eventType: 'WalletFrozen';
    aggregateType: 'Wallet';
    payload: {
        walletId: string;
        userId: string;
        frozenAmount: number;
        reason: string;
        frozenAt: Date;
    };
}

export interface WalletUnfrozen extends DomainEvent {
    eventType: 'WalletUnfrozen';
    aggregateType: 'Wallet';
    payload: {
        walletId: string;
        userId: string;
        unfrozenAmount: number;
        reason: string;
        unfrozenAt: Date;
    };
}

export interface WalletSuspended extends DomainEvent {
    eventType: 'WalletSuspended';
    aggregateType: 'Wallet';
    payload: {
        walletId: string;
        userId: string;
        reason: string;
        suspendedAt: Date;
    };
}

// Fraud Events
export interface FraudDetected extends DomainEvent {
    eventType: 'FraudDetected';
    aggregateType: 'Payment';
    payload: {
        paymentId: string;
        userId: string;
        riskScore: number;
        riskLevel: string;
        flags: Array<{
            type: string;
            severity: string;
            description: string;
        }>;
        recommendation: string;
        detectedAt: Date;
    };
}

export interface HighRiskTransactionDetected extends DomainEvent {
    eventType: 'HighRiskTransactionDetected';
    aggregateType: 'Payment';
    payload: {
        paymentId: string;
        userId: string;
        amount: number;
        riskScore: number;
        requiresReview: boolean;
        detectedAt: Date;
    };
}

export interface TransactionFlagged extends DomainEvent {
    eventType: 'TransactionFlagged';
    aggregateType: 'Payment';
    payload: {
        paymentId: string;
        userId: string;
        flagType: string;
        flagReason: string;
        flaggedBy: string;
        flaggedAt: Date;
    };
}

// Payout Events
export interface PayoutRequested extends DomainEvent {
    eventType: 'PayoutRequested';
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

export interface PayoutProcessed extends DomainEvent {
    eventType: 'PayoutProcessed';
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

// Refund Events
export interface RefundInitiated extends DomainEvent {
    eventType: 'RefundInitiated';
    aggregateType: 'Refund';
    payload: {
        refundId: string;
        paymentId: string;
        orderId: string;
        userId: string;
        amount: number;
        reason: string;
        initiatedAt: Date;
    };
}

export interface RefundProcessing extends DomainEvent {
    eventType: 'RefundProcessing';
    aggregateType: 'Refund';
    payload: {
        refundId: string;
        paymentId: string;
        amount: number;
    };
}

export interface RefundCompleted extends DomainEvent {
    eventType: 'RefundCompleted';
    aggregateType: 'Refund';
    payload: {
        refundId: string;
        paymentId: string;
        orderId: string;
        userId: string;
        amount: number;
        providerRefundId?: string;
        completedAt: Date;
    };
}

export interface RefundFailed extends DomainEvent {
    eventType: 'RefundFailed';
    aggregateType: 'Refund';
    payload: {
        refundId: string;
        paymentId: string;
        amount: number;
        failureReason: string;
        failedAt: Date;
    };
}

// Export all event types
export type PaymentDomainEvent =
    | PaymentInitiated
    | PaymentProcessing
    | PaymentCompleted
    | PaymentFailed
    | PaymentRefunded
    | PaymentCancelled
    | WalletCredited
    | WalletDebited
    | WalletFrozen
    | WalletUnfrozen
    | WalletSuspended
    | FraudDetected
    | HighRiskTransactionDetected
    | TransactionFlagged
    | PayoutRequested
    | PayoutProcessed
    | PayoutCompleted
    | PayoutFailed
    | RefundInitiated
    | RefundProcessing
    | RefundCompleted
    | RefundFailed;
