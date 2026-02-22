import { CapacityAllocationPolicy } from '../CapacityAllocationPolicy';

describe('CapacityAllocationPolicy', () => {
    let policy: CapacityAllocationPolicy;

    beforeEach(() => {
        policy = new CapacityAllocationPolicy();
    });

    it('should allocate capacity', () => {
        const result = policy.allocate({ requested: 50, available: 100 });
        expect(result.allocated).toBe(50);
    });

    it('should reject over-allocation', () => {
        const result = policy.allocate({ requested: 150, available: 100 });
        expect(result.allocated).toBeLessThanOrEqual(100);
    });
});
