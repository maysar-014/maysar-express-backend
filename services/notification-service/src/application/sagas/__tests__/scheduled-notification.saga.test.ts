const sagaLogRepositoryStub = {
    save: jest.fn().mockResolvedValue(undefined),
    saveStep: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    updateStep: jest.fn().mockResolvedValue(undefined),
    getById: jest.fn().mockResolvedValue({ sagaId: 's1', currentStep: 'START', payload: {} }),
    getSteps: jest.fn().mockResolvedValue([])
};

jest.mock('../../../infrastructure/repositories/saga.repository', () => ({
    sagaLogRepository: sagaLogRepositoryStub
}));

import { executeScheduledNotificationSaga } from '../scheduled-notification.saga';
import { Notification } from '../../../domain/entities/notification.entity';
import { NotificationContent } from '../../../domain/value-objects/notification-content.value-object';

describe('ScheduledNotificationSaga', () => {
    it('should trigger delivery for scheduled notifications', async () => {
        const notification = Notification.create({
            id: 'n1',
            userId: 'u1',
            type: 'email',
            channel: 'email',
            subject: 'Test',
            content: NotificationContent.create('Test content'),
            scheduledAt: new Date(Date.now() + 60 * 1000)
        });

        const triggerDelivery = jest.fn().mockResolvedValue(undefined);
        await executeScheduledNotificationSaga(notification, {} as any, triggerDelivery);

        expect(triggerDelivery).toHaveBeenCalledWith(notification);
    });
});
