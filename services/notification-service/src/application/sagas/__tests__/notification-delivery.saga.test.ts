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

import { executeNotificationDeliverySaga } from '../notification-delivery.saga';
import { Notification } from '../../../domain/entities/notification.entity';
import { NotificationContent } from '../../../domain/value-objects/notification-content.value-object';
import { NotificationValidationService } from '../../../domain/services/notification-validation.service';

describe('NotificationDeliverySaga', () => {
    it('should trigger send via channel', async () => {
        const notification = Notification.create({
            id: 'n1',
            userId: 'u1',
            type: 'email',
            channel: 'email',
            subject: 'Test',
            content: NotificationContent.create('Test content')
        });

        const notificationRepository = { update: jest.fn().mockResolvedValue(notification) } as any;
        const preferenceRepository = { findByUserAndChannel: jest.fn().mockResolvedValue(null) } as any;
        const validationService = new NotificationValidationService();
        const sendViaChannel = jest.fn().mockResolvedValue(undefined);
        const recordMetrics = jest.fn().mockResolvedValue(undefined);

        await executeNotificationDeliverySaga(
            notification,
            notificationRepository,
            preferenceRepository,
            validationService,
            sendViaChannel,
            recordMetrics
        );
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(sendViaChannel).toHaveBeenCalledWith(notification);
    });
});
