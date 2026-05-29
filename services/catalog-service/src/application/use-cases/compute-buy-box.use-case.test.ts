const computeMock = jest.fn();

jest.mock('../../domain/engines/buy-box.engine', () => ({
  BuyBoxEngine: {
    compute: (...args: unknown[]) => computeMock(...args)
  }
}));

import { ComputeBuyBoxUseCase } from './compute-buy-box.use-case';

describe('ComputeBuyBoxUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null buy-box response when no eligible listings are found', async () => {
    computeMock.mockReturnValue(null);
    const useCase = new ComputeBuyBoxUseCase(
      { save: jest.fn() } as never,
      { publishComputed: jest.fn() } as never,
      { weight: true } as never
    );

    const result = await useCase.execute({
      productId: 'p1',
      listings: []
    } as never);

    expect(result.productId).toBe('p1');
    expect(result.primarySellerId).toBeNull();
    expect(result.alternatives).toEqual([]);
  });

  it('persists and publishes computed buy-box result', async () => {
    computeMock.mockReturnValue({
      productId: 'p2',
      primarySellerId: 'seller-1',
      primaryScore: 92.5,
      alternatives: [{ sellerId: 'seller-2', score: 90, rank: 2 }],
      computedAt: new Date('2026-03-09T12:00:00.000Z'),
      anomalyFlags: [{ signalName: 'stockReliability', detectedValue: 100, expectedMin: 0, expectedMax: 50, substitutedValue: 50 }]
    });
    const buyBoxRepository = { save: jest.fn().mockResolvedValue(undefined) };
    const eventPublisher = { publishComputed: jest.fn().mockResolvedValue(undefined) };
    const useCase = new ComputeBuyBoxUseCase(
      buyBoxRepository as never,
      eventPublisher as never,
      { weight: true } as never
    );

    const result = await useCase.execute({
      productId: 'p2',
      listings: [{ sellerId: 'seller-1' }]
    } as never);

    expect(buyBoxRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'p2',
        primarySellerId: 'seller-1'
      })
    );
    expect(eventPublisher.publishComputed).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'BuyBoxComputed',
        productId: 'p2',
        primarySellerId: 'seller-1'
      })
    );
    expect(result).toEqual({
      productId: 'p2',
      primarySellerId: 'seller-1',
      primaryScore: 92.5,
      alternatives: [{ sellerId: 'seller-2', score: 90, rank: 2 }],
      lastComputedAt: new Date('2026-03-09T12:00:00.000Z'),
      anomalyFlags: [{ signalName: 'stockReliability', detectedValue: 100, expectedMin: 0, expectedMax: 50, substitutedValue: 50 }]
    });
  });
});

