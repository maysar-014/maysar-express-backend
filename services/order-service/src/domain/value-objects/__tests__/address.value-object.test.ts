import { Address } from '../address.value-object';

describe('Address Value Object', () => {
    describe('Creation', () => {
        it('should create valid named address with city', () => {
            const address = new Address('St', 'City', 'Code', 'Country');
            expect(address.street).toBe('St');
            expect(address.city).toBe('City');
        });

        it('should create valid Tanzania address with ward/district/region (no city)', () => {
            const address = new Address('Sea View', undefined, '11101', 'Tanzania', undefined, undefined, {
                ward: 'Kivukoni',
                district: 'Ilala Cbd',
                region: 'Dar es Salaam',
            });
            expect(address.street).toBe('Sea View');
            expect(address.ward).toBe('Kivukoni');
            expect(address.district).toBe('Ilala Cbd');
            expect(address.region).toBe('Dar es Salaam');
            expect(address.city).toBeUndefined();
        });

        it('should throw error if required field missing', () => {
            expect(() => new Address('', 'City', 'Code', 'Country')).toThrow('required');
            expect(() => new Address('St', 'City', '', 'Country')).toThrow('required');
            expect(() => new Address('St', 'City', 'Code', '')).toThrow('required');
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

        it('should match Tanzania addresses by ward/district/region', () => {
            const a1 = new Address('Sea View', undefined, '11101', 'Tanzania', undefined, undefined, {
                ward: 'Kivukoni', district: 'Ilala Cbd', region: 'Dar es Salaam',
            });
            const a2 = new Address('Sea View', undefined, '11101', 'Tanzania', undefined, undefined, {
                ward: 'Kivukoni', district: 'Ilala Cbd', region: 'Dar es Salaam',
            });
            expect(a1.equals(a2)).toBe(true);
        });
    });

    describe('toString', () => {
        it('should include ward/district/region in string output', () => {
            const address = new Address('Sea View', undefined, '11101', 'Tanzania', undefined, undefined, {
                ward: 'Kivukoni',
                district: 'Ilala Cbd',
                region: 'Dar es Salaam',
            });
            expect(address.toString()).toBe('Sea View, Kivukoni, Ilala Cbd, Dar es Salaam, 11101, Tanzania');
        });

        it('should produce city-based string for legacy addresses', () => {
            const address = new Address('123 Main St', 'Dar es Salaam', '11101', 'TZ');
            expect(address.toString()).toBe('123 Main St, Dar es Salaam, 11101, TZ');
        });
    });
});
