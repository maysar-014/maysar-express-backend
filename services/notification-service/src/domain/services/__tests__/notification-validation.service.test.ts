import { NotificationValidationService } from '../notification-validation.service';
import { Notification } from '../../entities/notification.entity';
import { NotificationContent } from '../../value-objects/notification-content.value-object';
import { DeliveryAddress } from '../../value-objects/delivery-address.value-object';

describe('NotificationValidationService', () => {
    let service: NotificationValidationService;

    beforeEach(() => {
        service = new NotificationValidationService();
    });

    it('should validate notification', () => {
        const notification = Notification.create({
            id: 'n1',
            userId: 'u1',
            type: 'email',
            channel: 'email',
            subject: 'Test',
            content: NotificationContent.create('Test body')
        });

        const result = service.validateNotification(notification);
        expect(result.isValid).toBe(true);
    });

    it('should reject invalid notification', () => {
        const notification = Notification.create({
            id: 'n1',
            userId: 'u1',
            type: 'email',
            channel: 'email',
            subject: '',
            content: NotificationContent.create('Test body')
        });

        const result = service.validateNotification(notification);
        expect(result.isValid).toBe(false);
    });

    it('should validate delivery address by channel', () => {
        const address = DeliveryAddress.create('test@example.com', 'email');
        const result = service.validateDeliveryAddress(address, 'email');
        expect(result.isValid).toBe(true);
    });
});
