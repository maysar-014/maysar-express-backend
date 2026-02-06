/**
 * Wallet Repository
 * Interface defining wallet repository operations
 */

import { Wallet } from '../entities/wallet.entity';

export interface IWalletRepository {
    /**
     * Save a new wallet
     */
    save(wallet: Wallet): Promise<void>;

    /**
     * Find wallet by ID
     */
    findById(id: string): Promise<Wallet | null>;

    /**
     * Find wallet by user ID
     */
    findByUserId(userId: string): Promise<Wallet | null>;

    /**
     * Update existing wallet
     */
    update(wallet: Wallet): Promise<void>;

    /**
     * Update wallet balance atomically
     */
    updateBalance(
        walletId: string,
        balanceChange: number,
        frozenAmountChange: number
    ): Promise<void>;

    /**
     * Lock wallet for transaction (pessimistic locking)
     */
    lockForTransaction(walletId: string): Promise<Wallet>;

    /**
     * Get wallet balance
     */
    getBalance(walletId: string): Promise<{ balance: number; frozenAmount: number }>;
}
