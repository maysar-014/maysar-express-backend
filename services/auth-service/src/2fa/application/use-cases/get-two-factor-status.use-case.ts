import { ITwoFactorRepository } from '../../domain/repositories/two-factor.repository';
import { TwoFactorStatusResponseDTO } from '../dto/two-factor.dto';

export class GetTwoFactorStatusUseCase {
    constructor(private readonly repository: ITwoFactorRepository) { }

    /**
     * Retrieves the current 2FA status for a user.
     */
    public async execute(userId: string): Promise<TwoFactorStatusResponseDTO | null> {
        const config = await this.repository.findByUserId(userId);

        if (!config) {
            return null;
        }

        return {
            isEnabled: config.isEnabled,
            isVerified: config.isVerified,
            method: config.method,
            deviceName: config.deviceName,
            backupCodesCount: config.backupCodes.length,
            lastUsedAt: config.lastUsedAt
        };
    }
}
