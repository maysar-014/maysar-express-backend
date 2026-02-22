import { PaymentProcessingSaga } from '../payment-processing.saga';

const mockRepo = { findById: jest.fn(), update: jest.fn() } as any;
const mockEventBus = { publish: jest.fn() } as any;
const mockProvider = { process: jest.fn() } as any;

describe('PaymentProcessingSaga', () => {
    let saga: PaymentProcessingSaga;

    beforeEach(() => {
        jest.clearAllMocks();
        saga = new PaymentProcessingSaga(mockRepo, mockEventBus, mockProvider);
    });

    it('should execute happy path', async () => {
        mockProvider.process.mockResolvedValue({ success: true });
        await saga.execute({ paymentId: 'p1' });
        expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should compensate on failure', async () => {
        mockProvider.process.mockRejectedValue(new Error('Provider error'));
        await expect(saga.execute({ paymentId: 'p1' })).rejects.toThrow();
    });

    it('should handle idempotency', async () => {
        mockProvider.process.mockResolvedValue({ success: true, alreadyProcessed: true });
        await saga.execute({ paymentId: 'p1' });
        expect(mockEventBus.publish).toHaveBeenCalled();
    });
});
