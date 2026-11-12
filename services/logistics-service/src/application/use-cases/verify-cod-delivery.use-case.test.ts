import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { VerifyCODDeliveryUseCase } from './verify-cod-delivery.use-case';

describe('VerifyCODDeliveryUseCase', () => {
  const location = GeoPoint.create(-6.8, 39.2, 'Buyer location');

  it('starts COD confirmation saga with verification payload', async () => {
    const deliveryRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'del-1',
        orderId: 'ord-1',
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        isCOD: true,
        codCommitmentHoldId: 'hold-1',
        codAmount: 25000,
        codCurrency: 'TZS',
        otp: '123456',
        otpExpiresAt: new Date('2026-01-01T12:00:00.000Z'),
        deliveryLocation: location,
        status: 'in_transit'
      })
    };
    const saga = { start: jest.fn().mockResolvedValue(undefined) };
    const useCase = new VerifyCODDeliveryUseCase(deliveryRepository as never, {} as never, saga as never);

    await useCase.execute({ deliveryId: 'del-1', otp: '123456', location });

    expect(saga.start).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryId: 'del-1',
        orderId: 'ord-1',
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        providedOtp: '123456',
        currentLocation: location
      }),
      // Correlation is left undefined: the settlement saga advances from a separate
      // HTTP request and must not reuse the initiation saga's correlation handle.
      undefined,
      { awaitCompletion: true }
    );
  });

  it('throws when delivery does not exist', async () => {
    const deliveryRepository = { findById: jest.fn().mockResolvedValue(null) };
    const useCase = new VerifyCODDeliveryUseCase(deliveryRepository as never, {} as never, { start: jest.fn() } as never);

    await expect(useCase.execute({ deliveryId: 'missing', otp: '123', location })).rejects.toThrow(
      'Delivery missing not found'
    );
  });

  it('throws when delivery is not COD', async () => {
    const deliveryRepository = {
      findById: jest.fn().mockResolvedValue({ isCOD: false })
    };
    const useCase = new VerifyCODDeliveryUseCase(deliveryRepository as never, {} as never, { start: jest.fn() } as never);

    await expect(useCase.execute({ deliveryId: 'del-1', otp: '123', location })).rejects.toThrow(
      'This delivery is not a COD order'
    );
  });

  it('throws when buyer or seller attribution is missing', async () => {
    const deliveryRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'del-1',
        orderId: 'ord-1',
        isCOD: true,
        buyerId: undefined,
        sellerId: 'seller-1'
      })
    };
    const useCase = new VerifyCODDeliveryUseCase(deliveryRepository as never, {} as never, { start: jest.fn() } as never);

    await expect(useCase.execute({ deliveryId: 'del-1', otp: '123', location })).rejects.toThrow(
      'Delivery del-1 is missing attribution data'
    );
  });

  it('starts the settlement saga, never the initiation saga', async () => {
    const deliveryRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'del-1',
        orderId: 'ord-1',
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        isCOD: true,
        codAmount: 25000,
        codCurrency: 'TZS',
        deliveryLocation: location,
        status: 'in_transit'
      })
    };
    const settlementSaga = { start: jest.fn().mockResolvedValue(undefined) };
    const initiationSaga = { start: jest.fn() };
    const useCase = new VerifyCODDeliveryUseCase(
      deliveryRepository as never,
      {} as never,
      settlementSaga as never
    );

    await useCase.execute({ deliveryId: 'del-1', otp: '123456', location });

    expect(settlementSaga.start).toHaveBeenCalledTimes(1);
    // Restarting the initiation saga would re-mint the OTP the courier is
    // holding, which is exactly what kept deliveries stuck at in_transit (BLG-024).
    expect(initiationSaga.start).not.toHaveBeenCalled();
  });

  it('ignores a repeated verification so the order cannot settle twice', async () => {
    const deliveryRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'del-1',
        orderId: 'ord-1',
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        isCOD: true,
        codOtpVerified: true,
        deliveryLocation: location,
        status: 'delivered'
      })
    };
    const saga = { start: jest.fn() };
    const useCase = new VerifyCODDeliveryUseCase(deliveryRepository as never, {} as never, saga as never);

    await expect(useCase.execute({ deliveryId: 'del-1', otp: '123456', location })).resolves.toBeUndefined();
    expect(saga.start).not.toHaveBeenCalled();
  });

  // NOTE: this mocks `start` to REJECT. The real orchestrator never rejects on a
    // failed step - it catches, compensates and records a terminal saga status.
    // So this test alone does NOT prove the endpoint reports failure; it only
    // proves a rejection is propagated. The behaviour that actually matters is
    // pinned by the `awaitCompletion` assertion below.
    it('propagates a settlement failure instead of reporting success', async () => {
    const deliveryRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'del-1',
        orderId: 'ord-1',
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        isCOD: true,
        deliveryLocation: location,
        status: 'in_transit'
      })
    };
    const saga = {
      start: jest.fn().mockRejectedValue(new Error('Verification Failed: Invalid or expired OTP'))
    };
    const useCase = new VerifyCODDeliveryUseCase(deliveryRepository as never, {} as never, saga as never);

    // A rejected verification must not be reported as a 200 to the courier.
    await expect(useCase.execute({ deliveryId: 'del-1', otp: '000000', location })).rejects.toThrow(
      'Verification Failed: Invalid or expired OTP'
    );
  });

  it('awaits settlement completion so a failed saga cannot be reported as success', async () => {
    const deliveryRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'del-1',
        orderId: 'ord-1',
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        isCOD: true,
        deliveryLocation: location,
        status: 'in_transit'
      })
    };
    const saga = { start: jest.fn().mockResolvedValue('saga-1') };
    const useCase = new VerifyCODDeliveryUseCase(deliveryRepository as never, {} as never, saga as never);

    await useCase.execute({ deliveryId: 'del-1', otp: '123456', location });

    // Without this flag `start()` is fire-and-forget: it resolves as soon as the
    // saga is persisted, so this use case resolved successfully even when the
    // saga had already failed and compensated - the courier got 200 while the
    // delivery stayed in_transit and nothing settled.
    expect(saga.start).toHaveBeenCalledWith(
      expect.anything(),
      undefined,
      { awaitCompletion: true }
    );
  });
});
