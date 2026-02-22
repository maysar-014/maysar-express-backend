import { NotificationPreference } from '../notification-preference.entity';

describe('NotificationPreference', () => {
    it('should create preference', () => {
        const pref = NotificationPreference.create({
            id: 'p1',
            userId: 'u1',
            channel: 'email',
            enabled: true
        });

        expect(pref.getId()).toBe('p1');
        expect(pref.isEnabled()).toBe(true);
    });

    it('should toggle preference', () => {
        const pref = NotificationPreference.create({
            id: 'p1',
            userId: 'u1',
            channel: 'email',
            enabled: true
        });

        pref.disable();
        expect(pref.isEnabled()).toBe(false);

        pref.enable();
        expect(pref.isEnabled()).toBe(true);
    });
});
