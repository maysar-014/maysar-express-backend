import { IPaymentRepository } from '../../domain/repositories/payment.repository';
import { PaymentStatus } from '../../domain/entities/payment.entity';

export interface BlockTransactionDTO {
    transactionId: string;
    adminId: string;
    reason: string;
}

export class BlockTransactionUseCase {
    constructor(private readonly paymentRepository: IPaymentRepository) { }

    async execute(dto: BlockTransactionDTO): Promise<void> {
        const payment = await this.paymentRepository.findById(dto.transactionId);
        if (!payment) {
            throw new Error(`Transaction ${dto.transactionId} not found`);
        }

        // Money already captured or settled (COMPLETED / REFUNDED /
        // PARTIALLY_REFUNDED) cannot be blocked — reversing it is the refund
        // workflow, not a block. Only in-flight payments can be blocked.
        if (
            payment.status === PaymentStatus.COMPLETED ||
            payment.status === PaymentStatus.REFUNDED ||
            payment.status === PaymentStatus.PARTIALLY_REFUNDED
        ) {
            throw new Error(`Cannot block a ${payment.status} payment`);
        }

        // Audit metadata is recorded regardless of the resulting status.
        payment.updateMetadata({
            blockedAt: new Date(),
            blockedBy: dto.adminId,
            blockReason: dto.reason
        });

        // PENDING/PROCESSING → FAILED. FAILED/CANCELLED payments keep their
        // terminal status; the block metadata above is the audit record.
        payment.markAsFailed(`Blocked by admin: ${dto.reason}`);

        await this.paymentRepository.update(payment);
    }
}
