import { Money, PaymentStatus, UUID } from './types';

export namespace PaymentService {
    export namespace Events {
        export interface PaymentProcessed {
            paymentId: UUID;
            orderId: UUID;
            amount: Money;
            status: PaymentStatus;
            transactionId: string;
            processedAt: Date;
        }

        export interface PaymentFailed {
            paymentId: UUID;
            orderId: UUID;
            amount: Money;
            reason: string;
            failedAt: Date;
        }

        export interface PaymentRefunded {
            refundId: UUID;
            paymentId: UUID;
            amount: Money;
            reason: string;
            refundedAt: Date;
        }
    }

    export namespace Commands {
        export interface ProcessPayment {
            orderId: UUID;
            userId: UUID;
            amount: Money;
            paymentMethodId: string;
        }

        export interface RefundPayment {
            paymentId: UUID;
            reason: string;
            amount?: Money; // Optional needed for partial refunds
        }
    }
}
