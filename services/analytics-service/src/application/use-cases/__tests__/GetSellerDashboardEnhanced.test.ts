import { GetSellerDashboardEnhanced } from '../GetSellerDashboardEnhanced';
import prisma from '../../../infrastructure/database/prisma';

describe('GetSellerDashboardEnhanced - Profitability Score', () => {
  const useCase = new GetSellerDashboardEnhanced();
  const sellerId = 'test-seller-profitability';

  beforeEach(async () => {
    await prisma.analytics_SellerMetrics.deleteMany({
      where: { sellerId }
    });
  });

  it('should return profitability score with correct shape', async () => {
    await prisma.analytics_SellerMetrics.create({
      data: {
        sellerId,
        profitabilityScore: 75
      }
    });

    const result = await useCase.execute(sellerId);

    expect(result.profitabilityScore).toBeDefined();
    expect(result.profitabilityScore.score).toBe(75);
    expect(result.profitabilityScore.status).toBe('Good');
    expect(result.profitabilityScore.breakdown).toBeDefined();
  });

  it('should calculate breakdown components correctly', async () => {
    await prisma.analytics_SellerMetrics.create({
      data: {
        sellerId,
        profitabilityScore: 100
      }
    });

    const result = await useCase.execute(sellerId);
    const { breakdown } = result.profitabilityScore;

    expect(breakdown.salesGrowth).toBe(30); // 100 * 0.3
    expect(breakdown.repeatBuyers).toBe(20); // 100 * 0.2
    expect(breakdown.responseTime).toBe(15); // 100 * 0.15
    expect(breakdown.orderCompletion).toBe(20); // 100 * 0.2
    expect(breakdown.inventoryStability).toBe(15); // 100 * 0.15
  });

  it('should return Excellent status for score >= 80', async () => {
    await prisma.analytics_SellerMetrics.create({
      data: {
        sellerId,
        profitabilityScore: 85
      }
    });

    const result = await useCase.execute(sellerId);
    expect(result.profitabilityScore.status).toBe('Excellent');
  });

  it('should return Good status for score 60-79', async () => {
    await prisma.analytics_SellerMetrics.create({
      data: {
        sellerId,
        profitabilityScore: 65
      }
    });

    const result = await useCase.execute(sellerId);
    expect(result.profitabilityScore.status).toBe('Good');
  });

  it('should return Fair status for score 40-59', async () => {
    await prisma.analytics_SellerMetrics.create({
      data: {
        sellerId,
        profitabilityScore: 50
      }
    });

    const result = await useCase.execute(sellerId);
    expect(result.profitabilityScore.status).toBe('Fair');
  });

  it('should return Needs Improvement status for score < 40', async () => {
    await prisma.analytics_SellerMetrics.create({
      data: {
        sellerId,
        profitabilityScore: 30
      }
    });

    const result = await useCase.execute(sellerId);
    expect(result.profitabilityScore.status).toBe('Needs Improvement');
  });

  it('should default to 0 score when metrics not found', async () => {
    const result = await useCase.execute(sellerId);

    expect(result.profitabilityScore.score).toBe(0);
    expect(result.profitabilityScore.status).toBe('Needs Improvement');
  });
});
