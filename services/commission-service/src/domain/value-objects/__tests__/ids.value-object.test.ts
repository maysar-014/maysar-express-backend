import { CommissionId, OrderId, SellerId, RecipientId, PayoutId } from '../ids.value-object';
import { isSystemId } from '@shared/ids/id';

describe('ID Value Objects', () => {
    const validId = CommissionId.create().toString();

    describe('CommissionId', () => {
        it('should create a random ID', () => {
            const id = CommissionId.create();
            expect(isSystemId(id.toString())).toBe(true);
        });

        it('should create from string', () => {
            const id = CommissionId.fromString(validId);
            expect(id.toString()).toBe(validId);
        });

        it('should throw for invalid ID', () => {
            expect(() => CommissionId.fromString('invalid')).toThrow('Invalid ID: invalid');
        });

        it('should check equality', () => {
            const id1 = CommissionId.fromString(validId);
            const id2 = CommissionId.fromString(validId);
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
