import { VerifyBusinessUseCase } from '../verify-business.use-case';

const mockRepository = { findById: jest.fn(), update: jest.fn() } as any;
const mockEventBus = { publish: jest.fn() } as any;

describe('VerifyBusinessUseCase', () => {
    let useCase: VerifyBusinessUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new VerifyBusinessUseCase(mockRepository, mockEventBus);
    });

    it('should verify business successfully', async () => {
        mockRepository.findById.mockResolvedValue({ 
            id: 'business-1', 
            verified: false,
            status: 'PENDING'
        });
        
        const result = await useCase.execute({ businessId: 'business-1', verifiedBy: 'admin-1' });
        expect(result.verified).toBe(true);
        expect(mockRepository.update).toHaveBeenCalled();
        expect(mockEventBus.publish).toHaveBeenCalledWith('BusinessVerified.v1', expect.any(Object));
    });

    it('should fail if already verified', async () => {
        mockRepository.findById.mockResolvedValue({ 
            id: 'business-1', 
            verified: true
        });
        
        await expect(useCase.execute({ businessId: 'business-1', verifiedBy: 'admin-1' }))
            .rejects.toThrow('Business already verified');
    });
});
