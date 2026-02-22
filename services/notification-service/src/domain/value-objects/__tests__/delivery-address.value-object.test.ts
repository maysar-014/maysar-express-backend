import { DeliveryAddress } from '../delivery-address.value-object';

describe('DeliveryAddress', () => {
    it('should create email address', () => {
        const address = DeliveryAddress.createEmail('test@example.com');

        expect(address.getValue()).toBe('test@example.com');
        expect(address.getType()).toBe('email');
    });

    it('should create phone address', () => {
        const address = DeliveryAddress.createPhone('+254712345678');

        expect(address.getValue()).toBe('+254712345678');
        expect(address.getType()).toBe('phone');
    });

    it('should validate email format', () => {
        expect(() => DeliveryAddress.createEmail('invalid')).toThrow();
    });
});
