/**
 * Refund Payment Use Case
 * Handles payment refund processing with policy validation
 */

import { Payment } from '../../domain/entities/payment.entity';
import { Refund, RefundStatus, RefundReason } from '../../domain/entities/refund.entity';
import { IPaymentRepository } from '../../domain/repositories/payment.repository';
import { RefundPolicy } from '../../domain/policies/refund.policy';

export interface RefundPaymentDTO {
    paymentId: string;
    amount: number;
    reason: RefundReason;
    reasonDetails?: string;
    requestedBy: string;
}

export interface RefundResultDTO {
    success: boolean;
    refundId?: string;
    status: RefundStatus;
    refundAmount?: number;
    message?: string;
}

import { IRefundRepository } from '../../domain/repositories/refund.repository';

export class RefundPaymentUseCase {
    constructor(
        private readonly paymentRepository: IPaymentRepository,
        private readonly refundRepository: IRefundRepository,
        private readonly refundPolicy: RefundPolicy
    ) { }

    async execute(dto: RefundPaymentDTO): Promise<RefundResultDTO> {
        // Step 1: Find payment
        const payment = await this.paymentRepository.findById(dto.paymentId);
        if (!payment) {
            return {
                success: false,
                status: RefundStatus.FAILED,
                message: 'Payment not found',
            };
        }

        // Step 2: Check refund eligibility
        const eligibility = this.refundPolicy.canRefund(
            payment.status,
            payment.amount,
            payment.refundedAmount,
            payment.createdAt
        );

        if (!eligibility.canRefund) {
            return {
                success: false,
                status: RefundStatus.FAILED,
                message: eligibility.reasons.join(', '),
            };
        }

        // Step 3: Validate refund amount
        const maxRefundAmount = eligibility.refundableAmount;
        if (dto.amount > maxRefundAmount) {
            return {
                success: false,
                status: RefundStatus.FAILED,
                message: `Refund amount ${dto.amount} exceeds maximum refundable amount ${maxRefundAmount}`,
            };
        }

        // Step 4: Calculate actual refund amount based on policy
        const actualRefundAmount = this.refundPolicy.calculateRefundAmount(
            payment.amount,
            payment.refundedAmount,
            payment.createdAt
        );

        const refundAmount = Math.min(dto.amount, actualRefundAmount);

        // Step 5: Create refund entity
        const refundId = this.generateId();
        const refund = new Refund({
            id: refundId,
            paymentId: payment.id,
            orderId: payment.orderId,
            userId: payment.userId,
            amount: refundAmount,
            currency: payment.currency,
            reason: dto.reason,
            reasonDetails: dto.reasonDetails,
            status: RefundStatus.PENDING,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        // Step 6: Save refund
        await this.refundRepository.save(refund);

        // Step 7: Update payment with refund
        payment.recordRefund(refundAmount);
        await this.paymentRepository.update(payment);

        return {
            success: true,
            refundId: refund.id,
            status: refund.status,
            refundAmount: refund.amount,
            message: 'Refund initiated successfully',
        };
    }

    private generateId(): string {
        return `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
