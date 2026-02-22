import { CapacityAdjustmentSaga } from '../CapacityAdjustmentSaga';

const mockRepo = { update: jest.fn() } as any;
const mockEventBus = { publish: jest.fn() } as any;

describe('CapacityAdjustmentSaga', () => {
    let saga: CapacityAdjustmentSaga;

    beforeEach(() => {
        jest.clearAllMocks();
        saga = new CapacityAdjustmentSaga(mockRepo, mockEventBus);
    });

    it('should execute happy path', async () => {
        await saga.execute({ adjustment: 10 });
        expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should compensate on failure', async () => {
        mockRepo.update.mockRejectedValue(new Error('Failed'));
        await expect(saga.execute({ adjustment: 10 })).rejects.toThrow();
    });
});
