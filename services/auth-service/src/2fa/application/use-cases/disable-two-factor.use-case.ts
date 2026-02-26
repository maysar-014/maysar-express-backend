import { ITwoFactorRepository } from '../../domain/repositories/two-factor.repository';
import { TotpEngine } from '../../domain/engines/totp.engine';
import { BackupCodeEngine } from '../../domain/engines/backup-code.engine';

export class DisableTwoFactorUseCase {
    constructor(private readonly repository: ITwoFactorRepository) { }

    /**
     * Disables 2FA for a user. 
     * Requires either a valid TOTP code or a backup code for security.
     */
    public async execute(userId: string, code: string): Promise<boolean> {
        const config = await this.repository.findByUserId(userId);

        if (!config || !config.isEnabled) {
            return false;
        }

        let isValid = false;

        // 1. Try TOTP code verification
        isValid = TotpEngine.verifyCode(config.secret, code);

        // 2. If not valid TOTP, try backup code verification
        if (!isValid) {
            for (const hash of config.backupCodes) {
                if (await BackupCodeEngine.verifyCode(code, hash)) {
                    isValid = true;
                    config.useBackupCode(hash);
                    break;
                }
            }
        }

        if (!isValid) {
            return false;
        }

        // 3. Disable 2FA
        config.disable();
        await this.repository.save(config);

        // TODO: Publish TwoFactorDisabledEvent

        return true;
    }
}
