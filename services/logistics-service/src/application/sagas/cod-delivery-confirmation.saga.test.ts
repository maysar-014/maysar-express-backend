import { CODDeliveryConfirmationSaga } from './cod-delivery-confirmation.saga';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';

describe('CODDeliveryConfirmationSaga', () => {
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

    const saga = new CODDeliveryConfirmationSaga(
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

  it('defines expected COD orchestration steps', () => {
    const { saga } = buildDeps();
    const steps = (saga as any).steps;

    expect(steps).toHaveLength(3);
    expect(steps.map((s: any) => s.name)).toEqual([
      'initiate_secure_delivery',
      'verify_cod_delivery',
      'complete_cod_transaction'
    ]);
  });

  it('initiate_secure_delivery generates OTP, updates status, and notifies buyer', async () => {
    const { saga, deliveryRepository, codEngine, publishCommand } = buildDeps();
    const step = (saga as any).steps[0];
    const context: any = createContext();

    await step.execute(context, 'saga-1');

    expect(codEngine.generateOTP).toHaveBeenCalledTimes(1);
    expect(context.otp).toBe('123456');
    expect(context.otpExpiresAt).toEqual(new Date('2026-03-09T10:00:00.000Z'));
    expect(deliveryRepository.updateStatus).toHaveBeenCalledWith('del-1', 'in_transit', {
      isCOD: true,
      otp: '123456',
      otpExpiresAt: new Date('2026-03-09T10:00:00.000Z')
    });
    expect(publishCommand).toHaveBeenCalledWith(
      'NotifyBuyerOTP',
      expect.objectContaining({ orderId: 'ord-1', buyerId: 'buyer-1', otp: '123456' }),
      'req-1',
      'saga-1'
    );
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

  it('verify_cod_delivery waits when verification data is missing', async () => {
    const { saga, deliveryRepository } = buildDeps();
    const step = (saga as any).steps[1];
    const context: any = createContext();

    await step.execute(context, 'saga-3');

    expect(deliveryRepository.updateStatus).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith('[saga-3] Verification data missing, waiting for courier submission...');
  });

  it('verify_cod_delivery fails when courier is not near destination', async () => {
    const { saga, codEngine } = buildDeps();
    codEngine.isWithinProximity.mockReturnValue(false);
    const step = (saga as any).steps[1];
    const context: any = {
      ...createContext(),
      otp: '123456',
      otpExpiresAt: new Date('2026-03-09T10:00:00.000Z'),
      providedOtp: '123456',
      currentLocation: GeoPoint.create(-6.7, 39.0, 'Far')
    };

    await expect(step.execute(context, 'saga-4')).rejects.toThrow(
      'Verification Failed: Courier is not within proximity of delivery address'
    );
  });

  it('verify_cod_delivery fails for invalid OTP', async () => {
    const { saga, codEngine } = buildDeps();
    codEngine.validateOTP.mockReturnValue(false);
    const step = (saga as any).steps[1];
    const context: any = {
      ...createContext(),
      otp: '123456',
      otpExpiresAt: new Date('2026-03-09T10:00:00.000Z'),
      providedOtp: '000000',
      currentLocation: GeoPoint.create(-6.8001, 39.2101, 'Near')
    };

    await expect(step.execute(context, 'saga-5')).rejects.toThrow(
      'Verification Failed: Invalid or expired OTP'
    );
  });

  it('verify_cod_delivery success marks delivered with COD proof metadata', async () => {
    const { saga, deliveryRepository } = buildDeps();
    const step = (saga as any).steps[1];
    const currentLocation = GeoPoint.create(-6.8001, 39.2101, 'Near');
    const context: any = {
      ...createContext(),
      otp: '123456',
      otpExpiresAt: new Date('2026-03-09T10:00:00.000Z'),
      providedOtp: '123456',
      currentLocation
    };

    await step.execute(context, 'saga-6');

    expect(deliveryRepository.updateStatus).toHaveBeenCalledWith(
      'del-1',
      'delivered',
      expect.objectContaining({
        codCollected: true,
        codOtpVerified: true,
        codProofGpsLat: currentLocation.getLatitude(),
        codProofGpsLng: currentLocation.getLongitude(),
        codProofTimestamp: expect.any(Date)
      })
    );
    expect(context.status).toBe('delivered');
  });

  it('verify compensation marks failed state', async () => {
    const { saga, deliveryRepository } = buildDeps();
    const step = (saga as any).steps[1];

    await step.compensate(createContext(), 'saga-7');

    expect(deliveryRepository.updateStatus).toHaveBeenCalledWith('del-1', 'failed', {
      reason: 'COD verification failed during saga execution'
    });
  });

  it('complete_cod_transaction emits success and settlement commands', async () => {
    const { saga, publishCommand } = buildDeps();
    const step = (saga as any).steps[2];
    const context: any = createContext();

    await step.execute(context, 'saga-8');

    expect(publishCommand).toHaveBeenNthCalledWith(
      1,
      'RecordCODSuccess',
      { userId: 'buyer-1', orderId: 'ord-1' },
      'req-1',
      'saga-8'
    );
    expect(publishCommand).toHaveBeenNthCalledWith(
      2,
      'SettleCODPayment',
      expect.objectContaining({
        orderId: 'ord-1',
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        amount: 12000,
        currency: 'TZS',
        holdId: 'hold-1'
      }),
      'req-1',
      'saga-8'
    );
  });

  it('complete compensation logs critical warning', async () => {
    const { saga } = buildDeps();
    const step = (saga as any).steps[2];

    await step.compensate(createContext(), 'saga-9');

    expect(warnSpy).toHaveBeenCalledWith(
      '[saga-9] Critical: Compensation triggered during transaction completion'
    );
  });
});
