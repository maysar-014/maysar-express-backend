import { NotificationValidationService } from '../notification-validation.service';

describe('NotificationValidationService', () => {
    let service: NotificationValidationService;

    beforeEach(() => {
        service = new NotificationValidationService();
    });

    it('should validate notification', () => {
        const result = service.validate({
            userId: 'u1',
            type: 'email',
            subject: 'Test',
            body: 'Test body'
        });

        expect(result.isValid).toBe(true);
    });

    it('should reject invalid notification', () => {
        const result = service.validate({
            userId: '',
            type: 'email',
            subject: '',
            body: ''
        });

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate email address', () => {
        expect(service.validateEmail('test@example.com')).toBe(true);
        expect(service.validateEmail('invalid')).toBe(false);
    });
});
