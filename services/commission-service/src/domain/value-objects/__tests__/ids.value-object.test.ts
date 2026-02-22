import { CommissionId, OrderId, SellerId, RecipientId, PayoutId } from '../ids.value-object';
import { v4 as uuidv4 } from 'uuid';

describe('ID Value Objects', () => {
    const validUuid = uuidv4();

    describe('CommissionId', () => {
        it('should create a random ID', () => {
            const id = CommissionId.create();
            expect(id.toString()).toMatch(/^[0-9a-f-]{36}$/);
        });

        it('should create from string', () => {
            const id = CommissionId.fromString(validUuid);
            expect(id.toString()).toBe(validUuid);
        });

        it('should throw for invalid UUID', () => {
            expect(() => CommissionId.fromString('invalid')).toThrow('Invalid UUID: invalid');
        });

        it('should check equality', () => {
            const id1 = CommissionId.fromString(validUuid);
            const id2 = CommissionId.fromString(validUuid);
            const id3 = CommissionId.create();

            expect(id1.equals(id2)).toBe(true);
            expect(id1.equals(id3)).toBe(false);
        });
    });

    describe('Other IDs', () => {
        it('OrderId should work correctly', () => {
            const id = OrderId.create();
            expect(id).toBeInstanceOf(OrderId);
        });

        it('SellerId should work correctly', () => {
            const id = SellerId.create();
            expect(id).toBeInstanceOf(SellerId);
        });

        it('RecipientId should work correctly', () => {
            const id = RecipientId.create();
            expect(id).toBeInstanceOf(RecipientId);
        });

        it('PayoutId should work correctly', () => {
            const id = PayoutId.create();
            expect(id).toBeInstanceOf(PayoutId);
        });
    });
});
