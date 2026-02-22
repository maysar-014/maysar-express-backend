import { AnalyticsEvent } from '../AnalyticsEvent.entity';

describe('AnalyticsEvent', () => {
    it('should create event', () => {
        const event = AnalyticsEvent.create({ id: 'e1', type: 'user_action', data: {} });
        expect(event.getId()).toBe('e1');
    });

    it('should get event data', () => {
        const event = AnalyticsEvent.create({ id: 'e1', type: 'user_action', data: { action: 'click' } });
        expect(event.getData()).toEqual({ action: 'click' });
    });
});
