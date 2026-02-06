/**
 * Check Payment Status Use Case
 * Queries payment status from provider and updates local state
 */

import { Payment } from '../../domain/entities/payment.entity';
import { IPaymentRepository } from '../../domain/repositories/payment.repository';
import { IPaymentProvider } from '../../domain/repositories/payment-provider.gateway';
import { PaymentProvider } from '../../domain/entities/payment.entity';

export interface CheckPaymentStatusDTO {
    paymentId?: string;
    providerReference?: string;
    orderId?: string;
}

export interface PaymentStatusDTO {
    paymentId: string;
    status: string;
    amount: number;
    currency: string;
    orderId: string;
    userId: string;
    providerReference?: string;
    providerTransactionId?: string;
    completedAt?: Date;
    failureReason?: string;
    updatedAt: Date;
}

export class CheckPaymentStatusUseCase {
    constructor(
        private readonly paymentRepository: IPaymentRepository,
        private readonly paymentProviderFactory: (provider: PaymentProvider) => IPaymentProvider
    ) { }

    async execute(dto: CheckPaymentStatusDTO): Promise<PaymentStatusDTO | null> {
        // Step 1: Find payment
        let payment: Payment | null = null;

        if (dto.paymentId) {
            payment = await this.paymentRepository.findById(dto.paymentId);
        } else if (dto.providerReference) {
            payment = await this.paymentRepository.findByProviderReference(dto.providerReference);
        } else if (dto.orderId) {
            payment = await this.paymentRepository.findByOrderId(dto.orderId);
        }

        if (!payment) {
            return null;
        }

        // Step 2: If payment is already in final state, return current status
        const finalStatuses = ['COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED'];
        if (finalStatuses.includes(payment.status)) {
            return this.mapToDTO(payment);
        }

        // Step 3: Query provider for status update
        const providerRef = payment.metadata.providerReference;
        if (!providerRef) {
            return this.mapToDTO(payment);
        }

        try {
            const paymentProvider = this.paymentProviderFactory(payment.provider);
            const providerStatus = await paymentProvider.checkPaymentStatus(providerRef);

            // Step 4: Update payment status based on provider response
            if (providerStatus.status === 'COMPLETED' && payment.status !== 'COMPLETED') {
                payment.markAsCompleted(providerStatus.providerReference);
                await this.paymentRepository.update(payment);
            } else if (providerStatus.status === 'FAILED' && payment.status !== 'FAILED') {
                payment.markAsFailed(providerStatus.failureReason || 'Payment failed');
                await this.paymentRepository.update(payment);
            }

            return this.mapToDTO(payment);
        } catch (error) {
            // If provider query fails, return current payment status
            return this.mapToDTO(payment);
        }
    }

    private mapToDTO(payment: Payment): PaymentStatusDTO {
        return {
            paymentId: payment.id,
            status: payment.status,
            amount: payment.amount,
            currency: payment.currency,
            orderId: payment.orderId,
            userId: payment.userId,
            providerReference: payment.metadata.providerReference,
            providerTransactionId: payment.metadata.providerTransactionId,
            completedAt: payment.completedAt,
            failureReason: payment.failureReason,
            updatedAt: payment.updatedAt,
        };
    }
}
