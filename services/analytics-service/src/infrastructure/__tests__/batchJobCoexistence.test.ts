/**
 * BATCH JOB COEXISTENCE TEST
 *
 * Verifies that SellerMetricsCalculationJob still calls CalculateInventoryHealth
 * (along with all other sub-use-cases) after the RC-4 event-driven handler is
 * introduced. The nightly batch job must continue to run as a full-refresh safety net.
 */

jest.mock(
  '@modules/auth-service/src/infrastructure/services/logger.service',
  () => ({ logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() } }),
  { virtual: true }
);

const mockPrismaForJob = {
  user_User: { findMany: jest.fn() },
  analytics_SellerMetrics: { update: jest.fn() }
};

jest.mock(
  '../database/prisma',
  () => ({ __esModule: true, default: mockPrismaForJob }),
  { virtual: true }
);

// Mock all five sub-use-cases so SellerMetricsCalculationJob can be tested in isolation
const inventoryHealthMock = jest.fn();
const repeatCustomersMock = jest.fn();
const bestProductMock = jest.fn();
const salesTrendMock = jest.fn();
const profitabilityMock = jest.fn();

jest.mock('../../application/use-cases/CalculateInventoryHealth', () => ({
  CalculateInventoryHealth: jest.fn().mockImplementation(() => ({ execute: inventoryHealthMock }))
}));
jest.mock('../../application/use-cases/CalculateRepeatCustomers', () => ({
  CalculateRepeatCustomers: jest.fn().mockImplementation(() => ({ execute: repeatCustomersMock }))
}));
jest.mock('../../application/use-cases/IdentifyBestPerformingProduct', () => ({
  IdentifyBestPerformingProduct: jest.fn().mockImplementation(() => ({ execute: bestProductMock }))
}));
jest.mock('../../application/use-cases/GenerateSalesTrend', () => ({
  GenerateSalesTrend: jest.fn().mockImplementation(() => ({ execute: salesTrendMock }))
}));
jest.mock('../../application/use-cases/CalculateProfitabilityScore', () => ({
  CalculateProfitabilityScore: jest.fn().mockImplementation(() => ({ execute: profitabilityMock }))
}));

import { SellerMetricsCalculationJob } from '../SellerMetricsCalculationJob';

beforeEach(() => {
  jest.clearAllMocks();
  inventoryHealthMock.mockResolvedValue(undefined);
  repeatCustomersMock.mockResolvedValue(undefined);
  bestProductMock.mockResolvedValue(undefined);
  salesTrendMock.mockResolvedValue(undefined);
  profitabilityMock.mockResolvedValue(undefined);
  mockPrismaForJob.analytics_SellerMetrics.update.mockResolvedValue(undefined);
});

describe('Batch job coexistence: SellerMetricsCalculationJob runs all five sub-use-cases', () => {
  it('calls CalculateInventoryHealth for every active seller alongside all other use-cases', async () => {
    mockPrismaForJob.user_User.findMany.mockResolvedValue([
      { id: 'seller-batch-1' },
      { id: 'seller-batch-2' },
      { id: 'seller-batch-3' }
    ]);

    await new SellerMetricsCalculationJob().execute();

    // CalculateInventoryHealth must run for all sellers (RC-4: batch job preserved)
    expect(inventoryHealthMock).toHaveBeenCalledTimes(3);
    expect(inventoryHealthMock).toHaveBeenCalledWith('seller-batch-1');
    expect(inventoryHealthMock).toHaveBeenCalledWith('seller-batch-2');
    expect(inventoryHealthMock).toHaveBeenCalledWith('seller-batch-3');

    // All other sub-use-cases also intact
    expect(repeatCustomersMock).toHaveBeenCalledTimes(3);
    expect(bestProductMock).toHaveBeenCalledTimes(3);
    expect(salesTrendMock).toHaveBeenCalledTimes(3);
    expect(profitabilityMock).toHaveBeenCalledTimes(3);
    expect(mockPrismaForJob.analytics_SellerMetrics.update).toHaveBeenCalledTimes(3);
  });

  it('continues processing remaining sellers if one seller fails', async () => {
    mockPrismaForJob.user_User.findMany.mockResolvedValue([
      { id: 'seller-ok' },
      { id: 'seller-fail' }
    ]);

    inventoryHealthMock
      .mockResolvedValueOnce(undefined)              // seller-ok succeeds
      .mockRejectedValueOnce(new Error('DB error')); // seller-fail throws

    await expect(new SellerMetricsCalculationJob().execute()).resolves.toBeUndefined();
    expect(inventoryHealthMock).toHaveBeenCalledTimes(2);
  });
});
