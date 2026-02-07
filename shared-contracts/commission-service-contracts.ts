import { UUID, Money } from './types';

export namespace CommissionService {
    export namespace Events {
        export interface CommissionCalculated {
            commissionId: UUID;
            transactionId: UUID;
            amount: Money;
            recipientId: UUID;
            calculatedAt: Date;
        }

        export interface CommissionSettled {
            commissionId: UUID;
            transactionId: UUID;
            amount: Money;
            recipientId: UUID;
            settledAt: Date;
        }
    }

    export namespace Commands {
        export interface CalculateCommission {
            transactionId: UUID;
            amount: Money;
            type: string;
        }

        export interface SettleCommission {
            commissionId: UUID;
        }
    }
}
