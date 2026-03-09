import { Alert, AlertProperties } from '../Alert.entity';

const baseProps: AlertProperties = {
    id: 'a1',
    type: 'threshold',
    severity: 'high',
    message: 'Threshold exceeded',
    metric: 'revenue',
    value: 1000,
    threshold: 900,
    timestamp: new Date('2026-01-01T00:00:00.000Z'),
    actions: ['notify_admin']
};

describe('Alert', () => {
    it('exposes immutable properties', () => {
        const alert = new Alert(baseProps);

        expect(alert.id).toBe('a1');
        expect(alert.type).toBe('threshold');
        expect(alert.severity).toBe('high');
        expect(alert.message).toBe('Threshold exceeded');
        expect(alert.metric).toBe('revenue');
        expect(alert.value).toBe(1000);
        expect(alert.threshold).toBe(900);
    });

    it('defensively copies mutable values', () => {
        const alert = new Alert(baseProps);
        const actions = alert.actions;
        actions.push('tamper');

        const timestamp = alert.timestamp;
        timestamp.setUTCFullYear(2030);

        expect(alert.actions).toEqual(['notify_admin']);
        expect(alert.timestamp.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    });

    it('serializes to JSON output', () => {
        const alert = new Alert(baseProps);
        expect(alert.toJSON()).toEqual({
            id: 'a1',
            type: 'threshold',
            severity: 'high',
            message: 'Threshold exceeded',
            metric: 'revenue',
            value: 1000,
            threshold: 900,
            timestamp: '2026-01-01T00:00:00.000Z',
            actions: ['notify_admin']
        });
    });
});
