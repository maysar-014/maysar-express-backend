import { PaymentProcessingSaga } from '../payment-processing.saga';
import { EventIdempotency } from '@shared/middleware/idempotency';

const mockRepo = { findById: jest.fn(), update: jest.fn() } as any;
const mockPaymentRepo = { findById: jest.fn(), update: jest.fn() } as any;
const mockProviderFactory = { getProvider: jest.fn() } as any;
const mockFraudEngine = { assessTransaction: jest.fn() } as any;
const mockProcessingEngine = { selectPaymentProvider: jest.fn() } as any;
const mockOutbox = { publish: jest.fn() } as any;
const mockEventIdempotency = {
    isProcessed: jest.fn().mockResolvedValue(false),
    markProcessed: jest.fn().mockResolvedValue(undefined),
    withIdempotency: jest.fn().mockImplementation(
        (_eventId: string, _consumer: string, handler: () => Promise<any>) => handler()
    ),
} as unknown as EventIdempotency;

describe('PaymentProcessingSaga', () => {
    let saga: PaymentProcessingSaga;

    beforeEach(() => {
        jest.clearAllMocks();
        saga = new PaymentProcessingSaga(
            mockRepo,
            'payment-service',
            mockPaymentRepo,
            mockProviderFactory,
            mockFraudEngine,
            mockProcessingEngine,
            mockOutbox,
            mockEventIdempotency
        );
    });

    it('should execute happy path', async () => {
        const mockProvider = { processPayment: jest.fn().mockResolvedValue({ success: true, providerReference: 'ref-1' }) };
        mockProviderFactory.getProvider.mockReturnValue(mockProvider);
        mockFraudEngine.assessTransaction.mockResolvedValue({ recommendation: 'approve' });
        mockProcessingEngine.selectPaymentProvider.mockReturnValue('PESAPAL');
        mockRepo.findById.mockResolvedValue({ context: { paymentId: 'p1', orderId: 'o1', userId: 'u1', amount: 100, method: 'CARD', correlationId: 'c1', status: 'INITIATED' } });
        mockRepo.update.mockResolvedValue(undefined);

        await saga.execute({ paymentId: 'p1', orderId: 'o1', userId: 'u1', amount: 100, currency: 'TZS', method: 'CARD' });
    });

    it('should compensate on failure', async () => {
        const mockProvider = { processPayment: jest.fn().mockRejectedValue(new Error('Provider error')) };
        mockProviderFactory.getProvider.mockReturnValue(mockProvider);
        mockFraudEngine.assessTransaction.mockResolvedValue({ recommendation: 'approve' });
        mockProcessingEngine.selectPaymentProvider.mockReturnValue('PESAPAL');
        mockRepo.findById.mockResolvedValue({ context: { paymentId: 'p1', orderId: 'o1', userId: 'u1', amount: 100, method: 'CARD', correlationId: 'c1', status: 'INITIATED' } });
        mockRepo.update.mockResolvedValue(undefined);

        await expect(saga.execute({ paymentId: 'p1', orderId: 'o1', userId: 'u1', amount: 100, currency: 'TZS', method: 'CARD' })).rejects.toThrow();
    });

    it('should handle idempotency via EventIdempotency', async () => {
        saga.completeStep = jest.fn();
        await saga.handleWalletPaymentProcessed('saga-1');

        expect(mockEventIdempotency.withIdempotency).toHaveBeenCalledWith(
            'saga-1',
            'PaymentProcessingSaga.WalletPaymentProcessed',
            expect.any(Function)
        );
        expect(saga.completeStep).toHaveBeenCalledWith('saga-1', 'ProcessPayment');
    });

    it('should skip handler when event already processed', async () => {
        saga.completeStep = jest.fn();
        (mockEventIdempotency.withIdempotency as jest.Mock).mockResolvedValueOnce(null);

        const result = await saga.handleWalletPaymentProcessed('saga-1');

        expect(result).toBeNull();
        expect(saga.completeStep).not.toHaveBeenCalled();
    });
});

