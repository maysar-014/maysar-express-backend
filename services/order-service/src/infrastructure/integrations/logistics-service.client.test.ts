import { LogisticsServiceClient } from './logistics-service.client';

describe('LogisticsServiceClient', () => {
  it('returns stubbed COD and cross-region results', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const client = new LogisticsServiceClient();

    await expect(client.isCODSupportedInArea({ city: 'Dar' })).resolves.toBe(true);
    await expect(client.isCrossRegionDelivery({ city: 'Dar' }, { city: 'Dar' })).resolves.toBe(
      false
    );
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
