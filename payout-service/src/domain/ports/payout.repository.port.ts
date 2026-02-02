import { Payout } from '../entities/payout.entity';

export interface IPayoutRepository {
    save(payout: Payout): Promise<void>;
    findById(id: string): Promise<Payout | null>;
    findBySellerId(sellerId: string, limit?: number): Promise<Payout[]>;
    update(payout: Payout): Promise<void>;
}
