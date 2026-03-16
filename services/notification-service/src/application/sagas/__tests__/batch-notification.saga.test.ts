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

import { executeBatchNotificationSaga } from '../batch-notification.saga';
import { Notification } from '../../../domain/entities/notification.entity';
import { NotificationContent } from '../../../domain/value-objects/notification-content.value-object';

describe('BatchNotificationSaga', () => {
    it('should process batch successfully', async () => {
        const notifications = [
            Notification.create({
                id: 'n1',
                userId: 'u1',
                type: 'email',
                channel: 'email',
                subject: 'Test',
                content: NotificationContent.create('Test')
            }),
            Notification.create({
                id: 'n2',
                userId: 'u1',
                type: 'email',
                channel: 'email',
                subject: 'Test',
                content: NotificationContent.create('Test')
            })
        ];

        const processSingle = jest.fn().mockResolvedValue(undefined);

        await executeBatchNotificationSaga(notifications, processSingle);
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(processSingle).toHaveBeenCalledTimes(2);
    });
});
