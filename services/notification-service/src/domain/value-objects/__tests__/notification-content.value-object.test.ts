import { NotificationContent } from '../notification-content.value-object';

describe('NotificationContent', () => {
    it('should create content', () => {
        const content = NotificationContent.create({
            subject: 'Test',
            body: 'Test body',
            type: 'text'
        });

        expect(content.getSubject()).toBe('Test');
        expect(content.getBody()).toBe('Test body');
    });

    it('should validate content length', () => {
        expect(() => NotificationContent.create({
            subject: '',
            body: 'Test',
            type: 'text'
        })).toThrow();
    });
});
