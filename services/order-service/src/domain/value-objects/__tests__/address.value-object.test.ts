import { Address } from '../address.value-object';

describe('Address Value Object', () => {
    describe('Creation', () => {
        it('should create valid named address', () => {
            const address = new Address('St', 'City', 'Code', 'Country');
            expect(address.street).toBe('St');
            expect(address.city).toBe('City');
        });

        it('should throw error if required field missing', () => {
            expect(() => new Address('', 'City', 'Code', 'Country')).toThrow('required');
        });

        it('should create address with valid geocodes', () => {
            const address = new Address('St', 'City', 'Code', 'Country', -6.0, 39.0);
            expect(address.latitude).toBe(-6.0);
            expect(address.longitude).toBe(39.0);
            expect(address.hasGeocode()).toBe(true);
        });

        it('should throw error if only lat provided', () => {
            expect(() => new Address('St', 'City', 'Code', 'Country', -6.0)).toThrow('must be provided together');
        });

        it('should throw error for invalid latitude', () => {
            expect(() => new Address('St', 'City', 'Code', 'Country', -91, 0)).toThrow('Latitude must be between -90 and 90');
        });

        it('should throw error for invalid longitude', () => {
            expect(() => new Address('St', 'City', 'Code', 'Country', 0, 181)).toThrow('Longitude must be between -180 and 180');
        });
    });

    describe('Equality', () => {
        it('should match identical addresses', () => {
            const a1 = new Address('A', 'B', 'C', 'D', 1, 1);
            const a2 = new Address('A', 'B', 'C', 'D', 1, 1);
            expect(a1.equals(a2)).toBe(true);
        });

        it('should not match different addresses', () => {
            const a1 = new Address('A', 'B', 'C', 'D');
            const a2 = new Address('A', 'B', 'C', 'E');
            expect(a1.equals(a2)).toBe(false);
        });
    });
});
