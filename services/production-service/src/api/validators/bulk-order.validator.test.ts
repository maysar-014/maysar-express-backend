import {
    createBulkOrderRequestSchema,
    listBulkOrderRequestsSchema,
    submitBulkOrderQuoteSchema
} from './bulk-order.validator';

describe('bulk-order.validator', () => {
    it('parses a valid bulk order request payload', () => {
        const parsed = createBulkOrderRequestSchema.parse({
            body: {
                supplierId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
                buyerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FB0',
                title: 'Bulk order for 5,000 woven bags',
                description: 'Buyer is sourcing 5,000 branded woven bags for an April campaign rollout.',
                quantity: 5000,
                unit: 'bags',
                currency: 'TZS',
                requiredBy: '2026-04-15T09:00:00.000Z'
            }
        });

        expect(parsed.body.quantity).toBe(5000);
    });

    it('accepts listing filters with no explicit supplierId', () => {
        const parsed = listBulkOrderRequestsSchema.parse({
            query: {}
        });

        expect(parsed.query).toEqual({});
    });

    it('rejects invalid quote payloads', () => {
        expect(() => submitBulkOrderQuoteSchema.parse({
            params: { id: 'prd_bulord_01ARZ3NDEKTSV4RRFFQ69G5FAV' },
            body: {
                unitPrice: -1,
                currency: 'tzs',
                leadTimeDays: 0,
                validUntil: 'not-a-date'
            }
        })).toThrow();
    });
});
