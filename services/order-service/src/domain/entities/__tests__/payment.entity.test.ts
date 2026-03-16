import { Payment, PaymentStatus, PaymentMethod } from '../payment.entity';
import { getModelPrefix, isSystemId, makeId } from '@shared/ids/id';

describe('Payment Entity', () => {
    const validData = {
        id: makeId(getModelPrefix('Order_Payment')),
        orderId: makeId(getModelPrefix('Order_Order')),
        buyerId: makeId(getModelPrefix('User_User')),
        amount: 5000,
        currency: 'TZS',
        method: PaymentMethod.MOBILE_MONEY
    };

    describe('Creation', () => {
        it('should create valid payment with PENDING status', () => {
            const payment = new Payment(validData);
            expect(payment.id).toBe('pay-123');
            expect(payment.status).toBe(PaymentStatus.PENDING);
            expect(payment.amount).toBe(5000);
            expect(payment.method).toBe(PaymentMethod.MOBILE_MONEY);
        });

        it('should auto-generate ID if missing', () => {
            const payment = new Payment({ ...validData, id: undefined });
            expect(payment.id).toBeDefined();
            expect(isSystemId(payment.id)).toBe(true);
        });
    });

    describe('Status Updates', () => {
        it('should update status and transaction ID', () => {
            const payment = new Payment(validData);
            payment.updateStatus(PaymentStatus.COMPLETED, 'txn-External-123');

            expect(payment.status).toBe(PaymentStatus.COMPLETED);
            expect(payment.transactionId).toBe('txn-External-123');
        });
    });

    describe('Refund Check', () => {
        it('should be refundable if COMPLETED and not COD', () => {
            const payment = new Payment({
                ...validData,
                status: PaymentStatus.COMPLETED,
                method: PaymentMethod.MOBILE_MONEY
            });
            // We need to set status via constructor or update, constructor sets pending
            payment.updateStatus(PaymentStatus.COMPLETED);
            expect(payment.canBeRefunded()).toBe(true);
        });

        it('should not be refundable if COD', () => {
            const payment = new Payment({
                ...validData,
                method: PaymentMethod.COD
            });
            payment.updateStatus(PaymentStatus.COMPLETED);
            expect(payment.canBeRefunded()).toBe(false);
        });

        it('should not be refundable if not COMPLETED', () => {
            const payment = new Payment({
                ...validData,
                status: PaymentStatus.PENDING
            });
            expect(payment.canBeRefunded()).toBe(false);
        });
    });
});
