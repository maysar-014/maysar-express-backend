import { Hold } from '../entities/hold.entity';

export interface IHoldRepository {
    save(hold: Hold): Promise<void>;
    findById(id: string): Promise<Hold | null>;
    findActiveByWalletId(walletId: string): Promise<Hold[]>;
    findExpired(limit?: number): Promise<Hold[]>;
    update(hold: Hold): Promise<void>;
}
