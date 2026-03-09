import { UpdateDeliveryStatusUseCase } from './update-delivery-status.use-case';

describe('UpdateDeliveryStatusUseCase', () => {
  it('updates status and returns mapped response', async () => {
    const currentDelivery = {
      id: 'del-1',
      status: 'assigned'
    };
    const updatedDelivery = {
      id: 'del-1',
      status: 'picked_up',
      actualPickupTime: new Date('2026-01-01T10:05:00.000Z'),
      actualDeliveryTime: undefined,
      updatedAt: new Date('2026-01-01T10:05:00.000Z')
    };
    const repository = {
      findById: jest
        .fn()
        .mockResolvedValueOnce(currentDelivery)
        .mockResolvedValueOnce(updatedDelivery),
      updateStatus: jest.fn().mockResolvedValue(undefined)
    };
    const useCase = new UpdateDeliveryStatusUseCase(repository as never);

    const result = await useCase.execute({
      deliveryId: 'del-1',
      status: 'picked_up',
      notes: 'Picked from warehouse'
    });

    expect(repository.updateStatus).toHaveBeenCalledWith('del-1', 'picked_up', { notes: 'Picked from warehouse' });
    expect(result.deliveryId).toBe('del-1');
    expect(result.previousStatus).toBe('assigned');
    expect(result.status).toBe('picked_up');
    expect(result.notes).toBe('Picked from warehouse');
  });

  it('throws when current delivery is not found', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue(null),
      updateStatus: jest.fn()
    };
    const useCase = new UpdateDeliveryStatusUseCase(repository as never);

    await expect(useCase.execute({ deliveryId: 'missing', status: 'picked_up' })).rejects.toThrow(
      'Delivery missing not found'
    );
  });

  it('throws on invalid status transition', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({ id: 'del-1', status: 'delivered' }),
      updateStatus: jest.fn()
    };
    const useCase = new UpdateDeliveryStatusUseCase(repository as never);

    await expect(useCase.execute({ deliveryId: 'del-1', status: 'picked_up' })).rejects.toThrow(
      'Invalid status transition from delivered to picked_up'
    );
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });

  it('throws when updated delivery cannot be loaded', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValueOnce({ id: 'del-1', status: 'assigned' }).mockResolvedValueOnce(null),
      updateStatus: jest.fn().mockResolvedValue(undefined)
    };
    const useCase = new UpdateDeliveryStatusUseCase(repository as never);

    await expect(useCase.execute({ deliveryId: 'del-1', status: 'picked_up' })).rejects.toThrow(
      'Failed to retrieve updated delivery del-1'
    );
  });
});
