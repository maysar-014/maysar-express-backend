import { Alert } from '../Alert.entity';

describe('Alert', () => {
    it('should create alert', () => {
        const alert = Alert.create({ id: 'a1', type: 'threshold', severity: 'high', message: 'Test' });
        expect(alert.getId()).toBe('a1');
    });

    it('should acknowledge alert', () => {
        const alert = Alert.create({ id: 'a1', type: 'threshold', severity: 'high', message: 'Test' });
        alert.acknowledge('u1');
        expect(alert.isAcknowledged()).toBe(true);
    });
});
