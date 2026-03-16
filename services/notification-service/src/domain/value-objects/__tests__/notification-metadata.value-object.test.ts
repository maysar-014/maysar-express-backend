import { NotificationMetadata } from '../notification-metadata.value-object';

describe('NotificationMetadata', () => {
    it('should create metadata and read values', () => {
        const metadata = NotificationMetadata.create({
            priority: 'high',
            urgent: true,
            orderId: '123'
        });

        expect(metadata.get('priority')).toBe('high');
        expect(metadata.get('urgent')).toBe(true);
        expect(metadata.get('orderId')).toBe('123');
    });

    it('should merge metadata', () => {
        const metadata = NotificationMetadata.create({ a: '1' });
        const merged = metadata.merge({ b: 2 });

        expect(merged.toObject()).toEqual({ a: '1', b: 2 });
    });
});
