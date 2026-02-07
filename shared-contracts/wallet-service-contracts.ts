import { EventEnvelope, Money, UUID } from './types';

export namespace WalletService {
    export namespace Events {
        export interface WalletDebited {
            transactionId: UUID;
            walletId: UUID;
            amount: Money;
            referenceType: string;
            referenceId: string;
            debitedAt: Date;
        }

        export interface WalletCredited {
            transactionId: UUID;
            walletId: UUID;
            amount: Money;
            referenceType: string;
            referenceId: string;
            creditedAt: Date;
        }

        export interface TransactionCompleted {
            transactionId: UUID;
            status: 'completed' | 'failed';
            completedAt: Date;
        }
    }

    export namespace Commands {
        export interface DebitWallet {
            walletId: UUID;
            amount: Money;
            referenceType: string;
            referenceId: string;
            description?: string;
        }

        export interface CreditWallet {
            walletId: UUID;
            amount: Money;
            referenceType: string;
            referenceId: string;
            description?: string;
        }
    }
}
