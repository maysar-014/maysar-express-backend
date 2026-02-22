import { CommissionPolicies } from '../commission-policies';
import { CommissionAmount } from '../../value-objects/monetary.value-object';
import { CommissionType, CommissionStatus } from '../../value-objects/commission-types.value-object';
import { RecipientType } from '../../value-objects/recipient-types.value-object';
import { CommissionFactory } from '../../../__tests__/factories/commission.factory';

describe('CommissionPolicies', () => {
    describe('canCreateCommission', () => {
        it('should allow valid commission creation', () => {
            const amount = CommissionAmount.fromNumber(10);
            const result = CommissionPolicies.canCreateCommission(
                amount,
                CommissionType.SALE,
                RecipientType.SELLER
            );
            expect(result.allowed).toBe(true);
        });

        it('should reject amount below minimum', () => {
            const amount = CommissionAmount.fromNumber(0.5);
            const result = CommissionPolicies.canCreateCommission(
                amount,
                CommissionType.SALE,
                RecipientType.SELLER
            );
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('must be at least $1');
        });

        it('should reject amount above maximum', () => {
            const amount = CommissionAmount.fromNumber(15000);
            const result = CommissionPolicies.canCreateCommission(
                amount,
                CommissionType.SALE,
                RecipientType.SELLER
            );
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('cannot exceed $10000');
        });
    });

    describe('canApproveCommission', () => {
        it('should allow admin to approve random commission', () => {
            const commission = CommissionFactory.create({ status: CommissionStatus.PENDING });
            const result = CommissionPolicies.canApproveCommission(commission, 'admin', 'admin-1');
            expect(result.allowed).toBe(true);
        });

        it('should reject non-pending commission', () => {
            const commission = CommissionFactory.createApproved();
            const result = CommissionPolicies.canApproveCommission(commission, 'admin', 'admin-1');
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('Only pending commissions can be approved');
        });

        it('should reject if approver is the seller', () => {
            const commission = CommissionFactory.create();
            const result = CommissionPolicies.canApproveCommission(
                commission,
                'admin',
                commission.sellerId.toString()
            );
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('Cannot approve your own commissions');
        });
    });

    describe('canPayCommission', () => {
        it('should allow paying approved commission older than 24h', () => {
            const createdAt = new Date();
            createdAt.setDate(createdAt.getDate() - 2);
            const commission = CommissionFactory.createApproved({ createdAt });

            const result = CommissionPolicies.canPayCommission(commission, 'bank_transfer');
            expect(result.allowed).toBe(true);
        });

        it('should reject commission less than 24h old', () => {
            const commission = CommissionFactory.createApproved();
            const result = CommissionPolicies.canPayCommission(commission, 'bank_transfer');
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('must be at least 24 hours old');
        });
    });
});
