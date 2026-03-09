import { TwoFactorLifecycleSaga } from './two-factor-lifecycle.saga';

describe('TwoFactorLifecycleSaga', () => {
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

  afterAll(() => {
    logSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers lifecycle steps in constructor', () => {
    const saga = new TwoFactorLifecycleSaga();
    const steps = (saga as any).steps;

    expect(steps).toHaveLength(2);
    expect(steps[0].constructor.name).toBe('SendEnabledNotificationStep');
    expect(steps[1].constructor.name).toBe('RecordAuditLogStep');
  });

  it('execute logs saga start message', async () => {
    const saga = new TwoFactorLifecycleSaga();

    await saga.execute({
      sagaId: 'saga-1',
      data: { userId: 'user-1', action: '2FA_ENABLED' }
    } as any);

    expect(logSpy).toHaveBeenCalledWith('[Saga] Starting TwoFactorLifecycleSaga for ID: saga-1');
  });

  it('handleEnabled delegates to start with enable action', async () => {
    const saga = new TwoFactorLifecycleSaga();
    const startSpy = jest.spyOn(saga, 'start').mockResolvedValue('saga-enabled');

    const sagaId = await saga.handleEnabled('user-9');

    expect(startSpy).toHaveBeenCalledWith({ userId: 'user-9', action: '2FA_ENABLED' });
    expect(sagaId).toBe('saga-enabled');
  });

  it('handleDisabled delegates to start with disable action', async () => {
    const saga = new TwoFactorLifecycleSaga();
    const startSpy = jest.spyOn(saga, 'start').mockResolvedValue('saga-disabled');

    const sagaId = await saga.handleDisabled('user-10');

    expect(startSpy).toHaveBeenCalledWith({ userId: 'user-10', action: '2FA_DISABLED' });
    expect(sagaId).toBe('saga-disabled');
  });

  it('step execute/compensate handlers log expected messages', async () => {
    const saga = new TwoFactorLifecycleSaga();
    const steps = (saga as any).steps;

    await steps[0].execute({ sagaId: 's1', data: { userId: 'u1' } });
    await steps[0].compensate({ sagaId: 's1', data: { userId: 'u1' } });
    await steps[1].execute({ sagaId: 's1', data: { userId: 'u1', action: '2FA_ENABLED' } });
    await steps[1].compensate({ sagaId: 's1', data: { userId: 'u1' } });

    expect(logSpy).toHaveBeenCalledWith('[Saga] Sending 2FA enabled notification for user: u1');
    expect(logSpy).toHaveBeenCalledWith('[Saga] Compensation: Undoing notification state for user: u1');
    expect(logSpy).toHaveBeenCalledWith('[Saga] Recording audit log for user: u1, action: 2FA_ENABLED');
  });
});
