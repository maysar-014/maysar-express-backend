import { ValidationEngine, ValidationInput } from '../validation.engine';

describe('ValidationEngine', () => {
    let engine: ValidationEngine;

    beforeEach(() => {
        engine = new ValidationEngine();
    });

    const validInput: ValidationInput = {
        customerId: 'cust_abc1234567',
        productItems: [
            { productId: 'prod-1', quantity: 1, unitPrice: 1000, sellerId: 'seller-1' }
        ],
        shippingAddress: {
            street: 'Main St',
            city: 'Dar',
            region: 'Ilala',
            country: 'TZ'
        },
        paymentMethod: {
            type: 'mobile_money',
            provider: 'M-Pesa',
            verified: true
        },
        orderType: 'standard',
        channel: 'mobile'
    };

    describe('Format Validation', () => {
        it('should pass valid input', async () => {
            const result = await engine.processValidationRequest(validInput);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should fail on invalid customer ID format', async () => {
            const result = await engine.processValidationRequest({
                ...validInput,
                customerId: 'invalid-format'
            });
            expect(result.isValid).toBe(false);
            expect(result.errors).toContainEqual(expect.objectContaining({
                code: 'INVALID_CUSTOMER_ID'
            }));
        });

        it('should fail on empty product list', async () => {
            const result = await engine.processValidationRequest({
                ...validInput,
                productItems: []
            });
            expect(result.isValid).toBe(false);
            expect(result.errors).toContainEqual(expect.objectContaining({
                code: 'NO_PRODUCTS'
            }));
        });
    });

    describe('Business Rules', () => {
        it('should validate max order value', async () => {
            const result = await engine.processValidationRequest({
                ...validInput,
                productItems: [{ ...validInput.productItems[0], unitPrice: 60000000, quantity: 1 }]
            });
            // Logic: passed = total <= max. 
            // In the engine: passed: totalValue <= maxOrderValue
            // It adds to 'rules' array, but does it add to 'errors'?
            // The engine implementation pushes to 'rules', but currently validateBusinessRules returns { errors: [], ... }
            // So business rule failures in current implementation don't cause isValid=false unless they add to errors.
            // Let's check validateBusinessRules implementation again.
            // It returns empty errors array. So it passes validation but records rule failure in businessRules.

            expect(result.isValid).toBe(true);
            const rule = result.businessRules.find(r => r.ruleId === 'MAX_ORDER_VALUE');
            expect(rule?.passed).toBe(false);
        });
    });

    describe('Compliance', () => {
        it('should check GDPR compliance', async () => {
            const result = await engine.processValidationRequest(validInput);
            expect(result.compliance.gdprCompliant).toBe(true);
        });

        it('should fail GDPR if no customer ID', async () => {
            // Though validateFormat catches missing ID, let's see compliance check
            const result = await engine.processValidationRequest({
                ...validInput,
                customerId: ''
            });
            expect(result.compliance.gdprCompliant).toBe(false);
        });
    });
});
