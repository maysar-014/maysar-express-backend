import { AlertPolicy } from '../AlertPolicy';

describe('AlertPolicy', () => {
    let policy: AlertPolicy;

    beforeEach(() => {
        policy = new AlertPolicy();
    });

    it('should trigger alert on threshold breach', () => {
        const result = policy.shouldTrigger({ value: 100, threshold: 80 });
        expect(result).toBe(true);
    });

    it('should not trigger below threshold', () => {
        const result = policy.shouldTrigger({ value: 50, threshold: 80 });
        expect(result).toBe(false);
    });
});
