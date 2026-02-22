import { PayoutProcessingSaga } from '../payout-processing.saga';

const mockRepository = { findById: jest.fn(), update: jest.fn() } as any;
const mockEventBus = { publish: jest.fn() } as any;
const mockProvider = { processPayout: jest.fn() } as any;

describe('PayoutProcessingSaga', () => {
    let saga: PayoutProcessingSaga;

    beforeEach(() => {
        jest.clearAllMocks();
        saga = new PayoutProcessingSaga(mockRepository, mockEventBus, mockProvider);
    });

    it('should process payout successfully', async () => {
        mockProvider.processPayout.mockResolvedValue({ success: true, id: 'prov-1' });

        await saga.execute({ payoutId: 'p1' });

        expect(mockProvider.processPayout).toHaveBeenCalled();
        expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should compensate on failure', async () => {
        mockProvider.processPayout.mockRejectedValue(new Error('Provider error'));

        await expect(saga.execute({ payoutId: 'p1' })).rejects.toThrow();
    });
});
