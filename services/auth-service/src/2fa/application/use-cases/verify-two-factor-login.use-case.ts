import { ITwoFactorRepository } from '../../domain/repositories/two-factor.repository';
import { TotpEngine } from '../../domain/engines/totp.engine';

export class VerifyTwoFactorLoginUseCase {
    constructor(private readonly repository: ITwoFactorRepository) { }

    /**
     * Verifies a TOTP code during the login flow.
     */
    public async execute(userId: string, code: string): Promise<boolean> {
        const config = await this.repository.findByUserId(userId);

        if (!config || !config.isEnabled) {
            return false;
        }

        const isValid = TotpEngine.verifyCode(config.secret, code);

        if (isValid) {
            config.markAsUsed();
            await this.repository.save(config);
        }

        return isValid;
    }
}
