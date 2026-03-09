const subscribeMock = jest.fn();

jest.mock('../../../../../shared/events/eventBus', () => ({
  eventBus: {
    subscribe: subscribeMock
  }
}));

import { AuthEventHandlers } from './auth.event-handlers';

describe('AuthEventHandlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registerHandlers subscribes expected event names and consumer names', () => {
    const handlers = new AuthEventHandlers({} as any);

    handlers.registerHandlers();

    expect(subscribeMock).toHaveBeenCalledTimes(2);
    expect(subscribeMock).toHaveBeenNthCalledWith(
      1,
      'AdminPermissionValidationRequested',
      expect.objectContaining({ name: 'auth-permission-validation', handler: expect.any(Function) })
    );
    expect(subscribeMock).toHaveBeenNthCalledWith(
      2,
      'UserCreationRequested',
      expect.objectContaining({ name: 'auth-user-creation', handler: expect.any(Function) })
    );
  });

  it('registered handlers can process envelopes without throwing', async () => {
    const handlers = new AuthEventHandlers({} as any);
    handlers.registerHandlers();

    const adminValidationHandler = subscribeMock.mock.calls[0][1].handler;
    const userCreationHandler = subscribeMock.mock.calls[1][1].handler;

    await expect(
      adminValidationHandler({
        eventId: 'evt-1',
        eventType: 'AdminPermissionValidationRequested',
        source: 'test',
        timestamp: new Date().toISOString(),
        version: '1.0',
        data: {
          adminId: 'admin-1',
          action: 'suspend_user',
          targetUserId: 'user-1'
        }
      })
    ).resolves.toBeUndefined();

    await expect(
      userCreationHandler({
        eventId: 'evt-2',
        eventType: 'UserCreationRequested',
        source: 'test',
        timestamp: new Date().toISOString(),
        version: '1.0',
        data: {
          userId: 'user-2',
          adminId: 'admin-2',
          userData: { email: 'new@example.com' }
        }
      })
    ).resolves.toBeUndefined();
  });
});
