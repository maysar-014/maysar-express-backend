import { SetupTwoFactorUseCase } from '../setup-two-factor.use-case';

describe('SetupTwoFactorUseCase', () => {
    let useCase: SetupTwoFactorUseCase;
    let mockRepository: any;
    let mockQRCodeService: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRepository = { findByUserId: jest.fn().mockResolvedValue(null), save: jest.fn() };
        mockQRCodeService = { generateDataURL: jest.fn().mockResolvedValue('data:image/png;base64,abc') };
        useCase = new SetupTwoFactorUseCase(mockRepository, mockQRCodeService);
    });

    it('should setup 2FA successfully', async () => {
        const result = await useCase.execute('user-1', 'user@example.com', { method: 'totp', deviceName: 'iPhone' });
        expect(result.secret).toBeDefined();
        expect(result.qrCodeDataUrl).toBeDefined();
        expect(result.backupCodes).toHaveLength(10);
        expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should fail if 2FA already enabled', async () => {
        mockRepository.findByUserId.mockResolvedValue({ isEnabled: true });
        await expect(useCase.execute('user-1', 'user@example.com', { method: 'totp' })).rejects.toThrow('already enabled');
    });

    it('should generate QR code', async () => {
        await useCase.execute('user-1', 'user@example.com', { method: 'totp' });
        expect(mockQRCodeService.generateDataURL).toHaveBeenCalled();
    });

    it('should generate 10 backup codes', async () => {
        const result = await useCase.execute('user-1', 'user@example.com', { method: 'totp' });
        expect(result.backupCodes).toHaveLength(10);
    });

    it('should handle different device names', async () => {
        const devices = ['iPhone', 'Android', 'Desktop'];
        for (const deviceName of devices) {
            jest.clearAllMocks();
            await useCase.execute('user-1', 'user@example.com', { method: 'totp', deviceName });
            expect(mockRepository.save).toHaveBeenCalled();
        }
    });

    it('should save config as not enabled initially', async () => {
        await useCase.execute('user-1', 'user@example.com', { method: 'totp' });
        expect(mockRepository.save).toHaveBeenCalledWith(expect.objectContaining({ isEnabled: false }));
    });
});
