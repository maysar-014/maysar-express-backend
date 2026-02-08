import { Payment, PaymentStatus, PaymentMethod, PaymentProvider } from '../payment.entity';

describe('Payment Entity', () => {
    const validProps = {
        id: 'pay_123',
        orderId: 'ord_123',
        userId: 'usr_123',
        amount: 1000,
        currency: 'TZS',
        method: PaymentMethod.MPESA,
        provider: PaymentProvider.PESAPAL,
        status: PaymentStatus.PENDING,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    describe('Constructor', () => {
        it('should create a valid payment', () => {
            const payment = new Payment(validProps);
            expect(payment).toBeDefined();
            expect(payment.id).toBe(validProps.id);
            expect(payment.status).toBe(PaymentStatus.PENDING);
            expect(payment.amount).toBe(1000);
            expect(payment.method).toBe(PaymentMethod.MPESA);
            expect(payment.provider).toBe(PaymentProvider.PESAPAL);
        });

        it('should throw error when ID is missing', () => {
            expect(() => new Payment({ ...validProps, id: '' })).toThrow('Payment ID is required');
        });

        it('should throw error when Order ID is missing', () => {
            expect(() => new Payment({ ...validProps, orderId: '' })).toThrow('Order ID is required');
        });

        it('should throw error when User ID is missing', () => {
            expect(() => new Payment({ ...validProps, userId: '' })).toThrow('User ID is required');
        });

        it('should throw error when Amount is not positive', () => {
            expect(() => new Payment({ ...validProps, amount: 0 })).toThrow('Payment amount must be positive');
            expect(() => new Payment({ ...validProps, amount: -100 })).toThrow('Payment amount must be positive');
        });

        it('should throw error when Currency is missing', () => {
            expect(() => new Payment({ ...validProps, currency: '' })).toThrow('Currency is required');
        });

        // Use type assertion to bypass compile-time check for invalid enum values in tests
        it('should throw error for invalid Payment Method', () => {
            expect(() => new Payment({ ...validProps, method: 'INVALID' as PaymentMethod })).toThrow('Invalid payment method: INVALID');
        });

        it('should throw error for invalid Payment Provider', () => {
            expect(() => new Payment({ ...validProps, provider: 'INVALID' as PaymentProvider })).toThrow('Invalid payment provider: INVALID');
        });

        it('should throw error for invalid Payment Status', () => {
            expect(() => new Payment({ ...validProps, status: 'INVALID' as PaymentStatus })).toThrow('Invalid payment status: INVALID');
        });
    });

    describe('Status Transitions', () => {
        it('should transition from PENDING to PROCESSING', () => {
            const payment = new Payment(validProps);
            payment.updateStatus(PaymentStatus.PROCESSING);
            expect(payment.status).toBe(PaymentStatus.PROCESSING);
        });

        it('should transition from PENDING to FAILED', () => {
            const payment = new Payment(validProps);
            payment.updateStatus(PaymentStatus.FAILED, 'Network error');
            expect(payment.status).toBe(PaymentStatus.FAILED);
            expect(payment.failureReason).toBe('Network error');
        });

        it('should transition from PENDING to CANCELLED', () => {
            const payment = new Payment(validProps);
            payment.updateStatus(PaymentStatus.CANCELLED);
            expect(payment.status).toBe(PaymentStatus.CANCELLED);
        });

        it('should transition from PROCESSING to COMPLETED', () => {
            const payment = new Payment({ ...validProps, status: PaymentStatus.PROCESSING });
            payment.updateStatus(PaymentStatus.COMPLETED);
            expect(payment.status).toBe(PaymentStatus.COMPLETED);
            expect(payment.completedAt).toBeDefined();
        });

        it('should transition from COMPLETED to PARTIALLY_REFUNDED', () => {
            const payment = new Payment({ ...validProps, status: PaymentStatus.COMPLETED });
            payment.updateStatus(PaymentStatus.PARTIALLY_REFUNDED);
            expect(payment.status).toBe(PaymentStatus.PARTIALLY_REFUNDED);
        });

        it('should transition from COMPLETED to REFUNDED', () => {
            const payment = new Payment({ ...validProps, status: PaymentStatus.COMPLETED });
            payment.updateStatus(PaymentStatus.REFUNDED);
            expect(payment.status).toBe(PaymentStatus.REFUNDED);
        });

        it('should throw error for invalid transition PENDING -> REFUNDED', () => {
            const payment = new Payment(validProps);
            expect(() => payment.updateStatus(PaymentStatus.REFUNDED)).toThrow('Invalid status transition from PENDING to REFUNDED');
        });

        it('should throw error for invalid transition COMPLETED -> PENDING', () => {
            const payment = new Payment({ ...validProps, status: PaymentStatus.COMPLETED });
            expect(() => payment.updateStatus(PaymentStatus.PENDING)).toThrow('Invalid status transition from COMPLETED to PENDING');
        });
    });

    describe('Mark As Completed', () => {
        it('should mark processing payment as completed', () => {
            const payment = new Payment({ ...validProps, status: PaymentStatus.PROCESSING });
            payment.markAsCompleted('trans_123');
            expect(payment.status).toBe(PaymentStatus.COMPLETED);
            expect(payment.metadata.providerTransactionId).toBe('trans_123');
            expect(payment.completedAt).toBeDefined();
        });

        it('should throw error if already completed', () => {
            const payment = new Payment({ ...validProps, status: PaymentStatus.COMPLETED });
            expect(() => payment.markAsCompleted()).toThrow('Payment is already completed');
        });
    });

    describe('Mark As Failed', () => {
        it('should mark pending payment as failed', () => {
            const payment = new Payment(validProps);
            payment.markAsFailed('Insufficient funds');
            expect(payment.status).toBe(PaymentStatus.FAILED);
            expect(payment.failureReason).toBe('Insufficient funds');
        });

        it('should throw error if already completed', () => {
            const payment = new Payment({ ...validProps, status: PaymentStatus.COMPLETED });
            expect(() => payment.markAsFailed('Fail')).toThrow('Cannot fail a completed payment');
        });
    });

    describe('Refund Logic', () => {
        let payment: Payment;

        beforeEach(() => {
            payment = new Payment({ ...validProps, status: PaymentStatus.COMPLETED });
        });

        it('should be refundable initially', () => {
            expect(payment.canRefund()).toBe(true);
            expect(payment.getRefundableAmount()).toBe(1000);
        });

        it('should record partial refund', () => {
            payment.recordRefund(500);
            expect(payment.refundedAmount).toBe(500);
            expect(payment.status).toBe(PaymentStatus.PARTIALLY_REFUNDED);
            expect(payment.getRefundableAmount()).toBe(500);
        });

        it('should record full refund', () => {
            payment.recordRefund(1000);
            expect(payment.refundedAmount).toBe(1000);
            expect(payment.status).toBe(PaymentStatus.REFUNDED);
            expect(payment.getRefundableAmount()).toBe(0);
        });

        it('should throw error if payment is not completed', () => {
            const pendingPayment = new Payment({ ...validProps, status: PaymentStatus.PENDING });
            expect(() => pendingPayment.recordRefund(100)).toThrow('Payment cannot be refunded');
        });

        it('should throw error if refund amount exceeds refundable amount', () => {
            expect(() => payment.recordRefund(1100)).toThrow('Refund amount 1100 exceeds refundable amount 1000');
        });

        it('should throw error if refund amount is not positive', () => {
            expect(() => payment.recordRefund(0)).toThrow('Refund amount must be positive');
            expect(() => payment.recordRefund(-100)).toThrow('Refund amount must be positive');
        });
    });

    describe('Fee Calculation', () => {
        it('should calculate fees for MPESA (1.5%)', () => {
            const payment = new Payment({ ...validProps, method: PaymentMethod.MPESA, amount: 1000 });
            const fees = payment.calculateFees();
            // Platform 2% = 20, Provider 1.5% = 15, Total = 35
            expect(fees.platformFee).toBe(20);
            expect(fees.providerFee).toBe(15);
            expect(fees.totalFee).toBe(35);
        });

        it('should calculate fees for CARD (2.9%)', () => {
            const payment = new Payment({ ...validProps, method: PaymentMethod.CARD, amount: 1000 });
            const fees = payment.calculateFees();
            // Platform 2% = 20, Provider 2.9% = 29, Total = 49
            expect(fees.platformFee).toBe(20);
            expect(fees.providerFee).toBe(29);
            expect(fees.totalFee).toBe(49);
        });

        it('should calculate fees for WALLET (0%)', () => {
            const payment = new Payment({ ...validProps, method: PaymentMethod.WALLET, amount: 1000 });
            const fees = payment.calculateFees();
            // Platform 2% = 20, Provider 0% = 0, Total = 20
            expect(fees.platformFee).toBe(20);
            expect(fees.providerFee).toBe(0);
            expect(fees.totalFee).toBe(20);
        });
    });

    describe('Metadata', () => {
        it('should update metadata', () => {
            const payment = new Payment(validProps);
            payment.updateMetadata({ customerEmail: 'test@example.com' });
            expect(payment.metadata.customerEmail).toBe('test@example.com');
        });

        it('should merge metadata properties', () => {
            const payment = new Payment({ ...validProps, metadata: { key1: 'value1' } });
            payment.updateMetadata({ key2: 'value2' });
            expect(payment.metadata.key1).toBe('value1');
            expect(payment.metadata.key2).toBe('value2');
        });
    });
});
