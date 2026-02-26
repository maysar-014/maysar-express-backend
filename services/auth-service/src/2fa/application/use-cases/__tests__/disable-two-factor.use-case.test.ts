import { DisableTwoFactorUseCase } from '../disable-two-factor.use-case';
import { VerifyTwoFactorLoginUseCase } from '../verify-two-factor-login.use-case';
import { VerifyBackupCodeUseCase } from '../verify-backup-code.use-case';
import { RegenerateBackupCodesUseCase } from '../regenerate-backup-codes.use-case';
import { GetTwoFactorStatusUseCase } from '../get-two-factor-status.use-case';
import { TotpEngine } from '../../domain/engines/totp.engine';
import { BackupCodeEngine } from '../../domain/engines/backup-code.engine';

describe('DisableTwoFactorUseCase', () => {
    let useCase: DisableTwoFactorUseCase;
    let mockRepository: { findByUserId: jest.Mock; save: jest.Mock };
    const mockConfig = { isEnabled: true, secret: 'secret', backupCodes: ['hash1'], disable: jest.fn(), useBackupCode: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        mockRepository = { findByUserId: jest.fn().mockResolvedValue(mockConfig), save: jest.fn() };
        useCase = new DisableTwoFactorUseCase(mockRepository);
    });

    it('should disable with valid TOTP code', async () => {
        jest.spyOn(TotpEngine, 'verifyCode').mockReturnValue(true);
        const result = await useCase.execute('user-1', '123456');
        expect(result).toBe(true);
        expect(mockConfig.disable).toHaveBeenCalled();
    });

    it('should disable with valid backup code', async () => {
        jest.spyOn(TotpEngine, 'verifyCode').mockReturnValue(false);
        jest.spyOn(BackupCodeEngine, 'verifyCode').mockResolvedValue(true);
        const result = await useCase.execute('user-1', 'backup123');
        expect(result).toBe(true);
    });

    it('should fail with invalid code', async () => {
        jest.spyOn(TotpEngine, 'verifyCode').mockReturnValue(false);
        jest.spyOn(BackupCodeEngine, 'verifyCode').mockResolvedValue(false);
        const result = await useCase.execute('user-1', 'invalid');
        expect(result).toBe(false);
    });

    it('should return false when 2FA not enabled', async () => {
        mockRepository.findByUserId.mockResolvedValue({ isEnabled: false });
        const result = await useCase.execute('user-1', '123456');
        expect(result).toBe(false);
    });
});

describe('VerifyTwoFactorLoginUseCase', () => {
    let useCase: VerifyTwoFactorLoginUseCase;
    let mockRepository: { findByUserId: jest.Mock; save: jest.Mock };
    const mockConfig = { isEnabled: true, secret: 'secret', markAsUsed: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        mockRepository = { findByUserId: jest.fn().mockResolvedValue(mockConfig), save: jest.fn() };
        useCase = new VerifyTwoFactorLoginUseCase(mockRepository);
    });

    it('should verify valid login code', async () => {
        jest.spyOn(TotpEngine, 'verifyCode').mockReturnValue(true);
        const result = await useCase.execute('user-1', '123456');
        expect(result).toBe(true);
        expect(mockConfig.markAsUsed).toHaveBeenCalled();
    });

    it('should fail with invalid code', async () => {
        jest.spyOn(TotpEngine, 'verifyCode').mockReturnValue(false);
        const result = await useCase.execute('user-1', '000000');
        expect(result).toBe(false);
    });

    it('should return false when 2FA not enabled', async () => {
        mockRepository.findByUserId.mockResolvedValue({ isEnabled: false });
        const result = await useCase.execute('user-1', '123456');
        expect(result).toBe(false);
    });
});

describe('VerifyBackupCodeUseCase', () => {
    let useCase: VerifyBackupCodeUseCase;
    let mockRepository: { findByUserId: jest.Mock; save: jest.Mock };
    const mockConfig = { isEnabled: true, backupCodes: ['hash1', 'hash2'], useBackupCode: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        mockRepository = { findByUserId: jest.fn().mockResolvedValue(mockConfig), save: jest.fn() };
        useCase = new VerifyBackupCodeUseCase(mockRepository);
    });

    it('should verify valid backup code', async () => {
        jest.spyOn(BackupCodeEngine, 'verifyCode').mockResolvedValue(true);
        const result = await useCase.execute('user-1', 'backup123');
        expect(result).toBe(true);
        expect(mockConfig.useBackupCode).toHaveBeenCalled();
    });

    it('should fail with invalid backup code', async () => {
        jest.spyOn(BackupCodeEngine, 'verifyCode').mockResolvedValue(false);
        const result = await useCase.execute('user-1', 'invalid');
        expect(result).toBe(false);
    });

    it('should return false when 2FA not enabled', async () => {
        mockRepository.findByUserId.mockResolvedValue({ isEnabled: false });
        const result = await useCase.execute('user-1', 'backup123');
        expect(result).toBe(false);
    });
});

describe('RegenerateBackupCodesUseCase', () => {
    let useCase: RegenerateBackupCodesUseCase;
    let mockRepository: { findByUserId: jest.Mock; save: jest.Mock };
    const mockConfig = { isEnabled: true, regenerateBackupCodes: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        mockRepository = { findByUserId: jest.fn().mockResolvedValue(mockConfig), save: jest.fn() };
        useCase = new RegenerateBackupCodesUseCase(mockRepository);
    });

    it('should regenerate backup codes', async () => {
        const result = await useCase.execute('user-1');
        expect(result).toHaveLength(10);
        expect(mockConfig.regenerateBackupCodes).toHaveBeenCalled();
    });

    it('should fail when 2FA not enabled', async () => {
        mockRepository.findByUserId.mockResolvedValue({ isEnabled: false });
        await expect(useCase.execute('user-1')).rejects.toThrow('must be enabled');
    });

    it('should fail when config not found', async () => {
        mockRepository.findByUserId.mockResolvedValue(null);
        await expect(useCase.execute('user-1')).rejects.toThrow('must be enabled');
    });
});

describe('GetTwoFactorStatusUseCase', () => {
    let useCase: GetTwoFactorStatusUseCase;
    let mockRepository: { findByUserId: jest.Mock };

    beforeEach(() => {
        jest.clearAllMocks();
        mockRepository = { findByUserId: jest.fn() };
        useCase = new GetTwoFactorStatusUseCase(mockRepository);
    });

    it('should return status when config exists', async () => {
        mockRepository.findByUserId.mockResolvedValue({
            isEnabled: true,
            isVerified: true,
            method: 'TOTP',
            deviceName: 'iPhone',
            backupCodes: ['hash1', 'hash2'],
            lastUsedAt: new Date(),
        });
        const result = await useCase.execute('user-1');
        expect(result).toBeDefined();
        expect(result?.isEnabled).toBe(true);
        expect(result?.backupCodesCount).toBe(2);
    });

    it('should return null when config not found', async () => {
        mockRepository.findByUserId.mockResolvedValue(null);
        const result = await useCase.execute('user-1');
        expect(result).toBeNull();
    });
});
