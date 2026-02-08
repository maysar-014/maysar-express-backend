import { Refund, RefundStatus, RefundReason } from '../refund.entity';

describe('Refund Entity', () => {
    const validProps = {
        id: 'ref_123',
        paymentId: 'pay_123',
        orderId: 'ord_123',
        userId: 'usr_123',
        amount: 500,
        currency: 'TZS',
        reason: RefundReason.CUSTOMER_REQUEST,
        status: RefundStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    describe('Constructor', () => {
        it('should create a valid refund', () => {
            const refund = new Refund(validProps);
            expect(refund).toBeDefined();
            expect(refund.id).toBe(validProps.id);
            expect(refund.status).toBe(RefundStatus.PENDING);
            expect(refund.reason).toBe(RefundReason.CUSTOMER_REQUEST);
        });

        it('should throw error when ID is missing', () => {
            expect(() => new Refund({ ...validProps, id: '' })).toThrow('Refund ID is required');
        });

        it('should throw error when Payment ID is missing', () => {
            expect(() => new Refund({ ...validProps, paymentId: '' })).toThrow('Payment ID is required');
        });

        it('should throw error when Order ID is missing', () => {
            expect(() => new Refund({ ...validProps, orderId: '' })).toThrow('Order ID is required');
        });

        it('should throw error when User ID is missing', () => {
            expect(() => new Refund({ ...validProps, userId: '' })).toThrow('User ID is required');
        });

        it('should throw error when Amount is not positive', () => {
            expect(() => new Refund({ ...validProps, amount: 0 })).toThrow('Refund amount must be positive');
            expect(() => new Refund({ ...validProps, amount: -500 })).toThrow('Refund amount must be positive');
        });

        it('should throw error for invalid Reason', () => {
            expect(() => new Refund({ ...validProps, reason: 'INVALID' as RefundReason })).toThrow('Invalid refund reason: INVALID');
        });
    });

    describe('State Transitions / Business Logic', () => {
        it('should check if it can process', () => {
            const refund = new Refund(validProps);
            expect(refund.canProcess()).toBe(true);

            refund.process();
            expect(refund.canProcess()).toBe(false);
        });

        it('should start processing', () => {
            const refund = new Refund(validProps);
            refund.process();
            expect(refund.status).toBe(RefundStatus.PROCESSING);
            expect(refund.processedAt).toBeDefined();
        });

        it('should throw error when processing non-pending refund', () => {
            const refund = new Refund({ ...validProps, status: RefundStatus.COMPLETED });
            expect(() => refund.process()).toThrow('Cannot process refund in COMPLETED status');
        });

        it('should complete refund', () => {
            const refund = new Refund({ ...validProps, status: RefundStatus.PROCESSING });
            refund.complete('prov_ref_123');
            expect(refund.status).toBe(RefundStatus.COMPLETED);
            expect(refund.completedAt).toBeDefined();
            expect(refund.providerRef).toBe('prov_ref_123');
        });

        it('should throw error when completing non-processing refund', () => {
            const refund = new Refund(validProps); // PENDING
            expect(() => refund.complete()).toThrow('Cannot complete refund in PENDING status. Must be PROCESSING.');
        });

        it('should fail refund', () => {
            const refund = new Refund(validProps);
            refund.fail('Gateway error');
            expect(refund.status).toBe(RefundStatus.FAILED);
            expect(refund.failureReason).toBe('Gateway error');
        });

        it('should throw error when failing completed refund', () => {
            const refund = new Refund({ ...validProps, status: RefundStatus.COMPLETED });
            expect(() => refund.fail('Error')).toThrow('Cannot fail refund in COMPLETED status');
        });

        it('should cancel refund', () => {
            const refund = new Refund(validProps);
            refund.cancel();
            expect(refund.status).toBe(RefundStatus.CANCELLED);
        });

        it('should throw error when cancelling completed refund', () => {
            const refund = new Refund({ ...validProps, status: RefundStatus.COMPLETED });
            expect(() => refund.cancel()).toThrow('Cannot cancel refund in COMPLETED status');
        });
    });

    describe('updateStatus', () => {
        it('should allow valid transition', () => {
            const refund = new Refund(validProps);
            refund.updateStatus(RefundStatus.PROCESSING);
            expect(refund.status).toBe(RefundStatus.PROCESSING);
        });

        it('should throw on invalid transition', () => {
            const refund = new Refund(validProps);
            expect(() => refund.updateStatus(RefundStatus.COMPLETED)).toThrow('Invalid status transition from PENDING to COMPLETED');
        });

        it('should set failure reason when transitioning to FAILED', () => {
            const refund = new Refund(validProps);
            refund.updateStatus(RefundStatus.FAILED, 'Reason');
            expect(refund.failureReason).toBe('Reason');
        });
    });
});
