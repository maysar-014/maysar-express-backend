import { TrackProductionProgress } from './TrackProductionProgress';

describe('TrackProductionProgress', () => {
  it('returns summarized production progress', async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue({
        producedQty: 120,
        status: 'IN_PROGRESS',
        phase: 'ASSEMBLY'
      })
    };
    const useCase = new TrackProductionProgress(repo as never);

    const result = await useCase.execute('order-1');

    expect(result).toEqual({
      produced: 120,
      status: 'IN_PROGRESS',
      phase: 'ASSEMBLY'
    });
  });

  it('throws when order is missing', async () => {
    const repo = { findById: jest.fn().mockResolvedValue(null) };
    const useCase = new TrackProductionProgress(repo as never);

    await expect(useCase.execute('missing-order')).rejects.toThrow('Order not found');
  });
});
