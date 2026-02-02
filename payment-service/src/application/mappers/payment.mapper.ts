
import { Payment } from '../../domain/entities/payment.entity';
import { PaymentResponseDto } from '../dtos/payment.dto';

export class PaymentMapper {
    static toDto(payment: Payment): PaymentResponseDto {
        return {
            id: payment.id,
            orderId: payment.orderId,
            userId: payment.userId,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            method: payment.method,
            providerReference: payment.metadata.providerReference,
            createdAt: payment.createdAt,
            updatedAt: payment.updatedAt
        };
    }
}
