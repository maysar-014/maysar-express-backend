import { DeliveryAddress } from '../delivery-address.value-object';

describe('DeliveryAddress', () => {
    it('should create email address', () => {
        const address = DeliveryAddress.create('test@example.com', 'email');

        expect(address.getValue()).toBe('test@example.com');
        expect(address.getType()).toBe('email');
    });

    it('should create phone address', () => {
        const address = DeliveryAddress.create('+255712345678', 'phone');

        expect(address.getValue()).toBe('+255712345678');
        expect(address.getType()).toBe('phone');
    });

    it('should validate email format', () => {
        expect(() => DeliveryAddress.create('invalid', 'email')).toThrow();
    });
});
