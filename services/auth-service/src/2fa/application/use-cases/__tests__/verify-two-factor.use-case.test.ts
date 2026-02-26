import { VerifyTwoFactorUseCase } from '../verify-two-factor.use-case';

const mockRepository = { findById: jest.fn() } as any;
const mockTotpService = { verify: jest.fn() } as any;

describe('VerifyTwoFactorUseCase', () => {
    let useCase: VerifyTwoFactorUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new VerifyTwoFactorUseCase(mockRepository, mockTotpService);
    });

    it('should verify code successfully', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'user-1', twoFactorSecret: 'secret123' });
        mockTotpService.verify.mockReturnValue(true);
        
        const result = await useCase.execute({ userId: 'user-1', code: '123456' });
        expect(result.valid).toBe(true);
    });

    it('should fail with invalid code', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'user-1', twoFactorSecret: 'secret123' });
        mockTotpService.verify.mockReturnValue(false);
        
        const result = await useCase.execute({ userId: 'user-1', code: '000000' });
        expect(result.valid).toBe(false);
    });
});
