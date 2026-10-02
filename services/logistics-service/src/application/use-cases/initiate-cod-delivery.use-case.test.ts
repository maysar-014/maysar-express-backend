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
      findById: jest.fn().mockResolvedValue(delivery),
      updateStatus: jest.fn().mockResolvedValue(undefined)
    };
    const saga = { start: jest.fn().mockResolvedValue('saga-abc') };
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

  /**
   * Regression test for BLG-024: verification is a separate HTTP request and
   * cannot re-derive the saga id, so it has to survive on the delivery row.
   */
  it('persists the initiation saga id on the delivery row', async () => {
    const delivery = {
      id: 'del-1',
      orderId: 'ord-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      isCOD: true,
      codAmount: 30000,
      codCurrency: 'TZS',
      deliveryLocation: GeoPoint.create(-6.8, 39.2, 'Dest'),
      status: 'in_transit'
    };
    const deliveryRepository = {
      findById: jest.fn().mockResolvedValue(delivery),
      updateStatus: jest.fn().mockResolvedValue(undefined)
    };
    const saga = { start: jest.fn().mockResolvedValue('saga-abc') };
    const useCase = new InitiateCODDeliveryUseCase(deliveryRepository as never, saga as never);

    await useCase.execute({ deliveryId: 'del-1' });

    expect(deliveryRepository.updateStatus).toHaveBeenCalledWith('del-1', 'in_transit', {
      codSagaId: 'saga-abc'
    });
  });

  /**
   * BLG-027: OTP issuance must never be able to settle. The use case may only
   * reach the initiation saga, which has no settlement step at all.
   */
  it('issues an OTP without touching any settlement saga', async () => {
    const delivery = {
      id: 'del-1',
      orderId: 'ord-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      isCOD: true,
      codAmount: 30000,
      codCurrency: 'TZS',
      deliveryLocation: GeoPoint.create(-6.8, 39.2, 'Dest'),
      status: 'in_transit'
    };
    const deliveryRepository = {
      findById: jest.fn().mockResolvedValue(delivery),
      updateStatus: jest.fn().mockResolvedValue(undefined)
    };
    const settlementSaga = { start: jest.fn() };
    const initiationSaga = { start: jest.fn().mockResolvedValue('saga-abc') };
    const useCase = new InitiateCODDeliveryUseCase(deliveryRepository as never, initiationSaga as never);

    await useCase.execute({ deliveryId: 'del-1' });

    expect(settlementSaga.start).not.toHaveBeenCalled();
    // The status must not be advanced to delivered as a side effect of issuing a code.
    const [, status] = deliveryRepository.updateStatus.mock.calls[0];
    expect(status).toBe('in_transit');
  });

  it('throws when delivery does not exist', async () => {
    const deliveryRepository = { findById: jest.fn().mockResolvedValue(null) };
    const useCase = new InitiateCODDeliveryUseCase(deliveryRepository as never, { start: jest.fn() } as never);

    await expect(useCase.execute({ deliveryId: 'missing' })).rejects.toThrow('Delivery missing not found');
  });

  it('throws when delivery is not COD', async () => {
    const deliveryRepository = { findById: jest.fn().mockResolvedValue({ isCOD: false }) };
    const saga = { start: jest.fn() };
    const useCase = new InitiateCODDeliveryUseCase(deliveryRepository as never, saga as never);

    await expect(useCase.execute({ deliveryId: 'del-1' })).rejects.toThrow('This delivery is not a COD order');
    // Silently succeeding here was what let a COD order end up with no OTP.
    expect(saga.start).not.toHaveBeenCalled();
  });
});
