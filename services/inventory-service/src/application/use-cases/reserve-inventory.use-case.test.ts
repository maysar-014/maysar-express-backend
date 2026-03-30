import { ReserveInventoryUseCase } from './reserve-inventory.use-case';

const mockRepository = {
  findStock: jest.fn(),
  createReservation: jest.fn(),
  updateStock: jest.fn()
} as any;

const mockEventBus = {
  publish: jest.fn()
} as any;

describe('ReserveInventoryUseCase', () => {
  let useCase: ReserveInventoryUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ReserveInventoryUseCase(mockRepository, mockEventBus);
  });

  it('should reserve inventory successfully', async () => {
    mockRepository.findStock.mockResolvedValue({
      id: 's1',
      availableQuantity: 100,
      reservedQuantity: 0
    });
    mockRepository.createReservation.mockResolvedValue({ id: 'r1' });

    const result = await useCase.execute({
      orderId: 'o1',
      items: [{ productVariantId: 'pv1', quantity: 10, warehouseId: 'w1' }]
    });

    expect(result.success).toBe(true);
    expect(mockRepository.createReservation).toHaveBeenCalled();
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'InventoryReserved' })
    );
  });

  it('should reject reservation for insufficient stock', async () => {
    mockRepository.findStock.mockResolvedValue({
      id: 's1',
      availableQuantity: 5,
      reservedQuantity: 0
    });

    await expect(useCase.execute({
      orderId: 'o1',
      items: [{ productVariantId: 'pv1', quantity: 10, warehouseId: 'w1' }]
    })).rejects.toThrow('Insufficient stock');
  });

  it('should handle multiple items', async () => {
    mockRepository.findStock.mockResolvedValue({
      id: 's1',
      availableQuantity: 100,
      reservedQuantity: 0
    });
    mockRepository.createReservation.mockResolvedValue({ id: 'r1' });

    const result = await useCase.execute({
      orderId: 'o1',
      items: [
        { productVariantId: 'pv1', quantity: 10, warehouseId: 'w1' },
        { productVariantId: 'pv2', quantity: 5, warehouseId: 'w1' }
      ]
    });

    expect(result.success).toBe(true);
    expect(mockRepository.createReservation).toHaveBeenCalledTimes(2);
  });
});
