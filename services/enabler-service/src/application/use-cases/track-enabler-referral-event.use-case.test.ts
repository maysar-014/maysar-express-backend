import { TrackEnablerReferralEventUseCase } from './track-enabler-referral-event.use-case';
import { EnablerEntity } from '../../domain/entities/enabler.entity';
import { Enabler_Status, Enabler_Tier } from '../../domain/types/enabler.types';

describe('TrackEnablerReferralEventUseCase', () => {
    it('increments the selected referral metric and returns the refreshed summary', async () => {
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
            totalSales: 0,
            totalOrders: 0,
            conversionRate: 0,
            totalCommissionEarned: 0,
            createdAt: new Date('2026-03-23T09:00:00.000Z'),
            updatedAt: new Date('2026-03-23T10:00:00.000Z')
        });

        const enablerRepository = {
            findById: jest.fn().mockResolvedValue(enabler)
        };
        const analyticsRepository = {
            getSnapshot: jest.fn().mockResolvedValue({
                totalSales: 0,
                totalOrders: 0,
                conversionRate: 0,
                totalCommissions: 0,
                metadata: {
                    referralLink: {
                        clicks: 4
                    }
                }
            }),
            upsertReferralTracking: jest.fn().mockResolvedValue(undefined)
        };
        const getReferralLinkUseCase = {
            execute: jest.fn().mockResolvedValue({
                tracking: { clicks: 5 }
            })
        };

        const useCase = new TrackEnablerReferralEventUseCase(
            enablerRepository as never,
            analyticsRepository as never,
            getReferralLinkUseCase as never
        );

        const result = await useCase.execute(enabler.id, 'click');

        expect(analyticsRepository.upsertReferralTracking).toHaveBeenCalledWith(
            enabler.id,
            expect.objectContaining({ clicks: 5 })
        );
        expect(result.tracking.clicks).toBe(5);
    });
});
