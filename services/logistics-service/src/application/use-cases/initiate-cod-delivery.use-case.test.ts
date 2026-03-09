import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { InitiateCODDeliveryUseCase } from './initiate-cod-delivery.use-case';

describe('InitiateCODDeliveryUseCase', () => {
  it('starts COD delivery saga for COD delivery', async () => {
    const delivery = {
      id: 'del-1',
      orderId: 'ord-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      isCOD: true,
      codCommitmentHoldId: 'hold-1',
      codAmount: 30000,
      codCurrency: 'TZS',
      deliveryLocation: GeoPoint.create(-6.8, 39.2, 'Dest'),
      status: 'assigned'
    };
    const deliveryRepository = {
      findById: jest.fn().mockResolvedValue(delivery)
    };
    const saga = { start: jest.fn().mockResolvedValue(undefined) };
    const useCase = new InitiateCODDeliveryUseCase(deliveryRepository as never, saga as never);

    await useCase.execute({ deliveryId: 'del-1' });

    expect(saga.start).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryId: 'del-1',
        orderId: 'ord-1',
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        codAmount: 30000,
        codCurrency: 'TZS'
      })
    );
  });

  it('throws when delivery does not exist', async () => {
    const deliveryRepository = { findById: jest.fn().mockResolvedValue(null) };
    const useCase = new InitiateCODDeliveryUseCase(deliveryRepository as never, { start: jest.fn() } as never);

    await expect(useCase.execute({ deliveryId: 'missing' })).rejects.toThrow('Delivery missing not found');
  });

  it('throws when delivery is not COD', async () => {
    const deliveryRepository = { findById: jest.fn().mockResolvedValue({ isCOD: false }) };
    const useCase = new InitiateCODDeliveryUseCase(deliveryRepository as never, { start: jest.fn() } as never);

    await expect(useCase.execute({ deliveryId: 'del-1' })).rejects.toThrow('This delivery is not a COD order');
  });
});
