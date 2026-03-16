import { NotificationPreference } from '../notification-preference.entity';

describe('NotificationPreference', () => {
    it('should create preference', () => {
        const pref = NotificationPreference.create({
            id: 'p1',
            userId: 'u1',
            channel: 'email',
            enabled: true
        });

        expect(pref.id).toBe('p1');
        expect(pref.enabled).toBe(true);
    });

    it('should update preference', () => {
        const pref = NotificationPreference.create({
            id: 'p1',
            userId: 'u1',
            channel: 'email',
            enabled: true
        });

        const updated = pref.updatePreference({ enabled: false });
        expect(updated.enabled).toBe(false);
    });
});
