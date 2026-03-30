import { EnablerOnboardingSaga } from '../enabler-onboarding.saga';

const mockRegisterUseCase = { execute: jest.fn() } as any;
const mockApproveUseCase = { execute: jest.fn() } as any;
const mockVerificationService = { verifyBusiness: jest.fn() } as any;
const mockWalletService = { createWallet: jest.fn() } as any;
const mockNotificationService = { sendWelcomeEmail: jest.fn(), sendRejection: jest.fn() } as any;

describe('EnablerOnboardingSaga', () => {
    let saga: EnablerOnboardingSaga;

    beforeEach(() => {
        jest.clearAllMocks();
        saga = new EnablerOnboardingSaga(
            mockRegisterUseCase,
            mockApproveUseCase,
            mockVerificationService,
            mockWalletService,
            mockNotificationService
        );
    });

    it('should execute happy path', async () => {
        mockRegisterUseCase.execute.mockResolvedValue({
            id: 'e1',
            userId: 'user-1',
            tier: 'BRONZE'
        });
        mockVerificationService.verifyBusiness.mockResolvedValue({ isValid: true });
        mockApproveUseCase.execute.mockResolvedValue(undefined);
        mockWalletService.createWallet.mockResolvedValue(undefined);
        mockNotificationService.sendWelcomeEmail.mockResolvedValue(undefined);

        await saga.execute({ enablerId: 'e1', taxId: 'tax-1', businessLicense: 'lic-1' });

        expect(mockRegisterUseCase.execute).toHaveBeenCalled();
        expect(mockVerificationService.verifyBusiness).toHaveBeenCalledWith({
            taxId: 'tax-1',
            businessLicense: 'lic-1'
        });
        expect(mockApproveUseCase.execute).toHaveBeenCalledWith(
            'e1',
            'SYSTEM_AUTO_APPROVE',
            ['registration_submitted', 'business_verified']
        );
        expect(mockWalletService.createWallet).toHaveBeenCalledWith('user-1', 'ENABLER');
        expect(mockNotificationService.sendWelcomeEmail).toHaveBeenCalledWith('user-1');
    });

    it('should reject and notify when verification fails', async () => {
        mockRegisterUseCase.execute.mockResolvedValue({
            id: 'e1',
            userId: 'user-1',
            tier: 'BRONZE'
        });
        mockVerificationService.verifyBusiness.mockResolvedValue({ isValid: false, reason: 'invalid tax id' });

        await saga.execute({ enablerId: 'e1', taxId: 'tax-1', businessLicense: 'lic-1' });

        expect(mockNotificationService.sendRejection).toHaveBeenCalledWith('user-1', 'invalid tax id');
        expect(mockApproveUseCase.execute).not.toHaveBeenCalled();
        expect(mockWalletService.createWallet).not.toHaveBeenCalled();
    });
});
