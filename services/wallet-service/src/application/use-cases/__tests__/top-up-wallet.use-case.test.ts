import { TopUpWalletUseCase } from '../top-up-wallet.use-case';

const mockPaymentClient = {
    createPayment: jest.fn()
};

describe('TopUpWalletUseCase', () => {
    let useCase: TopUpWalletUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new TopUpWalletUseCase(mockPaymentClient as any);
    });

    const validDto = {
        userId: 'u1',
        userRole: 'BUYER',
        amount: 1000,
        currency: 'TZS',
        method: 'MOBILE_MONEY',
        auditInfo: {
            actor: 'u1',
            actorType: 'USER',
            action: 'TOPUP',
            ipAddress: '1.1.1.1',
            userAgent: 'test'
        } as any
    };

    it('should initiate top up for eligible role', async () => {
        mockPaymentClient.createPayment.mockResolvedValue({
            success: true,
            data: { paymentId: 'p1', status: 'PENDING' },
            message: 'Initiated'
        });

        const result = await useCase.execute(validDto);

        expect(result.success).toBe(true);
        expect(result.paymentId).toBe('p1');
        expect(mockPaymentClient.createPayment).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'u1',
            amount: 1000
        }));
    });

    it('should fail for ineligible role', async () => {
        const result = await useCase.execute({
            ...validDto,
            userRole: 'ADMIN'
        });

        expect(result.success).toBe(false);
        expect(result.message).toContain('not eligible');
        expect(mockPaymentClient.createPayment).not.toHaveBeenCalled();
    });

    it('should handle payment service failure', async () => {
        mockPaymentClient.createPayment.mockRejectedValue(new Error('Connection failed'));

        const result = await useCase.execute(validDto);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Connection failed');
    });

    it('should handle different payment methods', async () => {
        const methods = ['MOBILE_MONEY', 'CARD', 'BANK_TRANSFER'];
        for (const method of methods) {
            jest.clearAllMocks();
            mockPaymentClient.createPayment.mockResolvedValue({ success: true, data: { paymentId: 'p1' } });
            await useCase.execute({ ...validDto, method });
            expect(mockPaymentClient.createPayment).toHaveBeenCalled();
        }
    });

    it('should handle different amounts', async () => {
        const amounts = [100, 1000, 10000, 100000];
        for (const amount of amounts) {
            jest.clearAllMocks();
            mockPaymentClient.createPayment.mockResolvedValue({ success: true, data: { paymentId: 'p1' } });
            await useCase.execute({ ...validDto, amount });
            expect(mockPaymentClient.createPayment).toHaveBeenCalledWith(expect.objectContaining({ amount }));
        }
    });

    it('should handle different currencies', async () => {
        const currencies = ['TZS', 'USD', 'KES'];
        for (const currency of currencies) {
            jest.clearAllMocks();
            mockPaymentClient.createPayment.mockResolvedValue({ success: true, data: { paymentId: 'p1' } });
            await useCase.execute({ ...validDto, currency });
            expect(mockPaymentClient.createPayment).toHaveBeenCalledWith(expect.objectContaining({ currency }));
        }
    });
});
