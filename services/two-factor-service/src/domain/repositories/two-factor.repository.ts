import { TwoFactorConfig } from '../entities/two-factor-config.entity';

export interface ITwoFactorRepository {
    /**
     * Finds 2FA configuration for a given user
     */
    findByUserId(userId: string): Promise<TwoFactorConfig | null>;

    /**
     * Saves or updates 2FA configuration
     */
    save(config: TwoFactorConfig): Promise<void>;

    /**
     * Deletes 2FA configuration for a user
     */
    deleteByUserId(userId: string): Promise<void>;

    /**
     * Atomically updates backup codes for a user
     */
    updateBackupCodes(userId: string, codeHashes: string[]): Promise<void>;

    /**
     * Marks a specific backup code as used (removes from list)
     */
    markBackupCodeAsUsed(userId: string, codeHash: string): Promise<void>;
}
