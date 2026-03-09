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
      })
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
});
