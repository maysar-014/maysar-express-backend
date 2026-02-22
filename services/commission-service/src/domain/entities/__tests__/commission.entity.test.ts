import { Commission } from '../commission.entity';
import { CommissionStatus, CommissionType } from '../../value-objects/commission-types.value-object';
import { CommissionId, OrderId, SellerId } from '../../value-objects/ids.value-object';
import { CommissionAmount, CommissionRate } from '../../value-objects/monetary.value-object';

describe('Commission Entity', () => {
    const createCommission = (status: CommissionStatus = CommissionStatus.PENDING) => {
        return new Commission(
            CommissionId.create(),
            OrderId.create(),
            SellerId.create(),
            CommissionAmount.fromNumber(100),
            CommissionRate.fromPercentage(10),
            CommissionType.SALE,
            status,
            new Date()
        );
    };

    describe('creation', () => {
        it('should create a commission with valid properties', () => {
            const id = CommissionId.create();
            const orderId = OrderId.create();
            const sellerId = SellerId.create();
            const amount = CommissionAmount.fromNumber(100);
            const rate = CommissionRate.fromPercentage(10);
            const createdAt = new Date();

            const commission = new Commission(
                id,
                orderId,
                sellerId,
                amount,
                rate,
                CommissionType.SALE,
                CommissionStatus.PENDING,
                createdAt
            );

            expect(commission.id).toBe(id);
            expect(commission.orderId).toBe(orderId);
            expect(commission.sellerId).toBe(sellerId);
            expect(commission.amount).toBe(amount);
            expect(commission.rate).toBe(rate);
            expect(commission.type).toBe(CommissionType.SALE);
            expect(commission.status).toBe(CommissionStatus.PENDING);
            expect(commission.createdAt).toBe(createdAt);
        });
    });

    describe('markAsPaid', () => {
        it('should mark an approved commission as paid', () => {
            const commission = createCommission(CommissionStatus.APPROVED);
            const payoutId = 'payout-123';

            commission.markAsPaid(payoutId);

            expect(commission.status).toBe(CommissionStatus.PAID);
            expect(commission.payoutId).toBe(payoutId);
            expect(commission.paidAt).toBeInstanceOf(Date);
        });

        it('should throw error when marking a non-approved commission as paid', () => {
            const commission = createCommission(CommissionStatus.PENDING);

            expect(() => commission.markAsPaid('payout-123')).toThrow('Only approved commissions can be marked as paid');
        });
    });

    describe('approve', () => {
        it('should approve a pending commission', () => {
            const commission = createCommission(CommissionStatus.PENDING);

            commission.approve();

            expect(commission.status).toBe(CommissionStatus.APPROVED);
        });

        it('should throw error when approving a non-pending commission', () => {
            const commission = createCommission(CommissionStatus.APPROVED);

            expect(() => commission.approve()).toThrow('Only pending commissions can be approved');
        });
    });

    describe('reject', () => {
        it('should reject a pending commission', () => {
            const commission = createCommission(CommissionStatus.PENDING);

            commission.reject();

            expect(commission.status).toBe(CommissionStatus.REJECTED);
        });

        it('should throw error when rejecting a non-pending commission', () => {
            const commission = createCommission(CommissionStatus.PAID);

            expect(() => commission.reject()).toThrow('Only pending commissions can be rejected');
        });
    });

    describe('query methods', () => {
        it('should correctly report isPayable', () => {
            const pending = createCommission(CommissionStatus.PENDING);
            const approved = createCommission(CommissionStatus.APPROVED);
            const paid = createCommission(CommissionStatus.PAID);

            expect(pending.isPayable()).toBe(false);
            expect(approved.isPayable()).toBe(true);
            expect(paid.isPayable()).toBe(false);
        });

        it('should correctly report isPending', () => {
            const pending = createCommission(CommissionStatus.PENDING);
            const approved = createCommission(CommissionStatus.APPROVED);

            expect(pending.isPending()).toBe(true);
            expect(approved.isPending()).toBe(false);
        });
    });

    describe('getAgeInDays', () => {
        it('should calculate age in days correctly', () => {
            const createdAt = new Date();
            createdAt.setDate(createdAt.getDate() - 5);

            const commission = new Commission(
                CommissionId.create(),
                OrderId.create(),
                SellerId.create(),
                CommissionAmount.fromNumber(100),
                CommissionRate.fromPercentage(10),
                CommissionType.SALE,
                CommissionStatus.PENDING,
                createdAt
            );

            expect(commission.getAgeInDays()).toBe(5);
        });
    });
});
