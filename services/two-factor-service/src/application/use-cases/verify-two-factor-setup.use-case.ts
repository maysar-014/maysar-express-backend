import { ITwoFactorRepository } from '../../domain/repositories/two-factor.repository';
import { TotpEngine } from '../../domain/engines/totp.engine';
import { VerifyTwoFactorResponseDTO } from '../dto/two-factor.dto';

export class VerifyTwoFactorSetupUseCase {
    constructor(private readonly repository: ITwoFactorRepository) { }

    /**
     * Verifies the initial setup code and completes 2FA activation.
     */
    public async execute(userId: string, code: string): Promise<VerifyTwoFactorResponseDTO> {
        const config = await this.repository.findByUserId(userId);

        if (!config) {
            throw new Error('Two-factor authentication configuration not found.');
        }

        if (config.isEnabled && config.isVerified) {
            return {
                success: true,
                message: 'Two-factor authentication is already enabled and verified.'
            };
        }

        // Verify TOTP code against the stored secret
        // Note: secret should be decrypted by the repository or a service before this
        const isValid = TotpEngine.verifyCode(config.secret, code);

        if (!isValid) {
            return { success: false, message: 'Invalid verification code.' };
        }

        // Update entity state
        config.verify();
        config.enable();

        // Persist changes
        await this.repository.save(config);

        // TODO: Publish TwoFactorEnabledEvent

        return {
            success: true,
            message: 'Two-factor authentication has been verified and enabled.'
        };
    }
}
