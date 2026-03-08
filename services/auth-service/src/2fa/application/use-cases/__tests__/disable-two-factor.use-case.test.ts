import { DisableTwoFactorUseCase } from '../disable-two-factor.use-case';
import { TotpEngine } from '../../../domain/engines/totp.engine';
import { BackupCodeEngine } from '../../../domain/engines/backup-code.engine';
import { ITwoFactorRepository } from '../../../domain/repositories/two-factor.repository';

describe('DisableTwoFactorUseCase', () => {
    let useCase: DisableTwoFactorUseCase;
    let mockRepository: jest.Mocked<ITwoFactorRepository>;
    const mockConfig = {
        isEnabled: true,
        secret: 'secret',
        backupCodes: ['hash1'],
        disable: jest.fn(),
        useBackupCode: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockRepository = {
            findByUserId: jest.fn().mockResolvedValue(mockConfig as unknown as never),
            save: jest.fn(),
            deleteByUserId: jest.fn(),
            updateBackupCodes: jest.fn(),
            markBackupCodeAsUsed: jest.fn(),
        };
        useCase = new DisableTwoFactorUseCase(mockRepository);
    });

    it('disables 2FA with a valid TOTP code', async () => {
        jest.spyOn(TotpEngine, 'verifyCode').mockReturnValue(true);

        const result = await useCase.execute('user-1', '123456');

        expect(result).toBe(true);
        expect(mockConfig.disable).toHaveBeenCalled();
        expect(mockRepository.save).toHaveBeenCalled();
    });

    it('disables 2FA with a valid backup code', async () => {
        jest.spyOn(TotpEngine, 'verifyCode').mockReturnValue(false);
        jest.spyOn(BackupCodeEngine, 'verifyCode').mockResolvedValue(true);

        const result = await useCase.execute('user-1', 'backup123');

        expect(result).toBe(true);
        expect(mockConfig.useBackupCode).toHaveBeenCalled();
    });

    it('returns false when user has no enabled 2FA config', async () => {
        mockRepository.findByUserId.mockResolvedValue(null);

        const result = await useCase.execute('user-1', '123456');

        expect(result).toBe(false);
        expect(mockRepository.save).not.toHaveBeenCalled();
    });
});
