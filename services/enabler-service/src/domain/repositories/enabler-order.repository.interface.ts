import { EnablerOrderEntity } from '../entities/enabler-order.entity';

export interface IEnablerOrderRepository {
    findById(id: string): Promise<EnablerOrderEntity | null>;
    findByEnablerId(enablerId: string): Promise<EnablerOrderEntity[]>;
    findByOrderId(orderId: string): Promise<EnablerOrderEntity | null>;
    findPendingCommissions(): Promise<EnablerOrderEntity[]>;
    save(order: EnablerOrderEntity): Promise<void>;
    update(order: EnablerOrderEntity): Promise<void>;
}
