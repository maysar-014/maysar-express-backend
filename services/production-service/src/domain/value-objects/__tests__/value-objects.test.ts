import { ProductionCapacity } from '../production-capacity.value-object';

describe('ProductionCapacity Value Object', () => {
    const createCapacity = (used = 20, reserved = 10) => new ProductionCapacity({
        maxCapacity: 100,
        usedCapacity: used,
        reservedCapacity: reserved,
        unit: 'units'
    });

    it('should calculate available capacity', () => {
        const cap = createCapacity();
        // 100 - (20 + 10) = 70
        expect(cap.availableCapacity).toBe(70);
    });

    it('should calculate utilization rate', () => {
        const cap = createCapacity(20, 30);
        // (20+30)/100 = 50%
        expect(cap.utilizationRate).toBe(50);
    });

    it('should check availability', () => {
        const cap = createCapacity(); // 70 avail
        expect(cap.isAvailable(50)).toBe(true);
        expect(cap.isAvailable(80)).toBe(false);
    });

    it('should allocate capacity', () => {
        const cap = createCapacity();
        const newCap = cap.allocate(30);
        expect(newCap.reservedCapacity).toBe(40); // 10 + 30
        expect(newCap.availableCapacity).toBe(40);
    });

    it('should throw on insufficient allocation', () => {
        const cap = createCapacity();
        expect(() => cap.allocate(80)).toThrow('Insufficient capacity');
    });

    it('should throw on invalid values', () => {
        expect(() => new ProductionCapacity({
            maxCapacity: 100,
            usedCapacity: 60,
            reservedCapacity: 50, // 110 > 100
            unit: 'u'
        })).toThrow('utilization cannot exceed max capacity');
    });
});
