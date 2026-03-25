import { GetEnablerReferralLinkUseCase } from './get-enabler-referral-link.use-case';
import { EnablerEntity } from '../../domain/entities/enabler.entity';
import { Enabler_Status, Enabler_Tier } from '../../domain/types/enabler.types';

describe('GetEnablerReferralLinkUseCase', () => {
    const enabler = EnablerEntity.create({
        id: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        userId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        enablerCode: 'ENB-Q69G5F',
        enablerCodeShort: 'EQ69G5F',
        businessName: 'Contract Test Enabler',
        contactEmail: 'enabler.contract@example.com',
        status: Enabler_Status.ACTIVE,
        verificationStatus: 'verified',
        tier: Enabler_Tier.GOLD,
        commissionRate: 0.15,
        totalSales: 450000,
        totalOrders: 12,
        conversionRate: 0.25,
        totalCommissionEarned: 72000,
        createdAt: new Date('2026-03-23T09:00:00.000Z'),
        updatedAt: new Date('2026-03-23T10:00:00.000Z')
    });

    it('returns the canonical enabler referral link and tracking summary', async () => {
        const enablerRepository = {
            findById: jest.fn().mockResolvedValue(enabler)
        };
        const analyticsRepository = {
            getSnapshot: jest.fn().mockResolvedValue({
                totalSales: 450000,
                totalOrders: 12,
                conversionRate: 0.25,
                totalCommissions: 72000,
                metadata: {
                    referralLink: {
                        landingPath: '/discover',
                        campaignName: 'Ramadan Promo',
                        generatedAt: '2026-03-23T10:00:00.000Z',
                        updatedAt: '2026-03-23T10:05:00.000Z',
                        clicks: 40,
                        signUps: 8,
                        checkouts: 5,
                        conversions: 4,
                        lastTrackedAt: '2026-03-23T10:15:00.000Z'
                    }
                }
            })
        };

        const useCase = new GetEnablerReferralLinkUseCase(
            enablerRepository as never,
            analyticsRepository as never,
            'https://maysar.co.tz'
        );

        const result = await useCase.execute(enabler.id);

        expect(result.shareUrl).toBe('https://maysar.co.tz/discover?enablerCode=ENB-Q69G5F');
        expect(result.shortUrl).toBe('https://maysar.co.tz/discover?enablerCode=EQ69G5F');
        expect(result.tracking.clicks).toBe(40);
        expect(result.tracking.ordersAttributed).toBe(12);
        expect(result.tracking.commissionEarned).toBe(72000);
        expect(result.campaignName).toBe('Ramadan Promo');
    });
});
