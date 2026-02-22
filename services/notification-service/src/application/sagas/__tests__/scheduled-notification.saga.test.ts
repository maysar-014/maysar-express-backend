import { ScheduledNotificationSaga } from '../scheduled-notification.saga';

const mockRepository = { findScheduled: jest.fn(), update: jest.fn() } as any;
const mockProvider = { send: jest.fn() } as any;

describe('ScheduledNotificationSaga', () => {
    let saga: ScheduledNotificationSaga;

    beforeEach(() => {
        jest.clearAllMocks();
        saga = new ScheduledNotificationSaga(mockRepository, mockProvider);
    });

    it('should process scheduled notifications', async () => {
        mockRepository.findScheduled.mockResolvedValue([{ id: 'n1', scheduledAt: new Date() }]);
        mockProvider.send.mockResolvedValue({ success: true });

        await saga.execute();

        expect(mockProvider.send).toHaveBeenCalled();
    });
});
