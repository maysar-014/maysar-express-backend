import { VerifyTwoFactorSetupUseCase } from '../verify-two-factor-setup.use-case';
import { TotpEngine } from '../../domain/engines/totp.engine';

describe('VerifyTwoFactorSetupUseCase', () => {
    let useCase: VerifyTwoFactorSetupUseCase;
    let mockRepository: { findByUserId: jest.Mock; save: jest.Mock };

    const mockConfig = {
        secret: 'secret123',
        isEnabled: false,
        isVerified: false,
        verify: jest.fn(),
        enable: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockRepository = { findByUserId: jest.fn().mockResolvedValue(mockConfig), save: jest.fn() };
        useCase = new VerifyTwoFactorSetupUseCase(mockRepository);
    });

    it('should verify setup successfully with valid code', async () => {
        jest.spyOn(TotpEngine, 'verifyCode').mockReturnValue(true);
        const result = await useCase.execute('user-1', '123456');
        expect(result.success).toBe(true);
        expect(mockConfig.verify).toHaveBeenCalled();
        expect(mockConfig.enable).toHaveBeenCalled();
    });

    it('should fail with invalid code', async () => {
        jest.spyOn(TotpEngine, 'verifyCode').mockReturnValue(false);
        const result = await useCase.execute('user-1', '000000');
        expect(result.success).toBe(false);
    });

    it('should fail when config not found', async () => {
        mockRepository.findByUserId.mockResolvedValue(null);
        await expect(useCase.execute('user-1', '123456')).rejects.toThrow('not found');
    });

    it('should handle already verified config', async () => {
        mockRepository.findByUserId.mockResolvedValue({ ...mockConfig, isEnabled: true, isVerified: true });
        const result = await useCase.execute('user-1', '123456');
        expect(result.success).toBe(true);
        expect(result.message).toContain('already enabled');
    });

    it('should save config after verification', async () => {
        jest.spyOn(TotpEngine, 'verifyCode').mockReturnValue(true);
        await useCase.execute('user-1', '123456');
        expect(mockRepository.save).toHaveBeenCalled();
    });
});
