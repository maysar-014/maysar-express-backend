import { GetHappinessSignals } from '../GetHappinessSignals';
import { SellerAnalyticsRepository } from '../../../infrastructure/repositories/SellerAnalyticsRepository';
import { SellerHappinessEngine } from '../../../domain/engines/SellerHappinessEngine';

describe('GetHappinessSignals', () => {
    it('aggregates product and referral data into happiness metrics', async () => {
        const repository = {
            getProductExpansionData: jest.fn().mockResolvedValue([
                { sellerId: 's1', createdAt: new Date('2026-01-10T00:00:00.000Z') },
                { sellerId: 's1', createdAt: new Date('2026-01-12T00:00:00.000Z') }
            ]),
            getReferralData: jest.fn().mockResolvedValue([
                { id: 'r1', referrerId: 's1', status: 'completed' }
            ]),
            getSellerActivityData: jest.fn().mockResolvedValue([
                { id: 's1', createdAt: new Date('2025-12-01T00:00:00.000Z') }
            ])
        } as unknown as jest.Mocked<
            Pick<
                SellerAnalyticsRepository,
                'getProductExpansionData' | 'getReferralData' | 'getSellerActivityData'
            >
        >;

        const engine = {
            calculateMetrics: jest.fn().mockReturnValue({
                productExpansionRate: 75,
                referralCount: 5
            })
        } as unknown as jest.Mocked<Pick<SellerHappinessEngine, 'calculateMetrics'>>;

        const useCase = new GetHappinessSignals(
            repository as unknown as SellerAnalyticsRepository,
            engine as unknown as SellerHappinessEngine
        );

        const result = await useCase.execute();

        expect(repository.getSellerActivityData).toHaveBeenCalledWith(90);
        expect(engine.calculateMetrics).toHaveBeenCalledWith(
            [
                {
                    sellerId: 's1',
                    userCreatedAt: new Date('2025-12-01T00:00:00.000Z'),
                    firstProductAddedAt: new Date('2026-01-10T00:00:00.000Z'),
                    totalProductsAdded: 2
                }
            ],
            [{ referrerId: 's1', referralId: 'r1', status: 'completed' }]
        );
        expect(result).toEqual({
            productExpansionRate: 75,
            referralCount: 5
        });
    });
});
