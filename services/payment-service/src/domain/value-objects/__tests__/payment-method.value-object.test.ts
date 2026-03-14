import { PaymentMethod, PaymentMethodType, PaymentProvider } from '../payment-method.value-object';

describe('PaymentMethod Value Object', () => {
    describe('Constructor & Validation', () => {
        it('should create valid payment method', () => {
            const pm = new PaymentMethod(PaymentMethodType.MPESA, PaymentProvider.PESAPAL);
            expect(pm.type).toBe(PaymentMethodType.MPESA);
            expect(pm.provider).toBe(PaymentProvider.PESAPAL);
        });

        it('should throw error for invalid type', () => {
            expect(() => new PaymentMethod('INVALID' as PaymentMethodType, PaymentProvider.PESAPAL)).toThrow('Invalid payment method type: INVALID');
        });

        it('should throw error for invalid provider', () => {
            expect(() => new PaymentMethod(PaymentMethodType.MPESA, 'INVALID' as PaymentProvider)).toThrow('Invalid payment provider: INVALID');
        });

        it('should enforce provider compatibility (Wallet)', () => {
            expect(() => new PaymentMethod(PaymentMethodType.WALLET, PaymentProvider.PESAPAL)).toThrow('Wallet payment method must use INTERNAL_WALLET provider');
        });

        it('should enforce provider compatibility (Mobile Money)', () => {
            expect(() => new PaymentMethod(PaymentMethodType.MPESA, PaymentProvider.INTERNAL_WALLET)).toThrow('Payment method MPESA must use PESAPAL provider');
        });
    });

    describe('Capabilities', () => {
        const mpesa = new PaymentMethod(PaymentMethodType.MPESA, PaymentProvider.PESAPAL);
        const wallet = new PaymentMethod(PaymentMethodType.WALLET, PaymentProvider.INTERNAL_WALLET);
        const card = new PaymentMethod(PaymentMethodType.CARD, PaymentProvider.PESAPAL);

        it('should check if requires phone number', () => {
            expect(mpesa.requiresPhoneNumber()).toBe(true);
            expect(wallet.requiresPhoneNumber()).toBe(false);
        });

        it('should check if requires bank account', () => {
            const bank = new PaymentMethod(PaymentMethodType.BANK_TRANSFER, PaymentProvider.PESAPAL);
            expect(bank.requiresBankAccount()).toBe(true);
            expect(mpesa.requiresBankAccount()).toBe(false);
        });

        it('should check if requires card details', () => {
            expect(card.requiresCardDetails()).toBe(true);
            expect(mpesa.requiresCardDetails()).toBe(false);
        });

        it('should check supported currencies', () => {
            expect(mpesa.supportsCurrency('TZS')).toBe(true);
            expect(mpesa.supportsCurrency('USD')).toBe(false);

            expect(wallet.supportsCurrency('USD')).toBe(true);
            expect(wallet.supportsCurrency('TZS')).toBe(true);
        });
    });

    describe('Amount Limits', () => {
        const mpesa = new PaymentMethod(PaymentMethodType.MPESA, PaymentProvider.PESAPAL);

        it('should get min/max amounts', () => {
            expect(mpesa.getMinimumAmount('TZS')).toBe(500);
            expect(mpesa.getMaximumAmount('TZS')).toBe(5000000);
        });

        it('should validate valid amount', () => {
            expect(() => mpesa.validate(1000, 'TZS')).not.toThrow();
        });

        it('should throw if currency unsupported', () => {
            expect(() => mpesa.validate(100, 'USD')).toThrow('does not support currency USD');
        });

        it('should throw if amount too low', () => {
            expect(() => mpesa.validate(100, 'TZS')).toThrow('Amount 100 TZS is below minimum 500');
        });

        it('should throw if amount too high', () => {
            expect(() => mpesa.validate(6000000, 'TZS')).toThrow('Amount 6000000 TZS exceeds maximum 5000000');
        });
    });

    describe('Equality & Conversion', () => {
        const pm1 = new PaymentMethod(PaymentMethodType.MPESA, PaymentProvider.PESAPAL);
        const pm2 = new PaymentMethod(PaymentMethodType.MPESA, PaymentProvider.PESAPAL);

        it('should check equality', () => {
            expect(pm1.equals(pm2)).toBe(true);
        });

        it('should convert to object', () => {
            const obj = pm1.toObject();
            expect(obj.type).toBe(PaymentMethodType.MPESA);
            expect(obj.provider).toBe(PaymentProvider.PESAPAL);
        });

        it('should create from string', () => {
            const pm = PaymentMethod.fromString('MPESA');
            expect(pm.type).toBe(PaymentMethodType.MPESA);
            expect(pm.provider).toBe(PaymentProvider.PESAPAL);
        });
    });
});

