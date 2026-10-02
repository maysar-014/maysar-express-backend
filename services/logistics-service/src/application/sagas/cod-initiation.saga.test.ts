import { CODInitiationSaga } from './cod-initiation.saga';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';

describe('CODInitiationSaga', () => {
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

  afterAll(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const buildDeps = () => {
    const deliveryRepository = {
      updateStatus: jest.fn().mockResolvedValue(undefined)
    };

    const codEngine = {
      generateOTP: jest.fn().mockReturnValue('123456'),
      calculateOTPExpiry: jest.fn().mockReturnValue(new Date('2026-03-09T10:00:00.000Z')),
      isWithinProximity: jest.fn().mockReturnValue(true),
      validateOTP: jest.fn().mockReturnValue(true)
    };

    const saga = new CODInitiationSaga(
      {} as any,
      'logistics-service',
      deliveryRepository as any,
      codEngine as any
    );
    const publishCommand = jest
      .spyOn(saga as any, 'publishCommand')
      .mockResolvedValue(undefined);

    return { saga, deliveryRepository, codEngine, publishCommand };
  };

  const createContext = () => ({
    deliveryId: 'del-1',
    orderId: 'ord-1',
    buyerId: 'buyer-1',
    sellerId: 'seller-1',
    codAmount: 12000,
    codCurrency: 'TZS',
    deliveryLocation: GeoPoint.create(-6.8, 39.21, 'Dropoff'),
    status: 'in_transit',
    requestId: 'req-1',
    codCommitmentHoldId: 'hold-1'
  });

  it('defines a single OTP issuance step', () => {
    const { saga } = buildDeps();
    const steps = (saga as any).steps;

    expect(steps).toHaveLength(1);
    expect(steps.map((s: any) => s.name)).toEqual(['initiate_secure_delivery']);
  });

  /**
   * Regression test for BLG-027.
   *
   * The superseded single saga ran `complete_cod_transaction` during OTP
   * generation, because its verify step hit a bare `return` when verification
   * data was absent — which is exactly the state OTP generation supplies. The
   * orchestrator treats a returned step as success, so settlement ran and money
   * moved for a delivery no courier had ever confirmed.
   *
   * These assertions are deliberately structural (step names) as well as
   * behavioural (every command actually published), so the test fails if anyone
   * reintroduces settlement into this saga by either route.
   */
  it('exposes no settlement capability at all', () => {
    const { saga } = buildDeps();
    const stepNames = ((saga as any).steps as any[]).map((s) => s.name);

    expect(stepNames).not.toContain('complete_cod_transaction');
    expect(stepNames).not.toContain('mark_delivered');
    expect(stepNames).not.toContain('verify_cod_delivery');
  });

  it('never publishes a settlement command while issuing an OTP', async () => {
    const { saga, publishCommand } = buildDeps();
    const context: any = createContext();

    // Run every step this saga owns, exactly as the orchestrator would.
    for (const step of (saga as any).steps) {
      await step.execute(context, 'saga-init');
    }

    const published = publishCommand.mock.calls.map((call) => call[0]);

    expect(published).toEqual(['NotifyBuyerOTP']);
    expect(published).not.toContain('SettleCODPayment');
    expect(published).not.toContain('RecordCODSuccess');
  });

  it('does not mark the delivery delivered or record collected cash', async () => {
    const { saga, deliveryRepository } = buildDeps();
    const context: any = createContext();

    for (const step of (saga as any).steps) {
      await step.execute(context, 'saga-init');
    }

    expect(deliveryRepository.updateStatus).toHaveBeenCalledTimes(1);
    expect(deliveryRepository.updateStatus).toHaveBeenCalledWith('del-1', 'in_transit', {
      isCOD: true,
      otp: '123456',
      otpExpiresAt: new Date('2026-03-09T10:00:00.000Z')
    });

    const [, status, metadata] = deliveryRepository.updateStatus.mock.calls[0];
    expect(status).not.toBe('delivered');
    expect(metadata.codOtpVerified).toBeUndefined();
    expect(metadata.codCollected).toBeUndefined();
  });

  it('initiate_secure_delivery generates OTP, updates status, and notifies buyer', async () => {
    const { saga, deliveryRepository, codEngine, publishCommand } = buildDeps();
    const step = (saga as any).steps[0];
    const context: any = createContext();

    await step.execute(context, 'saga-1');

    expect(codEngine.generateOTP).toHaveBeenCalledTimes(1);
    expect(codEngine.isWithinProximity).not.toHaveBeenCalled();
    expect(codEngine.validateOTP).not.toHaveBeenCalled();
    expect(publishCommand).toHaveBeenCalledWith(
      'NotifyBuyerOTP',
      expect.objectContaining({ orderId: 'ord-1', buyerId: 'buyer-1', otp: '123456' }),
      'req-1',
      'saga-1'
    );
  });

  it('refuses to issue an OTP with no party attribution to notify', async () => {
    const { saga, publishCommand, deliveryRepository, codEngine } = buildDeps();
    const step = (saga as any).steps[0];

    await expect(
      step.execute({ ...createContext(), buyerId: undefined } as any, 'saga-bad')
    ).rejects.toThrow(/missing order or party attribution/);

    expect(codEngine.generateOTP).not.toHaveBeenCalled();
    expect(deliveryRepository.updateStatus).not.toHaveBeenCalled();
    expect(publishCommand).not.toHaveBeenCalled();
  });

  it('fails loudly when the OTP cannot be persisted, rather than silently issuing an unusable code', async () => {
    const { saga, deliveryRepository, publishCommand } = buildDeps();
    deliveryRepository.updateStatus.mockRejectedValue(new Error('db down'));
    const step = (saga as any).steps[0];

    await expect(step.execute(createContext() as any, 'saga-dberr')).rejects.toThrow('db down');

    // Never notify with a code that was never stored.
    expect(publishCommand).not.toHaveBeenCalled();
  });

  it('initiate compensation marks delivery failed', async () => {
    const { saga, deliveryRepository } = buildDeps();
    const step = (saga as any).steps[0];
    const context: any = createContext();

    await step.compensate(context, 'saga-2');

    expect(deliveryRepository.updateStatus).toHaveBeenCalledWith('del-1', 'failed', {
      reason: 'Failed to initiate secure COD delivery'
    });
  });
});
