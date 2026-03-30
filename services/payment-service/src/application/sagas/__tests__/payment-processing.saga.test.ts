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

    it('should complete wallet payment when idempotent event arrives', async () => {
        const completeStepSpy = jest.spyOn(saga as any, 'completeStep').mockResolvedValue(undefined);

        await saga.handleWalletPaymentProcessed('saga-1');

        expect(mockEventIdempotency.withIdempotency).toHaveBeenCalledWith(
            'saga-1',
            'PaymentProcessingSaga.WalletPaymentProcessed',
            expect.any(Function)
        );
        expect(completeStepSpy).toHaveBeenCalledWith('saga-1', 'ProcessPayment');
    });

    it('should publish failure and fail the process step when wallet payment fails', async () => {
        mockRepo.getById = jest.fn().mockResolvedValue({
            context: {
                paymentId: 'p1',
                orderId: 'o1',
                userId: 'u1',
                amount: 100,
                method: 'CARD',
                correlationId: 'c1',
                status: 'INITIATED'
            }
        });

        const publishSpy = jest.spyOn(saga as any, 'publishCommand').mockResolvedValue(undefined);
        const failStepSpy = jest.spyOn(saga as any, 'failStep').mockResolvedValue(undefined);

        await saga.handleWalletPaymentFailed('saga-1', 'Gateway error');

        expect(publishSpy).toHaveBeenCalledWith(
            'Payment.Failure.v1',
            expect.objectContaining({
                sagaId: 'saga-1',
                orderId: 'o1',
                paymentId: 'p1',
                error: 'Gateway error'
            }),
            'c1',
            'saga-1'
        );
        expect(failStepSpy).toHaveBeenCalledWith('saga-1', 'ProcessPayment', 'Gateway error');
    });
});

