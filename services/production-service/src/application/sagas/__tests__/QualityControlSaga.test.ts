import { QualityControlSaga } from '../QualityControlSaga';

const mockRepo = { findById: jest.fn(), update: jest.fn() } as any;
const mockEventBus = { publish: jest.fn() } as any;

describe('QualityControlSaga', () => {
    let saga: QualityControlSaga;

    beforeEach(() => {
        jest.clearAllMocks();
        saga = new QualityControlSaga(mockRepo, mockEventBus);
    });

    it('should execute happy path', async () => {
        await saga.execute({ productId: 'p1' });
        expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should compensate on failure', async () => {
        mockRepo.findById.mockRejectedValue(new Error('Failed'));
        await expect(saga.execute({ productId: 'p1' })).rejects.toThrow();
    });
});
