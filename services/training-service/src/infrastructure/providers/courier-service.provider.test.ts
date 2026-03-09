import { CourierServiceProvider } from './courier-service.provider';

describe('CourierServiceProvider', () => {
  it('logs eligibility update request', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const provider = new CourierServiceProvider();

    await provider.updateEligibility('courier-2', true);

    expect(logSpy).toHaveBeenCalledWith('Updating eligibility for courier courier-2 to true');
    logSpy.mockRestore();
  });
});
