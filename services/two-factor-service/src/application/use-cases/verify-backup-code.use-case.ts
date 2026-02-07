import { ITwoFactorRepository } from '../../domain/repositories/two-factor.repository';
import { BackupCodeEngine } from '../../domain/engines/backup-code.engine';

export class VerifyBackupCodeUseCase {
    constructor(private readonly repository: ITwoFactorRepository) { }

    /**
     * Verifies a backup code and marks it as used if valid.
     */
    public async execute(userId: string, code: string): Promise<boolean> {
        const config = await this.repository.findByUserId(userId);

        if (!config || !config.isEnabled) {
            return false;
        }

        // Check each hashed backup code
        for (const hash of config.backupCodes) {
            const isValid = await BackupCodeEngine.verifyCode(code, hash);

            if (isValid) {
                // Mark as used (removes from entity's internal array)
                config.useBackupCode(hash);

                // Persist update
                await this.repository.save(config);

                // TODO: Publish BackupCodeUsedEvent

                return true;
            }
        }

        return false;
    }
}
