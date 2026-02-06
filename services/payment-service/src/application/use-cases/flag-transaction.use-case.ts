import { IPaymentRepository } from '../../domain/repositories/payment.repository';
import { PaymentStatus } from '../../domain/entities/payment.entity';

export interface FlagTransactionDTO {
    transactionId: string;
    adminId: string;
    flagType: string;
    reason: string;
}

export class FlagTransactionUseCase {
    constructor(private readonly paymentRepository: IPaymentRepository) { }

    async execute(dto: FlagTransactionDTO): Promise<void> {
        const payment = await this.paymentRepository.findById(dto.transactionId);
        if (!payment) {
            throw new Error(`Transaction ${dto.transactionId} not found`);
        }

        // Logic to flag transaction
        // payment.flag(dto.adminId, dto.flagType, dto.reason); 
        // Need to ensure Payment entity has flagging methods

        // For now, mirroring paymentService.ts logic
        payment.updateMetadata({
            flaggedAt: new Date(),
            flaggedBy: dto.adminId,
            flagReason: dto.reason,
            flagType: dto.flagType
        });

        // In some systems, flagging also changes status
        // payment.updateStatus(PaymentStatus.FLAGGED);

        await this.paymentRepository.update(payment);
    }
}
