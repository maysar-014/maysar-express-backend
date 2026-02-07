/**
 * Payout Service Shared Contracts
 */

export enum PayoutMethod {
    BANK_TRANSFER = 'BANK_TRANSFER',
    MOBILE_MONEY = 'MOBILE_MONEY',
    WALLET = 'WALLET',
}

export enum PayoutStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED',
}

export interface InitiatePayoutDTO {
    userId: string;
    userRole: string;
    amount: number;
    currency: string;
    method: PayoutMethod;
    bankDetails?: {
        bankName: string;
        bankCode: string;
        accountNumber: string;
        accountName: string;
        branchCode?: string;
    };
    mobileMoneyDetails?: {
        provider: string;
        phoneNumber: string;
        accountName: string;
    };
    availableBalance?: number;
    userStatus?: string;
    lastPayoutDate?: Date;
}

export interface PayoutResponse {
    success: boolean;
    payoutId?: string;
    status: PayoutStatus;
    amount?: number;
    fee?: number;
    netAmount?: number;
    message?: string;
    error?: string;
}

/**
 * Payout Events
 */
export enum PayoutEvents {
    PAYOUT_INITIATED = 'payout.initiated',
    PAYOUT_COMPLETED = 'payout.completed',
    PAYOUT_FAILED = 'payout.failed',
    PAYOUT_CANCELLED = 'payout.cancelled',
}

export interface PayoutEventPayload {
    payoutId: string;
    userId: string;
    userRole: string;
    amount: number;
    currency: string;
    timestamp: Date;
    status: PayoutStatus;
    reference?: string;
    failureReason?: string;
}

/**
 * Service Client Interface
 */
export interface IPayoutServiceClient {
    initiatePayout(dto: InitiatePayoutDTO): Promise<PayoutResponse>;
    getPayoutStatus(payoutId: string): Promise<PayoutResponse>;
    cancelPayout(payoutId: string, reason: string): Promise<void>;
}
