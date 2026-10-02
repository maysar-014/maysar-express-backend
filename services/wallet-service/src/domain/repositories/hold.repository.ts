import { Hold } from '../entities/hold.entity';

export interface IHoldRepository {
    save(hold: Hold): Promise<void>;
    findById(id: string): Promise<Hold | null>;
    findActiveByWalletId(walletId: string): Promise<Hold[]>;
    findExpired(limit?: number): Promise<Hold[]>;
    update(hold: Hold): Promise<void>;
    /**
     * ACTIVE holds that carry a structured order reference, for the
     * reconciliation job. Ordered oldest-first so a backlog drains in the order
     * it was created rather than starving older holds.
     */
    findReconciliationCandidates(limit?: number): Promise<Hold[]>;
}
