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

        // updateStatus will validate the transition (PENDING/PROCESSING -> FAILED/CANCELLED)
        // payment.updateStatus(PaymentStatus.CANCELLED, dto.reason);

        // Mirroring paymentService.ts logic for "BLOCK"
        payment.updateMetadata({
            blockedAt: new Date(),
            blockedBy: dto.adminId,
            blockReason: dto.reason
        });

        // Ensure status reflects blocked state
        payment.markAsFailed(`Blocked by admin: ${dto.reason}`);

        await this.paymentRepository.update(payment);
    }
}
