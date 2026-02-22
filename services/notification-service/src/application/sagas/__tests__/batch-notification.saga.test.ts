import { BatchNotificationSaga } from '../batch-notification.saga';

const mockRepository = { findMany: jest.fn(), updateMany: jest.fn() } as any;
const mockProvider = { sendBatch: jest.fn() } as any;

describe('BatchNotificationSaga', () => {
    let saga: BatchNotificationSaga;

    beforeEach(() => {
        jest.clearAllMocks();
        saga = new BatchNotificationSaga(mockRepository, mockProvider);
    });

    it('should process batch successfully', async () => {
        mockRepository.findMany.mockResolvedValue([{ id: 'n1' }, { id: 'n2' }]);
        mockProvider.sendBatch.mockResolvedValue({ success: true });

        await saga.execute({ batchId: 'b1' });

        expect(mockProvider.sendBatch).toHaveBeenCalled();
    });
});
