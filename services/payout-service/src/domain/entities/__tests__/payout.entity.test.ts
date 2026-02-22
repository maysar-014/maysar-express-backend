import { Payout, PayoutStatus, PayoutMethod, PayoutProps } from '../payout.entity';

describe('Payout Entity', () => {
    const validProps: PayoutProps = {
        id: 'payout-123',
        userId: 'user-456',
        userRole: 'SELLER',
        amount: 50000,
        currency: 'TZS',
        method: PayoutMethod.BANK_TRANSFER,
        status: PayoutStatus.PENDING,
        bankDetails: {
            bankName: 'CRDB',
            bankCode: 'CRDB',
            accountNumber: '1234567890',
            accountName: 'John Doe',
        },
        fee: 500,
        netAmount: 49500,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    describe('Creation and Validation', () => {
        it('should create a valid payout', () => {
            const payout = new Payout(validProps);
            expect(payout.id).toBe(validProps.id);
            expect(payout.status).toBe(PayoutStatus.PENDING);
            expect(payout.validate()).toBe(true);
        });

        it('should throw error when ID is missing', () => {
            expect(() => new Payout({ ...validProps, id: '' })).toThrow('Payout ID is required');
        });

        it('should throw error when amount is not positive', () => {
            expect(() => new Payout({ ...validProps, amount: 0 })).toThrow('Payout amount must be positive');
        });

        it('should throw error for invalid method details', () => {
            const invalidProps = { ...validProps, method: PayoutMethod.MOBILE_MONEY, bankDetails: undefined };
            // Constructor validates basic props, validate() method checks method-specifics
            // Actually, validateProps is called in constructor, but validateMethodSpecificDetails is called in validate()
            const payout = new Payout(invalidProps);
            expect(payout.validate()).toBe(false);
        });

        it('should validate net amount consistency', () => {
            expect(() => new Payout({ ...validProps, netAmount: 50000 })).toThrow('Invalid net amount');
        });
    });

    describe('Fee Calculation', () => {
        it('should calculate correct fee for Bank Transfer', () => {
            const payout = new Payout({ ...validProps, method: PayoutMethod.BANK_TRANSFER, amount: 100000 });
            // 1% of 100,000 = 1,000. Min 500, Max 10,000.
            expect(payout.calculateFee()).toBe(1000);
        });

        it('should respect minimum fee for Bank Transfer', () => {
            const payout = new Payout({ ...validProps, method: PayoutMethod.BANK_TRANSFER, amount: 10000 });
            // 1% of 10,000 = 100. Min 500.
            expect(payout.calculateFee()).toBe(500);
        });

        it('should respect maximum fee for Bank Transfer', () => {
            const payout = new Payout({ ...validProps, method: PayoutMethod.BANK_TRANSFER, amount: 2000000 });
            // 1% of 2,000,000 = 20,000. Max 10,000.
            expect(payout.calculateFee()).toBe(10000);
        });

        it('should calculate correct fee for Mobile Money', () => {
            const payout = new Payout({
                ...validProps,
                method: PayoutMethod.MOBILE_MONEY,
                mobileMoneyDetails: {
                    provider: 'M-Pesa',
                    phoneNumber: '255754123456',
                    accountName: 'John Doe'
                },
                bankDetails: undefined,
                amount: 100000
            });
            // 1.5% of 100,000 = 1,500. Min 300, Max 5,000.
            expect(payout.calculateFee()).toBe(1500);
        });

        it('should return zero fee for Wallet', () => {
            const payout = new Payout({
                ...validProps,
                method: PayoutMethod.WALLET,
                amount: 100000,
                fee: 0,
                netAmount: 100000,
                bankDetails: undefined
            });
            expect(payout.calculateFee()).toBe(0);
        });
    });

    describe('State Transitions', () => {
        it('should start processing from PENDING', () => {
            const payout = new Payout(validProps);
            payout.process();
            expect(payout.status).toBe(PayoutStatus.PROCESSING);
            expect(payout.processedAt).toBeInstanceOf(Date);
        });

        it('should throw error when processing non-pending payout', () => {
            const payout = new Payout({ ...validProps, status: PayoutStatus.COMPLETED });
            expect(() => payout.process()).toThrow('Cannot process payout');
        });

        it('should complete payout from PROCESSING', () => {
            const payout = new Payout({ ...validProps, status: PayoutStatus.PROCESSING });
            payout.complete('ref-123');
            expect(payout.status).toBe(PayoutStatus.COMPLETED);
            expect(payout.completedAt).toBeInstanceOf(Date);
            expect(payout.reference).toBe('ref-123');
        });

        it('should throw error when completing non-processing payout', () => {
            const payout = new Payout({ ...validProps, status: PayoutStatus.PENDING });
            expect(() => payout.complete()).toThrow('Must be PROCESSING');
        });

        it('should fail payout from PENDING or PROCESSING', () => {
            const payout1 = new Payout({ ...validProps, status: PayoutStatus.PENDING });
            payout1.fail('Network error');
            expect(payout1.status).toBe(PayoutStatus.FAILED);
            expect(payout1.failureReason).toBe('Network error');

            const payout2 = new Payout({ ...validProps, status: PayoutStatus.PROCESSING });
            payout2.fail('API Error');
            expect(payout2.status).toBe(PayoutStatus.FAILED);
        });

        it('should cancel payout from PENDING', () => {
            const payout = new Payout(validProps);
            payout.cancel();
            expect(payout.status).toBe(PayoutStatus.CANCELLED);
        });
    });

    describe('Detail Validation', () => {
        it('should fail validation if Bank Details missing for Bank Transfer', () => {
            const payout = new Payout({ ...validProps, bankDetails: undefined });
            expect(payout.validate()).toBe(false);
        });

        it('should fail validation if invalid account number', () => {
            const payout = new Payout({
                ...validProps,
                bankDetails: { ...validProps.bankDetails!, accountNumber: '123' } // too short
            });
            expect(payout.validate()).toBe(false);
        });

        it('should fail validation if Mobile Money Details missing for Mobile Money', () => {
            const payout = new Payout({
                ...validProps,
                method: PayoutMethod.MOBILE_MONEY,
                bankDetails: undefined,
                mobileMoneyDetails: undefined
            });
            expect(payout.validate()).toBe(false);
        });

        it('should fail validation if invalid phone number', () => {
            const payout = new Payout({
                ...validProps,
                method: PayoutMethod.MOBILE_MONEY,
                bankDetails: undefined,
                mobileMoneyDetails: {
                    provider: 'M-Pesa',
                    phoneNumber: '12345', // Invalid
                    accountName: 'John'
                }
            });
            expect(payout.validate()).toBe(false);
        });
    });
});
