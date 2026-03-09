import { CourierRegisteredHandler } from './courier-registered.handler';

describe('CourierRegisteredHandler', () => {
  it('logs initialization message for new courier', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const handler = new CourierRegisteredHandler();

    await handler.handle({ courierId: 'courier-1' });

    expect(logSpy).toHaveBeenCalledWith(
      'Initializing training requirements for new courier: courier-1'
    );
    logSpy.mockRestore();
  });
});
