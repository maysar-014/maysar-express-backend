import { NotificationMetadata } from '../notification-metadata.value-object';

describe('NotificationMetadata', () => {
    it('should create metadata', () => {
        const metadata = NotificationMetadata.create({
            priority: 'high',
            tags: ['urgent'],
            customData: { orderId: '123' }
        });

        expect(metadata.getPriority()).toBe('high');
        expect(metadata.getTags()).toContain('urgent');
    });

    it('should get custom data', () => {
        const metadata = NotificationMetadata.create({
            priority: 'normal',
            customData: { key: 'value' }
        });

        expect(metadata.getCustomData()).toEqual({ key: 'value' });
    });
});
