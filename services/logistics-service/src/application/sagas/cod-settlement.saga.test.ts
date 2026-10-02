import { CODSettlementSaga } from './cod-settlement.saga';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';

describe('CODSettlementSaga', () => {
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

  afterAll(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const buildDeps = (overrides: Record<string, any> = {}) => {
    const deliveryRepository = {
      updateStatus: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue({
        id: 'del-1',
        otp: '123456',
        otpExpiresAt: new Date('2026-03-09T10:00:00.000Z')
      })
    };

    const codEngine = {
      generateOTP: jest.fn().mockReturnValue('999999'),
      calculateOTPExpiry: jest.fn().mockReturnValue(new Date('2026-03-09T10:00:00.000Z')),
      isWithinProximity: jest.fn().mockReturnValue(true),
      validateOTP: jest.fn().mockReturnValue(true),
      ...overrides
    };

    const saga = new CODSettlementSaga(
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
    codCommitmentHoldId: 'hold-1',
    providedOtp: '123456',
    currentLocation: GeoPoint.create(-6.8001, 39.2101, 'Near')
  });

  const stepNames = (saga: unknown): string[] =>
    ((saga as any).steps as any[]).map((s) => s.name);

  it('verifies evidence, then marks delivered, then settles', () => {
    const { saga } = buildDeps();

    expect(stepNames(saga)).toEqual([
      'verify_cod_delivery',
      'mark_delivered',
      'complete_cod_transaction'
    ]);
  });
  describe('fail-closed evidence check', () => {
    it('rejects when courier location is missing instead of waiting', async () => {
      const { saga, publishCommand, deliveryRepository } = buildDeps();
      const step = (saga as any).steps[0];
      const context: any = { ...createContext(), currentLocation: undefined };

      // The superseded saga returned here, which the orchestrator read as success,
      // letting settlement run with no evidence at all (BLG-027).
      await expect(step.execute(context, 'saga-x')).rejects.toThrow(
        'Verification Failed: courier location and OTP are both required'
      );
      expect(publishCommand).not.toHaveBeenCalled();
      expect(deliveryRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('rejects when no OTP was supplied', async () => {
      const { saga, publishCommand } = buildDeps();
      const step = (saga as any).steps[0];

      await expect(
        step.execute({ ...createContext(), providedOtp: undefined }, 'saga-x')
      ).rejects.toThrow('Verification Failed: courier location and OTP are both required');
      expect(publishCommand).not.toHaveBeenCalled();
    });

    it('rejects a courier who is not near the delivery address', async () => {
      const { saga, publishCommand } = buildDeps({
        isWithinProximity: jest.fn().mockReturnValue(false)
      });
      const step = (saga as any).steps[0];

      await expect(step.execute(createContext() as any, 'saga-x')).rejects.toThrow(
        'Verification Failed: Courier is not within proximity of delivery address'
      );
      expect(publishCommand).not.toHaveBeenCalled();
    });

    it('rejects an invalid OTP', async () => {
      const { saga, publishCommand } = buildDeps({
        validateOTP: jest.fn().mockReturnValue(false)
      });
      const step = (saga as any).steps[0];

      await expect(step.execute(createContext() as any, 'saga-x')).rejects.toThrow(
        'Verification Failed: Invalid or expired OTP'
      );
      expect(publishCommand).not.toHaveBeenCalled();
    });

    it('rejects an expired OTP, evaluating expiry against storage', async () => {
      const { saga, publishCommand, codEngine, deliveryRepository } = buildDeps({
        validateOTP: jest.fn().mockReturnValue(false)
      });
      deliveryRepository.findById.mockResolvedValue({
        otp: '123456',
        otpExpiresAt: new Date(0)
      });
      const step = (saga as any).steps[0];

      await expect(step.execute(createContext() as any, 'saga-x')).rejects.toThrow(
        'Verification Failed: Invalid or expired OTP'
      );
      // The lapsed code must be checked against what was stored, not what the
      // caller asserted, or an expired code would validate.
      expect(codEngine.validateOTP).toHaveBeenCalledWith('123456', '123456', new Date(0));
      expect(deliveryRepository.findById).toHaveBeenCalledWith('del-1');
      expect(publishCommand).not.toHaveBeenCalled();
    });

    it('validates against the stored OTP, not the caller-supplied one', async () => {
      const { saga, codEngine, deliveryRepository } = buildDeps();
      const step = (saga as any).steps[0];

      await step.execute(createContext() as any, 'saga-x');

      expect(codEngine.validateOTP).toHaveBeenCalledWith(
        '123456',
        '123456',
        new Date('2026-03-09T10:00:00.000Z')
      );
      expect(deliveryRepository.findById).toHaveBeenCalledWith('del-1');
    });

    it('the verify step writes no status at all', async () => {
      const { saga, deliveryRepository } = buildDeps();
      const step = (saga as any).steps[0];

      await step.execute(createContext() as any, 'saga-x');

      expect(deliveryRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('leaves an in_transit delivery untouched when verification fails', async () => {
      const { saga, deliveryRepository, codEngine } = buildDeps({
        validateOTP: jest.fn().mockReturnValue(false)
      });
      const steps = (saga as any).steps;

      // Emulate the orchestrator: run steps in order, stop at the first failure
      // and compensate the one that failed.
      let failed = false;
      for (const step of steps) {
        if (failed) break;
        try {
          await step.execute(createContext() as any, 'saga-x');
        } catch {
          failed = true;
          await step.compensate(createContext() as any, 'saga-x');
        }
      }

      expect(failed).toBe(true);
      // No `delivered` write, and crucially no `failed` write either: a rejected
      // OTP is not a failed delivery, and the courier must be able to retry.
      expect(deliveryRepository.updateStatus).not.toHaveBeenCalled();
      expect(codEngine.validateOTP).toHaveBeenCalledTimes(1);
    });
  });
  describe('mark_delivered', () => {
    it('persists the durable delivered state with COD proof metadata', async () => {
      const { saga, deliveryRepository } = buildDeps();
      const step = (saga as any).steps[1];
      const currentLocation = GeoPoint.create(-6.8001, 39.2101, 'Near');

      await step.execute({ ...createContext(), currentLocation } as any, 'saga-y');

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
    });

    it('compensation returns the delivery to in_transit', async () => {
      const { saga, deliveryRepository } = buildDeps();
      const step = (saga as any).steps[1];

      await step.compensate(createContext() as any, 'saga-y');

      expect(deliveryRepository.updateStatus).toHaveBeenCalledWith('del-1', 'in_transit', {
        codCollected: false,
        codOtpVerified: false
      });
    });
  });

  describe('complete_cod_transaction', () => {
    it('emits settlement and success commands exactly once', async () => {
      const { saga, publishCommand } = buildDeps();
      const step = (saga as any).steps[2];

      await step.execute(createContext() as any, 'saga-z');

      expect(publishCommand).toHaveBeenCalledTimes(2);
      expect(publishCommand).toHaveBeenNthCalledWith(
        1,
        'RecordCODSuccess',
        { userId: 'buyer-1', orderId: 'ord-1' },
        'req-1',
        'saga-z'
      );
      expect(publishCommand).toHaveBeenNthCalledWith(
        2,
        'SettleCODPayment',
        {
          orderId: 'ord-1',
          buyerId: 'buyer-1',
          sellerId: 'seller-1',
          amount: 12000,
          currency: 'TZS',
          holdId: 'hold-1'
        },
        'req-1',
        'saga-z'
      );
    });

    it('never issues an OTP of its own', async () => {
      const { saga, codEngine } = buildDeps();
      const step = (saga as any).steps[2];

      await step.execute(createContext() as any, 'saga-z');

      expect(codEngine.generateOTP).not.toHaveBeenCalled();
    });

    it('compensation warns instead of reversing settled money', async () => {
      const { saga, publishCommand } = buildDeps();
      const step = (saga as any).steps[2];

      await step.compensate(createContext() as any, 'saga-z');

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('compensation requested after settlement')
      );
      expect(publishCommand).not.toHaveBeenCalled();
    });
  });

  it('runs the happy path in order: verify, persist delivered, then settle', async () => {
    const { saga, deliveryRepository, publishCommand } = buildDeps();

    for (const step of (saga as any).steps) {
      await step.execute(createContext() as any, 'saga-happy');
    }

    // `delivered` must be durable BEFORE any money moves.
    expect(deliveryRepository.updateStatus.mock.calls[0][1]).toBe('delivered');
    expect(publishCommand.mock.calls.map((c) => c[0])).toEqual([
      'RecordCODSuccess',
      'SettleCODPayment'
    ]);
  });
});