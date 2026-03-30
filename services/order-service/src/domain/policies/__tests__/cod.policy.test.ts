import { CODPolicy } from '../cod.policy';

describe('CODPolicy', () => {
    let policy: CODPolicy;

    beforeEach(() => {
        policy = new CODPolicy();
    });

    const validOrder = {
        paymentMethod: 'COD',
        totalAmount: 50000,
        buyerId: 'user-123',
        deliveryAddress: 'Region A'
    };

    describe('validate', () => {
        it('should skip validation if payment method is not COD', async () => {
            const result = await policy.validate({ ...validOrder, paymentMethod: 'CARD' });
            expect(result.valid).toBe(true);
        });

        it('should fail if amount exceeds maximum', async () => {
            const result = await policy.validate({ ...validOrder, totalAmount: 500001 }); // Max 500k
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(expect.stringContaining('exceeds maximum limit'));
        });

        it('should fail if amount below minimum', async () => {
            const result = await policy.validate({ ...validOrder, totalAmount: 999 }); // Min 1000
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(expect.stringContaining('below minimum limit'));
        });

        it('should fail if buyer not verified', async () => {
            jest.spyOn(policy as any, 'isBuyerVerified').mockResolvedValue(false);
            const result = await policy.validate(validOrder);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Buyer must be verified for COD orders');
        });

        it('should fail if COD not supported in area', async () => {
            jest.spyOn(policy as any, 'isCODSupportedInArea').mockResolvedValue(false);
            const result = await policy.validate(validOrder);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('COD not supported in delivery area');
        });

        it('should pass if all conditions met', async () => {
            jest.spyOn(policy as any, 'isBuyerVerified').mockResolvedValue(true);
            jest.spyOn(policy as any, 'isCODSupportedInArea').mockResolvedValue(true);

            const result = await policy.validate(validOrder);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
    });
});
