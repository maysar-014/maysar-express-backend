import { CatalogService } from './catalog-service-contracts';

describe('CatalogService contracts', () => {
  it('defines product and pricing event/command payload shapes', () => {
    const published: CatalogService.Events.ProductPublished = {
      productId: 'prod-1',
      name: 'Tea',
      price: { amount: 1500, currency: 'TZS' },
      publishedAt: new Date('2026-01-01T00:00:00.000Z')
    };
    const updatePrice: CatalogService.Commands.UpdatePrice = {
      productId: 'prod-1',
      price: { amount: 1800, currency: 'TZS' }
    };
    const calculate: CatalogService.Pricing.Commands.CalculatePrice = {
      baseCost: 1000,
      desiredProfit: 200,
      productCategory: 'food',
      condition: 'new',
      commissionPercentage: 0.1,
      paymentGatewayPercentage: 0.03,
      minimumSellerMarginPercentage: 0.1,
      minimumPlatformMarginPercentage: 0.05,
      phase: 'phase1',
      market: { demandLevel: 'high', competitorPrices: [1700, 1800] }
    };

    expect(published.price.amount).toBe(1500);
    expect(updatePrice.price.currency).toBe('TZS');
    expect(calculate.market?.demandLevel).toBe('high');
  });

  it('defines campaign payload shapes', () => {
    const started: CatalogService.Campaign.Events.CampaignStarted = {
      campaignId: 'camp-1',
      name: 'Q1 Promo',
      startedAt: new Date('2026-01-01T08:00:00.000Z')
    };
    const end: CatalogService.Campaign.Commands.EndCampaign = {
      campaignId: 'camp-1',
      reason: 'budget exhausted'
    };

    expect(started.campaignId).toBe('camp-1');
    expect(end.reason).toContain('budget');
  });
});
