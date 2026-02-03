import { Refund } from '../entities/refund.entity';

export interface IRefundRepository {
    save(refund: Refund): Promise<void>;
    findById(id: string): Promise<Refund | null>;
    findByPaymentId(paymentId: string): Promise<Refund[]>;
    update(refund: Refund): Promise<void>;
}
