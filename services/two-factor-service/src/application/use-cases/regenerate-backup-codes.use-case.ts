import { ITwoFactorRepository } from '../../domain/repositories/two-factor.repository';
import { BackupCodeEngine } from '../../domain/engines/backup-code.engine';

export class RegenerateBackupCodesUseCase {
    constructor(private readonly repository: ITwoFactorRepository) { }

    /**
     * Generates a new set of backup codes for a user.
     * Invalidates all previous backup codes.
     */
    public async execute(userId: string): Promise<string[]> {
        const config = await this.repository.findByUserId(userId);

        if (!config || !config.isEnabled) {
            throw new Error('Two-factor authentication must be enabled to regenerate backup codes.');
        }

        // 1. Generate new backup codes
        const backupCodes = await BackupCodeEngine.generateCodes(10);
        const plainCodes = backupCodes.map(c => c.plain);
        const hashedCodes = backupCodes.map(c => c.hash);

        // 2. Update config entity
        config.regenerateBackupCodes(hashedCodes);

        // 3. Persist changes
        await this.repository.save(config);

        // TODO: Publish BackupCodesRegeneratedEvent

        return plainCodes;
    }
}
