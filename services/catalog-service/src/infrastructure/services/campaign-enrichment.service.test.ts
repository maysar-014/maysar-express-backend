import { CampaignEnrichmentService } from './campaign-enrichment.service';

const activeCampaign = (overrides: Record<string, any> = {}) => ({
  id: 'campaign-1',
  name: 'Launch Sale',
  type: 'PROMOTION',
  status: 'ACTIVE',
  startDate: new Date('2026-05-01T00:00:00.000Z'),
  endDate: new Date('2026-06-01T00:00:00.000Z'),
  pricingRules: [
    {
      ruleType: 'FIXED_DISCOUNT',
      value: 1000,
      priority: 10
    }
  ],
  ...overrides
});

describe('CampaignEnrichmentService', () => {
  it('selects the best deal across direct and category campaigns', async () => {
    const prisma = {
      campaign_Product: {
        findMany: jest.fn().mockResolvedValue([
          {
            productId: 'product-1',
            originalPrice: { amount: 10000, currency: 'TZS' },
            campaignPrice: { amount: 9000, currency: 'TZS' },
            campaign: activeCampaign({
              id: 'campaign-direct',
              pricingRules: [{ ruleType: 'PERCENTAGE_DISCOUNT', value: 10, priority: 10 }]
            })
          }
        ])
      },
      campaign_Category: {
        findMany: jest.fn().mockResolvedValue([
          {
            categoryId: 'category-1',
            campaign: activeCampaign({
              id: 'campaign-category',
              pricingRules: [{ ruleType: 'FIXED_DISCOUNT', value: 2500, priority: 20 }]
            })
          },
          {
            categoryId: 'category-2',
            campaign: activeCampaign({
              id: 'campaign-fixed-price',
              pricingRules: [{ ruleType: 'FIXED_PRICE', value: 7000, priority: 15 }]
            })
          }
        ])
      }
    };
    const service = new CampaignEnrichmentService(prisma as never);

    const result = await service.fetchActiveCampaigns([
      { id: 'product-1', categoryId: 'category-1', price: { amount: 10000, currency: 'TZS' } },
      { id: 'product-2', categoryId: 'category-2', price: { amount: 10000, currency: 'TZS' } },
      { id: 'product-3', categoryId: 'category-3', price: { amount: 5000, currency: 'TZS' } }
    ]);

    expect(prisma.campaign_Product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          productId: { in: ['product-1', 'product-2', 'product-3'] }
        })
      })
    );
    expect(prisma.campaign_Category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          categoryId: { in: ['category-1', 'category-2', 'category-3'] }
        })
      })
    );

    const product1 = result.get('product-1');
    const product2 = result.get('product-2');

    expect(product1).toEqual(
      expect.objectContaining({
        campaignId: 'campaign-category',
        discountValue: 2500,
        discountedPrice: { amount: 7500, currency: 'TZS' },
        ruleType: 'FIXED_DISCOUNT'
      })
    );
    expect(product2).toEqual(
      expect.objectContaining({
        campaignId: 'campaign-fixed-price',
        discountValue: 3000,
        discountedPrice: { amount: 7000, currency: 'TZS' },
        ruleType: 'FIXED_PRICE'
      })
    );
    expect(result.has('product-3')).toBe(false);
  });

  it('returns an empty map when campaign queries fail', async () => {
    const prisma = {
      campaign_Product: {
        findMany: jest.fn().mockRejectedValue(new Error('database unavailable'))
      },
      campaign_Category: {
        findMany: jest.fn()
      }
    };
    const service = new CampaignEnrichmentService(prisma as never);

    await expect(
      service.fetchActiveCampaigns([{ id: 'product-1', categoryId: 'category-1', price: { amount: 10000, currency: 'TZS' } }])
    ).resolves.toEqual(new Map());
  });
});
