import { PaymentProcessingEngine, PaymentRequest, PaymentProcessingStrategy } from '../payment-processing.engine';
import { PaymentMethodType, PaymentProvider } from '../../value-objects/payment-method.value-object';

describe('Payment Processing Engine', () => {
    let engine: PaymentProcessingEngine;

    beforeEach(() => {
        engine = new PaymentProcessingEngine();
    });

    describe('Provider Selection', () => {
        it('should select correct provider for method', () => {
            expect(engine.selectPaymentProvider(PaymentMethodType.MPESA)).toBe(PaymentProvider.PAYMENT_GATEWAY);
            expect(engine.selectPaymentProvider(PaymentMethodType.WALLET)).toBe(PaymentProvider.INTERNAL_WALLET);
            expect(engine.selectPaymentProvider(PaymentMethodType.CARD)).toBe(PaymentProvider.PAYMENT_GATEWAY);
        });
    });

    describe('Fee Calculation', () => {
        it('should calculate fees for MPESA (1.5% + 2% platform)', () => {
            const fees = engine.calculateFees(1000, PaymentMethodType.MPESA);
            // Platform: 20, Provider: 15, Total: 35
            expect(fees.platformFee).toBe(20);
            expect(fees.providerFee).toBe(15);
            expect(fees.totalFee).toBe(35);
        });

        it('should calculate fees for WALLET (0% + 2% platform)', () => {
            const fees = engine.calculateFees(1000, PaymentMethodType.WALLET);
            // Platform: 20, Provider: 0, Total: 20
            expect(fees.platformFee).toBe(20);
            expect(fees.providerFee).toBe(0);
            expect(fees.totalFee).toBe(20);
        });
    });

    describe('Validation', () => {
        const validRequest: PaymentRequest = {
            amount: 1000,
            currency: 'TZS',
            method: PaymentMethodType.MPESA,
            userId: 'user_123',
            orderId: 'order_123'
        };

        it('should validate valid request', () => {
            const result = engine.validatePaymentRequest(validRequest);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should invalidate negative amount', () => {
            const result = engine.validatePaymentRequest({ ...validRequest, amount: -100 });
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Payment amount must be positive');
        });

        it('should invalidate unsupported currency', () => {
            const result = engine.validatePaymentRequest({ ...validRequest, currency: 'XYZ' });
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Unsupported currency: XYZ');
        });

        it('should invalidate amount below limits', () => {
            const result = engine.validatePaymentRequest({ ...validRequest, amount: 100 }); // Min is 500 for MPESA
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.includes('below minimum'))).toBe(true);
        });
    });

    describe('Strategy Determination', () => {
        it('should determine correct strategy', () => {
            const request: PaymentRequest = {
                amount: 1000,
                currency: 'TZS',
                method: PaymentMethodType.MPESA,
                userId: 'u',
                orderId: 'o'
            };

            const strategy = engine.determineProcessingStrategy(request);
            expect(strategy.provider).toBe(PaymentProvider.PAYMENT_GATEWAY);
            expect(strategy.method).toBe(PaymentMethodType.MPESA);
            expect(strategy.estimatedProcessingTime).toBe(30);
            expect(strategy.requiresRedirect).toBe(true);
            expect(strategy.requiresWebhook).toBe(true);
            expect(strategy.fees.totalFee).toBe(35);
        });
    });

    describe('Total Cost Calculation', () => {
        it('should calculate total cost', () => {
            const cost = engine.calculateTotalCost(1000, PaymentMethodType.MPESA);
            expect(cost.subtotal).toBe(1000);
            expect(cost.fees).toBe(35);
            expect(cost.total).toBe(1035);
        });
    });
});

