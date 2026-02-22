import { ProductionPlanSaga } from '../ProductionPlanSaga';

const mockRepo = { create: jest.fn(), update: jest.fn() } as any;
const mockEventBus = { publish: jest.fn() } as any;

describe('ProductionPlanSaga', () => {
    let saga: ProductionPlanSaga;

    beforeEach(() => {
        jest.clearAllMocks();
        saga = new ProductionPlanSaga(mockRepo, mockEventBus);
    });

    it('should execute happy path', async () => {
        await saga.execute({ orderId: 'o1' });
        expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should compensate on failure', async () => {
        mockRepo.create.mockRejectedValue(new Error('Failed'));
        await expect(saga.execute({ orderId: 'o1' })).rejects.toThrow();
    });
});
