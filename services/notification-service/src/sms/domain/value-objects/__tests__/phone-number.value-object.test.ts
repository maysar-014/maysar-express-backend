import { PhoneNumber } from '../phone-number.value-object';

describe('PhoneNumber Value Object', () => {
    describe('create', () => {
        it('should create valid phone number', () => {
            const phone = PhoneNumber.create('+255712345678');
            expect(phone.getValue()).toBe('+255712345678');
        });

        it('should normalize input', () => {
            const phone = PhoneNumber.create(' 255 712 345 678 ');
            expect(phone.getValue()).toBe('+255712345678');
        });

        it('should throw on invalid format', () => {
            expect(() => PhoneNumber.create('invalid')).toThrow('Invalid phone number format');
            expect(() => PhoneNumber.create('+2551')).toThrow('Invalid phone number format'); // Too short
        });
    });

    describe('methods', () => {
        it('should extract country code', () => {
            const tz = PhoneNumber.create('+255712345678');
            expect(tz.getCountryCode()).toBe('255');

            const tzAlt = PhoneNumber.create('+255612834686');
            expect(tzAlt.getCountryCode()).toBe('255');
        });

        it('should get local number', () => {
            const phone = PhoneNumber.create('+255712345678');
            expect(phone.getLocalNumber()).toBe('712345678');
        });

        it('should identify country', () => {
            const tz = PhoneNumber.create('+255712345678');
            expect(tz.isTanzanian()).toBe(true);

            const tzAlt = PhoneNumber.create('+255612834686');
            expect(tzAlt.isTanzanian()).toBe(true);
        });

        it('should identify mobile numbers', () => {
            const tzMobile = PhoneNumber.create('+255712345678');
            expect(tzMobile.isMobile()).toBe(true);

            const tzLandline = PhoneNumber.create('+255222345678');
            expect(tzLandline.isMobile()).toBe(false);
        });

        it('should format for display', () => {
            const phone = PhoneNumber.create('+255712345678');
            expect(phone.toDisplayFormat()).toBe('+255 712 345 678');
        });
    });
});
