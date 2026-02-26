import { EnableTwoFactorUseCase } from '../enable-two-factor.use-case';

const mockRepository = { findById: jest.fn(), update: jest.fn() } as any;
const mockTotpService = { generateSecret: jest.fn(), generateQRCode: jest.fn() } as any;

describe('EnableTwoFactorUseCase', () => {
    let useCase: EnableTwoFactorUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new EnableTwoFactorUseCase(mockRepository, mockTotpService);
    });

    it('should enable 2FA successfully', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'user-1', twoFactorEnabled: false });
        mockTotpService.generateSecret.mockReturnValue({ secret: 'secret123' });
        mockTotpService.generateQRCode.mockResolvedValue('qr-code-url');
        
        const result = await useCase.execute({ userId: 'user-1' });
        expect(result.qrCode).toBe('qr-code-url');
        expect(mockRepository.update).toHaveBeenCalled();
    });

    it('should fail if already enabled', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'user-1', twoFactorEnabled: true });
        await expect(useCase.execute({ userId: 'user-1' }))
            .rejects.toThrow('Two-factor already enabled');
    });
});
