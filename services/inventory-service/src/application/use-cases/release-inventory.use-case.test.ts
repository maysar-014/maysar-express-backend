import { ReleaseInventoryUseCase } from '../release-inventory.use-case';

const mockRepository = {
  findReservations: jest.fn(),
  updateReservation: jest.fn(),
  updateStock: jest.fn()
} as any;

const mockEventBus = {
  publish: jest.fn()
} as any;

describe('ReleaseInventoryUseCase', () => {
  let useCase: ReleaseInventoryUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ReleaseInventoryUseCase(mockRepository, mockEventBus);
  });

  it('should release inventory successfully', async () => {
    mockRepository.findReservations.mockResolvedValue([
      { id: 'r1', productVariantId: 'pv1', quantity: 10, status: 'active' }
    ]);

    await useCase.execute({ orderId: 'o1', reason: 'order_cancelled' });

    expect(mockRepository.updateReservation).toHaveBeenCalledWith('r1', { status: 'released' });
    expect(mockRepository.updateStock).toHaveBeenCalled();
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'InventoryReleased' })
    );
  });

  it('should handle no active reservations', async () => {
    mockRepository.findReservations.mockResolvedValue([]);

    await useCase.execute({ orderId: 'o1', reason: 'order_cancelled' });

    expect(mockRepository.updateReservation).not.toHaveBeenCalled();
  });

  it('should restore stock quantities', async () => {
    mockRepository.findReservations.mockResolvedValue([
      { id: 'r1', productVariantId: 'pv1', quantity: 10, warehouseId: 'w1' }
    ]);

    await useCase.execute({ orderId: 'o1', reason: 'payment_failed' });

    expect(mockRepository.updateStock).toHaveBeenCalledWith(
      expect.objectContaining({
        availableQuantity: expect.any(Number),
        reservedQuantity: expect.any(Number)
      })
    );
  });
});
