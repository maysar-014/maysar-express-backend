import { InitiatePayoutFromWalletUseCase } from '../initiate-payout-from-wallet.use-case';
import { UserRole } from '../../../../../shared-contracts/user-service-contracts';

// Mocks
const mockDebitUseCase = { execute: jest.fn() };
const mockCreditUseCase = { execute: jest.fn() };
const mockPayoutClient = { initiatePayout: jest.fn() };
const mockEventPublisher = { publishWalletPayoutInitiated: jest.fn() };

describe('InitiatePayoutFromWalletUseCase', () => {
    let useCase: InitiatePayoutFromWalletUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        // @ts-ignore
        useCase = new InitiatePayoutFromWalletUseCase(
            mockDebitUseCase as any,
            mockCreditUseCase as any,
            mockPayoutClient as any,
            mockEventPublisher as any
        );
    });

    const validDto = {
        userId: 'u1',
        userRole: 'ENABLER',
        amount: 5000,
        currency: 'TZS',
        method: 'MOBILE_MONEY',
        idempotencyKey: 'key',
        correlationId: 'corr',
        auditInfo: {} as any
    };

    it('should successfully initiate payout', async () => {
        mockDebitUseCase.execute.mockResolvedValue({
            success: true,
            transactionId: 'tx-debit',
            balanceBefore: 10000,
            balanceAfter: 5000
        });
        mockPayoutClient.initiatePayout.mockResolvedValue({
            success: true,
            payoutId: 'pid-1'
        });

        const result = await useCase.execute(validDto as any);

        expect(result.success).toBe(true);
        expect(result.payoutId).toBe('pid-1');
        expect(mockDebitUseCase.execute).toHaveBeenCalled();
        expect(mockCreditUseCase.execute).not.toHaveBeenCalled();
    });

    it('should fail if role not eligible', async () => {
        const result = await useCase.execute({ ...validDto, userRole: 'BUYER' } as any);
        expect(result.success).toBe(false);
        expect(result.message).toContain('not eligible');
        expect(mockDebitUseCase.execute).not.toHaveBeenCalled();
    });

    it('should fail if debit fails', async () => {
        mockDebitUseCase.execute.mockResolvedValue({
            success: false,
            message: 'Insufficient funds'
        });

        const result = await useCase.execute(validDto as any);

        expect(result.success).toBe(false);
        expect(mockPayoutClient.initiatePayout).not.toHaveBeenCalled();
    });

    it('should compensate if payout service fails', async () => {
        mockDebitUseCase.execute.mockResolvedValue({
            success: true,
            transactionId: 'tx-debit',
            balanceBefore: 10000
        });
        mockPayoutClient.initiatePayout.mockResolvedValue({
            success: false,
            message: 'Provider error'
        });

        const result = await useCase.execute(validDto as any);

        expect(result.success).toBe(false);
        expect(result.message).toContain('payout service');
        expect(mockCreditUseCase.execute).toHaveBeenCalledWith(expect.objectContaining({
            amount: 5000,
            description: expect.stringContaining('Reversal')
        }));
    });

    it('should compensate on unexpected error', async () => {
        mockDebitUseCase.execute.mockResolvedValue({ success: true });
        mockPayoutClient.initiatePayout.mockRejectedValue(new Error('Crash'));

        const result = await useCase.execute(validDto as any);

        expect(result.success).toBe(false);
        expect(mockCreditUseCase.execute).toHaveBeenCalled();
    });

    it('should handle different payout methods', async () => {
        const methods = ['MOBILE_MONEY', 'BANK_TRANSFER', 'WALLET'];
        for (const method of methods) {
            jest.clearAllMocks();
            mockDebitUseCase.execute.mockResolvedValue({ success: true });
            mockPayoutClient.initiatePayout.mockResolvedValue({ success: true, payoutId: 'pid' });
            await useCase.execute({ ...validDto, method } as any);
            expect(mockPayoutClient.initiatePayout).toHaveBeenCalled();
        }
    });

    it('should handle different eligible roles', async () => {
        const roles = ['ENABLER', 'SELLER', 'COURIER'];
        for (const userRole of roles) {
            jest.clearAllMocks();
            mockDebitUseCase.execute.mockResolvedValue({ success: true });
            mockPayoutClient.initiatePayout.mockResolvedValue({ success: true, payoutId: 'pid' });
            await useCase.execute({ ...validDto, userRole } as any);
            expect(mockDebitUseCase.execute).toHaveBeenCalled();
        }
    });

    it('should publish event on success', async () => {
        mockDebitUseCase.execute.mockResolvedValue({ success: true });
        mockPayoutClient.initiatePayout.mockResolvedValue({ success: true, payoutId: 'pid' });
        await useCase.execute(validDto as any);
        expect(mockEventPublisher.publishWalletPayoutInitiated).toHaveBeenCalled();
    });
});
