import { EnablerEntity, EnablerProfileProps } from '../../entities/enabler.entity';
import { Enabler_Status, Enabler_Tier } from '../../types/enabler.types';

describe('EnablerEntity', () => {
    const validProps: EnablerProfileProps = {
        id: 'enabler-123',
        userId: 'user-123',
        businessName: 'My Business',
        contactEmail: 'test@example.com',
        status: Enabler_Status.APPROVED,
        verificationStatus: 'verified',
        tier: Enabler_Tier.BRONZE,
        commissionRate: 0.15,
        totalSales: 0,
        totalOrders: 0,
        conversionRate: 0,
        totalCommissionEarned: 0,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    describe('creation and validation', () => {
        it('should create a valid EnablerEntity', () => {
            const enabler = EnablerEntity.create(validProps);
            expect(enabler.id).toBe(validProps.id);
            expect(enabler.businessName).toBe(validProps.businessName);
            expect(enabler.status).toBe(Enabler_Status.APPROVED);
            expect(enabler.tier).toBe(Enabler_Tier.BRONZE);
        });

        it('should export plain object', () => {
            const enabler = EnablerEntity.create(validProps);
            const plain = enabler.toPlainObject();
            expect(plain).toEqual(validProps);
        });
    });

    describe('business logic', () => {
        it('should check if can list products', () => {
            const approvedEnabler = EnablerEntity.create({ ...validProps, status: Enabler_Status.APPROVED });
            const suspendedEnabler = EnablerEntity.create({ ...validProps, status: Enabler_Status.SUSPENDED });
            const pendingEnabler = EnablerEntity.create({ ...validProps, status: Enabler_Status.PENDING });

            expect(approvedEnabler.canListProducts()).toBe(true);
            expect(suspendedEnabler.canListProducts()).toBe(false);
            expect(pendingEnabler.canListProducts()).toBe(false);
        });

        it('should check if can facilitate orders', () => {
            const activeEnabler = EnablerEntity.create({ ...validProps, status: Enabler_Status.ACTIVE });
            const approvedEnabler = EnablerEntity.create({ ...validProps, status: Enabler_Status.APPROVED });

            expect(activeEnabler.canFacilitateOrders()).toBe(true);
            expect(approvedEnabler.canFacilitateOrders()).toBe(false);
        });

        it('should calculate commission rate correctly', () => {
            const bronzeEnabler = EnablerEntity.create({ ...validProps, tier: Enabler_Tier.BRONZE, commissionRate: 0.15 });
            const silverEnabler = EnablerEntity.create({ ...validProps, tier: Enabler_Tier.SILVER, commissionRate: 0.15 });

            // Base rate * tier adjustment
            expect(bronzeEnabler.calculateCommissionRate(100)).toBe(0.15); // 0.15 * 1.0
            expect(silverEnabler.calculateCommissionRate(100)).toBeCloseTo(0.165); // 0.15 * 1.1
        });

        it('should cap commission rate at 25%', () => {
            const highRateEnabler = EnablerEntity.create({ ...validProps, commissionRate: 0.30 });
            expect(highRateEnabler.calculateCommissionRate(100)).toBe(0.25);
        });

        it('should determine tier upgrade eligibility', () => {
            const notEligible = EnablerEntity.create(validProps);
            expect(notEligible.isEligibleForTierUpgrade()).toBe(false);

            const eligible = EnablerEntity.create({
                ...validProps,
                totalSales: 15000,
                customerRating: 4.5,
                conversionRate: 0.06
            });
            expect(eligible.isEligibleForTierUpgrade()).toBe(true);
        });
    });

    describe('state transitions', () => {
        it('should approve pending enabler', () => {
            const enabler = EnablerEntity.create({ ...validProps, status: Enabler_Status.PENDING });
            enabler.approve('admin-1');
            expect(enabler.status).toBe(Enabler_Status.APPROVED);
        });

        it('should activate approved enabler', () => {
            const enabler = EnablerEntity.create({ ...validProps, status: Enabler_Status.APPROVED });
            enabler.activate();
            expect(enabler.status).toBe(Enabler_Status.ACTIVE);
        });

        it('should suspend active enabler', () => {
            const enabler = EnablerEntity.create({ ...validProps, status: Enabler_Status.ACTIVE });
            enabler.suspend('Violation');
            expect(enabler.status).toBe(Enabler_Status.SUSPENDED);
        });

        it('should reject pending enabler', () => {
            const enabler = EnablerEntity.create({ ...validProps, status: Enabler_Status.PENDING });
            enabler.reject('Incomplete docs');
            expect(enabler.status).toBe(Enabler_Status.REJECTED);
        });

        it('should upgrade tier', () => {
            const enabler = EnablerEntity.create({
                ...validProps,
                totalSales: 15000,
                customerRating: 4.5,
                conversionRate: 0.06
            });
            enabler.upgradeTier();
            expect(enabler.tier).toBe(Enabler_Tier.SILVER);
        });

        it('should downgrade tier', () => {
            const enabler = EnablerEntity.create({ ...validProps, tier: Enabler_Tier.SILVER });
            enabler.downgradeTier('Performance drop');
            expect(enabler.tier).toBe(Enabler_Tier.BRONZE);
        });

        it('should update performance metrics', () => {
            const enabler = EnablerEntity.create(validProps);
            enabler.updatePerformanceMetrics(1000, 10, 4.8, 0.05);
            expect(enabler.totalSales).toBe(1000);
            expect(enabler.totalOrders).toBe(10);
            expect(enabler.conversionRate).toBe(0.05);
        });
    });
});
