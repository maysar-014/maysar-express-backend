import { NotificationDeliverySaga } from '../notification-delivery.saga';

const mockRepository = { findById: jest.fn(), update: jest.fn() } as any;
const mockProvider = { send: jest.fn() } as any;
const mockEventBus = { publish: jest.fn() } as any;

describe('NotificationDeliverySaga', () => {
    let saga: NotificationDeliverySaga;

    beforeEach(() => {
        jest.clearAllMocks();
        saga = new NotificationDeliverySaga(mockRepository, mockProvider, mockEventBus);
    });

    it('should deliver notification successfully', async () => {
        mockProvider.send.mockResolvedValue({ success: true });

        await saga.execute({ notificationId: 'n1' });

        expect(mockProvider.send).toHaveBeenCalled();
        expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should compensate on failure', async () => {
        mockProvider.send.mockRejectedValue(new Error('Provider error'));

        await expect(saga.execute({ notificationId: 'n1' })).rejects.toThrow();
    });
});
