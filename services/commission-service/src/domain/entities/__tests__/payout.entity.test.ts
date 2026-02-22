import { Payout } from '../payout.entity';
import { PayoutStatus } from '../../value-objects/payout-types.value-object';
import { PayoutId, RecipientId } from '../../value-objects/ids.value-object';
import { PayoutAmount } from '../../value-objects/monetary.value-object';
import { RecipientType } from '../../value-objects/recipient-types.value-object';

describe('Payout Entity', () => {
    const createPayout = (status: PayoutStatus = PayoutStatus.PENDING) => {
        return new Payout(
            PayoutId.create(),
            RecipientId.create(),
            RecipientType.SELLER,
            PayoutAmount.fromNumber(500),
            status,
            new Date()
        );
    };

    describe('creation', () => {
        it('should create a payout with valid properties', () => {
            const id = PayoutId.create();
            const recipientId = RecipientId.create();
            const amount = PayoutAmount.fromNumber(500);
            const createdAt = new Date();

            const payout = new Payout(
                id,
                recipientId,
                RecipientType.SELLER,
                amount,
                PayoutStatus.PENDING,
                createdAt
            );

            expect(payout.id).toBe(id);
            expect(payout.recipientId).toBe(recipientId);
            expect(payout.recipientType).toBe(RecipientType.SELLER);
            expect(payout.amount).toBe(amount);
            expect(payout.status).toBe(PayoutStatus.PENDING);
            expect(payout.createdAt).toBe(createdAt);
        });
    });

    describe('schedule', () => {
        it('should schedule a pending payout', () => {
            const payout = createPayout(PayoutStatus.PENDING);
            const scheduledDate = new Date();
            scheduledDate.setDate(scheduledDate.getDate() + 1);

            payout.schedule(scheduledDate);

            expect(payout.status).toBe(PayoutStatus.SCHEDULED);
            expect(payout.scheduledDate).toBe(scheduledDate);
        });

        it('should throw error when scheduling a non-pending payout', () => {
            const payout = createPayout(PayoutStatus.SCHEDULED);
            expect(() => payout.schedule(new Date())).toThrow('Only pending payouts can be scheduled');
        });
    });

    describe('process', () => {
        it('should process a scheduled payout', () => {
            const payout = createPayout(PayoutStatus.SCHEDULED);

            payout.process();

            expect(payout.status).toBe(PayoutStatus.PROCESSED);
            expect(payout.processedDate).toBeInstanceOf(Date);
        });

        it('should throw error when processing a non-scheduled payout', () => {
            const payout = createPayout(PayoutStatus.PENDING);
            expect(() => payout.process()).toThrow('Only scheduled payouts can be processed');
        });
    });

    describe('cancel', () => {
        it('should cancel a pending payout', () => {
            const payout = createPayout(PayoutStatus.PENDING);
            payout.cancel();
            expect(payout.status).toBe(PayoutStatus.CANCELLED);
        });

        it('should cancel a scheduled payout', () => {
            const payout = createPayout(PayoutStatus.SCHEDULED);
            payout.cancel();
            expect(payout.status).toBe(PayoutStatus.CANCELLED);
        });

        it('should throw error when cancelling a processed payout', () => {
            const payout = createPayout(PayoutStatus.PROCESSED);
            expect(() => payout.cancel()).toThrow('Processed payouts cannot be cancelled');
        });
    });

    describe('query methods', () => {
        it('should correctly report status flags', () => {
            const pending = createPayout(PayoutStatus.PENDING);
            const scheduled = createPayout(PayoutStatus.SCHEDULED);
            const processed = createPayout(PayoutStatus.PROCESSED);

            expect(pending.isPending()).toBe(true);
            expect(pending.isScheduled()).toBe(false);
            expect(pending.isProcessed()).toBe(false);

            expect(scheduled.isPending()).toBe(false);
            expect(scheduled.isScheduled()).toBe(true);
            expect(scheduled.isProcessed()).toBe(false);

            expect(processed.isPending()).toBe(false);
            expect(processed.isScheduled()).toBe(false);
            expect(processed.isProcessed()).toBe(true);
        });
    });

    describe('getAgeInDays', () => {
        it('should calculate age in days correctly', () => {
            const createdAt = new Date();
            createdAt.setDate(createdAt.getDate() - 10);

            const payout = new Payout(
                PayoutId.create(),
                RecipientId.create(),
                RecipientType.SELLER,
                PayoutAmount.fromNumber(500),
                PayoutStatus.PENDING,
                createdAt
            );

            expect(payout.getAgeInDays()).toBe(10);
        });
    });

    describe('isOverdue', () => {
        it('should return true when scheduled date is in the past and status is scheduled', () => {
            const scheduledDate = new Date();
            scheduledDate.setDate(scheduledDate.getDate() - 1);

            const payout = createPayout(PayoutStatus.SCHEDULED);
            payout.schedule(scheduledDate);

            expect(payout.isOverdue()).toBe(true);
        });

        it('should return false when scheduled date is in the future', () => {
            const scheduledDate = new Date();
            scheduledDate.setDate(scheduledDate.getDate() + 1);

            const payout = createPayout(PayoutStatus.SCHEDULED);
            payout.schedule(scheduledDate);

            expect(payout.isOverdue()).toBe(false);
        });

        it('should return false when not scheduled', () => {
            const payout = createPayout(PayoutStatus.PENDING);
            expect(payout.isOverdue()).toBe(false);
        });
    });
});
