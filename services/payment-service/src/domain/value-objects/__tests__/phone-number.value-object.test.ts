import { PhoneNumber } from '../phone-number.value-object';

describe('PhoneNumber Value Object', () => {
    describe('Constructor & Parsing', () => {
        it('should create from international format (+255...)', () => {
            const phone = new PhoneNumber('+255754123456');
            expect(phone.countryCode).toBe('255');
            expect(phone.number).toBe('754123456');
        });

        it('should create from prefix format (255...)', () => {
            const phone = new PhoneNumber('255754123456');
            expect(phone.countryCode).toBe('255');
            expect(phone.number).toBe('754123456');
        });

        it('should create from local format (0...)', () => {
            const phone = new PhoneNumber('0754123456');
            expect(phone.countryCode).toBe('255');
            expect(phone.number).toBe('754123456');
        });

        it('should create from raw 9 digits', () => {
            const phone = new PhoneNumber('754123456');
            expect(phone.countryCode).toBe('255');
            expect(phone.number).toBe('754123456');
        });

        it('should throw error for empty phone number', () => {
            expect(() => new PhoneNumber('')).toThrow('Phone number is required');
        });

        it('should throw error for invalid length', () => {
            expect(() => new PhoneNumber('075412345')).toThrow('Invalid Tanzanian phone number format');
        });

        it('should throw error for invalid prefix', () => {
            // Must start with 6 or 7
            expect(() => new PhoneNumber('0154123456')).toThrow('Invalid Tanzanian phone number format');
        });
    });

    describe('Formatting', () => {
        const phone = new PhoneNumber('+255754123456');

        it('should format internationally', () => {
            expect(phone.getInternational()).toBe('+255754123456');
        });

        it('should format locally', () => {
            expect(phone.getLocal()).toBe('0754123456');
        });

        it('should format E.164', () => {
            expect(phone.getE164()).toBe('+255754123456');
        });

        it('should provide formatted display string', () => {
            expect(phone.formatted).toBe('+255 754 123 456');
        });
    });

    describe('Validation & Verification', () => {
        it('should validate correctly', () => {
            const phone = new PhoneNumber('0754123456');
            expect(phone.isValidTanzanian()).toBe(true);
            expect(phone.validate()).toBe(true);
        });

        it('should identify mobile operators', () => {
            // Vodacom starts with 74, 75, 76
            expect(new PhoneNumber('0754123456').getOperator()).toBe('VODACOM');

            // Airtel starts with 78, 79, 68, 69
            expect(new PhoneNumber('0784123456').getOperator()).toBe('AIRTEL');
            expect(new PhoneNumber('0684123456').getOperator()).toBe('AIRTEL');

            // Tigo starts with 71, 65, 67
            expect(new PhoneNumber('0714123456').getOperator()).toBe('TIGO');
            expect(new PhoneNumber('0654123456').getOperator()).toBe('TIGO');

            // Halotel starts with 62
            expect(new PhoneNumber('0624123456').getOperator()).toBe('HALOTEL');
        });

        it('should return UNKNOWN for unrecognized prefixes', () => {
            // 77 is not mapped in the current logic
            expect(new PhoneNumber('0774123456').getOperator()).toBe('UNKNOWN');
        });

        it('should check if mobile money is supported', () => {
            expect(new PhoneNumber('0754123456').supportsMobileMoney()).toBe(true);
            expect(new PhoneNumber('0774123456').supportsMobileMoney()).toBe(true); // UNKNOWN operator is still technically valid format but maybe not supported?
            // Re-reading logic: supportsMobileMoney returns true if operator !== null && operator !== 'UNKNOWN'
            expect(new PhoneNumber('0774123456').supportsMobileMoney()).toBe(false);
        });
    });

    describe('Equality & Conversion', () => {
        it('should check equality', () => {
            const p1 = new PhoneNumber('0754123456');
            const p2 = new PhoneNumber('+255754123456');
            expect(p1.equals(p2)).toBe(true);
        });

        it('should convert to object', () => {
            const phone = new PhoneNumber('0754123456');
            expect(phone.toObject()).toEqual({
                countryCode: '255',
                number: '754123456',
                formatted: '+255 754 123 456'
            });
        });

        it('should create from static methods', () => {
            const p1 = PhoneNumber.fromInternational('+255754123456');
            const p2 = PhoneNumber.fromLocal('0754123456');
            expect(p1.equals(p2)).toBe(true);
        });
    });
});
