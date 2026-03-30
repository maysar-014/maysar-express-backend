import { Payment, PaymentStatus, PaymentMethod, PaymentProvider } from '../payment.entity';

describe('Payment Entity', () => {
    const validPaymentProps = {
        id: 'pay_123',
        orderId: 'ord_456',
        userId: 'usr_789',
        amount: 10000,
        currency: 'TZS',
        method: PaymentMethod.MPESA,
        provider: PaymentProvider.PESAPAL,
        status: PaymentStatus.PENDING,
        metadata: {
            phoneNumber: '+255712345678',
            customerName: 'John Doe',
            customerEmail: 'john@example.com'
        },
        refundedAmount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    describe('Construction and Validation', () => {
        it('should create a valid payment', () => {
            const payment = new Payment(validPaymentProps);

            expect(payment.id).toBe('pay_123');
            expect(payment.orderId).toBe('ord_456');
            expect(payment.userId).toBe('usr_789');
            expect(payment.amount).toBe(10000);
            expect(payment.currency).toBe('TZS');
            expect(payment.method).toBe(PaymentMethod.MPESA);
            expect(payment.provider).toBe(PaymentProvider.PESAPAL);
            expect(payment.status).toBe(PaymentStatus.PENDING);
        });

        it('should throw error for negative amount', () => {
            const invalidProps = { ...validPaymentProps, amount: -100 };

            expect(() => new Payment(invalidProps)).toThrow('Payment amount must be positive');
        });

        it('should throw error for zero amount', () => {
            const invalidProps = { ...validPaymentProps, amount: 0 };

            expect(() => new Payment(invalidProps)).toThrow('Payment amount must be positive');
        });

        it('should throw error for invalid currency', () => {
            const invalidProps = { ...validPaymentProps, currency: 'INVALID' };

            expect(() => new Payment(invalidProps)).toThrow('Unsupported currency: INVALID');
        });

        it('should throw error for missing required fields', () => {
            const invalidProps = { ...validPaymentProps, orderId: '' };

            expect(() => new Payment(invalidProps)).toThrow();
        });

        it('should accept valid currencies (TZS, USD, KES)', () => {
            ['TZS', 'USD', 'KES'].forEach(currency => {
                const props = { ...validPaymentProps, currency };
                expect(() => new Payment(props)).not.toThrow();
            });
        });
    });

    describe('Status Transitions', () => {
        it('should transition from PENDING to PROCESSING', () => {
            const payment = new Payment(validPaymentProps);

            payment.updateStatus(PaymentStatus.PROCESSING);

            expect(payment.status).toBe(PaymentStatus.PROCESSING);
        });

        it('should transition from PROCESSING to COMPLETED', () => {
            const payment = new Payment({
                ...validPaymentProps,
                status: PaymentStatus.PROCESSING
            });

            payment.updateStatus(PaymentStatus.COMPLETED);

            expect(payment.status).toBe(PaymentStatus.COMPLETED);
        });

        it('should transition from PENDING to FAILED', () => {
            const payment = new Payment(validPaymentProps);

            payment.updateStatus(PaymentStatus.FAILED, 'Insufficient funds');

            expect(payment.status).toBe(PaymentStatus.FAILED);
            expect(payment.failureReason).toBe('Insufficient funds');
        });

        it('should throw error for invalid status transition', () => {
            const payment = new Payment({
                ...validPaymentProps,
                status: PaymentStatus.COMPLETED
            });

            expect(() => payment.updateStatus(PaymentStatus.PENDING))
                .toThrow('Invalid status transition');
        });

        it('should not allow transition from COMPLETED to PROCESSING', () => {
            const payment = new Payment({
                ...validPaymentProps,
                status: PaymentStatus.COMPLETED
            });

            expect(() => payment.updateStatus(PaymentStatus.PROCESSING))
                .toThrow('Invalid status transition');
        });

        it('should not allow transition from FAILED to PROCESSING', () => {
            const payment = new Payment({
                ...validPaymentProps,
                status: PaymentStatus.FAILED
            });

            expect(() => payment.updateStatus(PaymentStatus.PROCESSING))
                .toThrow('Invalid status transition');
        });
    });

    describe('Mark as Completed', () => {
        it('should mark payment as completed with timestamp', () => {
            const payment = new Payment({
                ...validPaymentProps,
                status: PaymentStatus.PROCESSING
            });

            payment.markAsCompleted('provider_txn_123');

            expect(payment.status).toBe(PaymentStatus.COMPLETED);
            expect(payment.completedAt).toBeInstanceOf(Date);
            expect(payment.metadata.providerTransactionId).toBe('provider_txn_123');
        });

        it('should throw error if marking completed from PENDING', () => {
            const payment = new Payment(validPaymentProps);

            expect(() => payment.markAsCompleted()).toThrow('Invalid status transition');
        });

        it('should throw error if already completed', () => {
            const payment = new Payment({
                ...validPaymentProps,
                status: PaymentStatus.COMPLETED,
                completedAt: new Date()
            });

            expect(() => payment.markAsCompleted()).toThrow('Payment is already completed');
        });
    });

    describe('Mark as Failed', () => {
        it('should mark payment as failed with reason', () => {
            const payment = new Payment({
                ...validPaymentProps,
                status: PaymentStatus.PROCESSING
            });

            payment.markAsFailed('Network timeout');

            expect(payment.status).toBe(PaymentStatus.FAILED);
            expect(payment.failureReason).toBe('Network timeout');
        });

        it('should throw error if failure reason is empty', () => {
            const payment = new Payment({
                ...validPaymentProps,
                status: PaymentStatus.PROCESSING
            });

            expect(() => payment.markAsFailed('')).toThrow('Failure reason is required');
        });

        it('should allow marking as failed from PENDING', () => {
            const payment = new Payment(validPaymentProps);

            payment.markAsFailed('Validation failed');

            expect(payment.status).toBe(PaymentStatus.FAILED);
        });
    });

    describe('Refund Operations', () => {
        it('should allow refund for completed payment', () => {
            const payment = new Payment({
                ...validPaymentProps,
                status: PaymentStatus.COMPLETED,
                completedAt: new Date()
            });

            expect(payment.canRefund()).toBe(true);
        });

        it('should not allow refund for pending payment', () => {
            const payment = new Payment(validPaymentProps);

            expect(payment.canRefund()).toBe(false);
        });

        it('should not allow refund for failed payment', () => {
            const payment = new Payment({
                ...validPaymentProps,
                status: PaymentStatus.FAILED
            });

            expect(payment.canRefund()).toBe(false);
        });

        it('should calculate correct refundable amount', () => {
            const payment = new Payment({
                ...validPaymentProps,
                amount: 10000,
                status: PaymentStatus.COMPLETED,
                refundedAmount: 3000,
                completedAt: new Date()
            });

            expect(payment.getRefundableAmount()).toBe(7000);
        });

        it('should return zero refundable amount if fully refunded', () => {
            const payment = new Payment({
                ...validPaymentProps,
                amount: 10000,
                status: PaymentStatus.COMPLETED,
                refundedAmount: 10000,
                completedAt: new Date()
            });

            expect(payment.getRefundableAmount()).toBe(0);
        });

        it('should record partial refund', () => {
            const payment = new Payment({
                ...validPaymentProps,
                amount: 10000,
                status: PaymentStatus.COMPLETED,
                completedAt: new Date()
            });

            payment.recordRefund(3000);

            expect(payment.refundedAmount).toBe(3000);
            expect(payment.status).toBe(PaymentStatus.PARTIALLY_REFUNDED);
        });

        it('should record full refund', () => {
            const payment = new Payment({
                ...validPaymentProps,
                amount: 10000,
                status: PaymentStatus.COMPLETED,
                completedAt: new Date()
            });

            payment.recordRefund(10000);

            expect(payment.refundedAmount).toBe(10000);
            expect(payment.status).toBe(PaymentStatus.REFUNDED);
        });

        it('should throw error for refund exceeding refundable amount', () => {
            const payment = new Payment({
                ...validPaymentProps,
                amount: 10000,
                status: PaymentStatus.COMPLETED,
                refundedAmount: 8000,
                completedAt: new Date()
            });

            expect(() => payment.recordRefund(3000))
                .toThrow('Refund amount 3000 exceeds refundable amount 2000');
        });

        it('should throw error for negative refund amount', () => {
            const payment = new Payment({
                ...validPaymentProps,
                status: PaymentStatus.COMPLETED,
                completedAt: new Date()
            });

            expect(() => payment.recordRefund(-100))
                .toThrow('Refund amount must be positive');
        });

        it('should throw error for refunding non-completed payment', () => {
            const payment = new Payment(validPaymentProps);

            expect(() => payment.recordRefund(1000))
                .toThrow('Payment cannot be refunded');
        });
    });

    describe('Fee Calculations', () => {
        it('should calculate fees for M-PESA payment', () => {
            const payment = new Payment({
                ...validPaymentProps,
                amount: 10000,
                method: PaymentMethod.MPESA
            });

            const fees = payment.calculateFees();

            expect(fees.platformFee).toBe(200); // 2% of 10000
            expect(fees.providerFee).toBe(150); // 1.5% of 10000
            expect(fees.totalFee).toBe(350);
        });

        it('should calculate fees for wallet payment', () => {
            const payment = new Payment({
                ...validPaymentProps,
                amount: 10000,
                method: PaymentMethod.WALLET,
                provider: PaymentProvider.INTERNAL_WALLET
            });

            const fees = payment.calculateFees();

            expect(fees.platformFee).toBe(200); // 2% of 10000
            expect(fees.providerFee).toBe(0); // No provider fee for wallet
            expect(fees.totalFee).toBe(200);
        });

        it('should calculate fees for card payment', () => {
            const payment = new Payment({
                ...validPaymentProps,
                amount: 10000,
                method: PaymentMethod.CARD
            });

            const fees = payment.calculateFees();

            expect(fees.platformFee).toBe(200); // 2% of 10000
            expect(fees.providerFee).toBe(290); // 2.9% of 10000
            expect(fees.totalFee).toBe(490);
        });

        it('should calculate correct provider fees for different payment methods', () => {
            // M-PESA: 1.5% provider fee
            const mPesaPayment = new Payment({
                ...validPaymentProps,
                amount: 10000,
                method: PaymentMethod.MPESA
            });
            expect(mPesaPayment.calculateFees().providerFee).toBe(150);

            // Wallet: 0% provider fee
            const walletPayment = new Payment({
                ...validPaymentProps,
                amount: 10000,
                method: PaymentMethod.WALLET
            });
            expect(walletPayment.calculateFees().providerFee).toBe(0);

            // Card: 2.9% provider fee
            const cardPayment = new Payment({
                ...validPaymentProps,
                amount: 10000,
                method: PaymentMethod.CARD
            });
            expect(cardPayment.calculateFees().providerFee).toBe(290);

            // Bank Transfer: 1% provider fee
            const bankPayment = new Payment({
                ...validPaymentProps,
                amount: 10000,
                method: PaymentMethod.BANK_TRANSFER
            });
            expect(bankPayment.calculateFees().providerFee).toBe(100);
        });
    });

    describe('Metadata Operations', () => {
        it('should update metadata', () => {
            const payment = new Payment(validPaymentProps);

            payment.updateMetadata({
                providerReference: 'ref_123',
                ipAddress: '192.168.1.1'
            });

            expect(payment.metadata.providerReference).toBe('ref_123');
            expect(payment.metadata.ipAddress).toBe('192.168.1.1');
            expect(payment.metadata.phoneNumber).toBe('+255712345678'); // Original data preserved
        });

        it('should merge metadata without overwriting existing fields', () => {
            const payment = new Payment(validPaymentProps);

            payment.updateMetadata({ providerReference: 'ref_456' });

            expect(payment.metadata.phoneNumber).toBe('+255712345678');
            expect(payment.metadata.customerName).toBe('John Doe');
            expect(payment.metadata.providerReference).toBe('ref_456');
        });
    });

    describe('Snapshot Creation', () => {
        it('should create immutable snapshot', () => {
            const payment = new Payment(validPaymentProps);

            const snapshot = payment.toObject();

            expect(snapshot.id).toBe('pay_123');
            expect(snapshot.amount).toBe(10000);
            expect(snapshot.status).toBe(PaymentStatus.PENDING);
        });

        it('should create independent snapshot', () => {
            const payment = new Payment(validPaymentProps);

            const snapshot1 = payment.toObject();
            payment.updateStatus(PaymentStatus.PROCESSING);
            const snapshot2 = payment.toObject();

            expect(snapshot1.status).toBe(PaymentStatus.PENDING);
            expect(snapshot2.status).toBe(PaymentStatus.PROCESSING);
        });
    });

    describe('Edge Cases', () => {
        it('should handle very large amounts', () => {
            const payment = new Payment({
                ...validPaymentProps,
                amount: 999999999
            });

            expect(payment.amount).toBe(999999999);
            const fees = payment.calculateFees();
            expect(fees.totalFee).toBeGreaterThan(0);
        });

        it('should handle multiple refunds', () => {
            const payment = new Payment({
                ...validPaymentProps,
                amount: 10000,
                status: PaymentStatus.COMPLETED,
                completedAt: new Date()
            });

            payment.recordRefund(3000);
            expect(payment.refundedAmount).toBe(3000);

            payment.recordRefund(2000);
            expect(payment.refundedAmount).toBe(5000);

            payment.recordRefund(5000);
            expect(payment.refundedAmount).toBe(10000);
            expect(payment.status).toBe(PaymentStatus.REFUNDED);
        });

        it('should handle metadata with special characters', () => {
            const payment = new Payment({
                ...validPaymentProps,
                metadata: {
                    customerName: "O'Brien & Sons",
                    customerEmail: 'test+tag@example.com'
                }
            });

            expect(payment.metadata.customerName).toBe("O'Brien & Sons");
            expect(payment.metadata.customerEmail).toBe('test+tag@example.com');
        });
    });
});

