import { NotificationContent } from '../notification-content.value-object';

describe('NotificationContent', () => {
    it('should create content', () => {
        const content = NotificationContent.create('Test body');
        expect(content.getPlainText()).toBe('Test body');
        expect(content.getValue()).toBe('Test body');
    });

    it('should allow optional html', () => {
        const content = NotificationContent.create('Plain', '<p>Plain</p>');
        expect(content.getHtml()).toBe('<p>Plain</p>');
    });

    it('should validate content length', () => {
        expect(() => NotificationContent.create('')).toThrow('Notification content is required');
    });
});
