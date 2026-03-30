type StockRecord = {
  id: string;
  availableQuantity: number;
  reservedQuantity: number;
};

type ReserveInventoryRepository = {
  findStock: (query: {
    orderId: string;
    productVariantId: string;
    warehouseId: string;
    quantity: number;
  }) => Promise<StockRecord | null>;
  createReservation: (data: {
    orderId: string;
    productVariantId: string;
    warehouseId: string;
    quantity: number;
  }) => Promise<{ id: string }>;
  updateStock?: (data: {
    id: string;
    availableQuantity: number;
    reservedQuantity: number;
  }) => Promise<unknown>;
};

type ReserveInventoryEventBus = {
  publish: (event: { type: string; [key: string]: unknown }) => Promise<void> | void;
};

export class ReserveInventoryUseCase {
  constructor(
    private readonly repository: ReserveInventoryRepository,
    private readonly eventBus: ReserveInventoryEventBus
  ) {}

  async execute(input: {
    orderId: string;
    items: Array<{
      productVariantId: string;
      quantity: number;
      warehouseId: string;
    }>;
  }): Promise<{ success: boolean; reservationIds: string[] }> {
    const reservationIds: string[] = [];

    for (const item of input.items) {
      const stock = await this.repository.findStock({
        orderId: input.orderId,
        productVariantId: item.productVariantId,
        warehouseId: item.warehouseId,
        quantity: item.quantity
      });

      if (!stock || stock.availableQuantity < item.quantity) {
        throw new Error('Insufficient stock');
      }

      const reservation = await this.repository.createReservation({
        orderId: input.orderId,
        productVariantId: item.productVariantId,
        warehouseId: item.warehouseId,
        quantity: item.quantity
      });

      reservationIds.push(reservation.id);

      if (this.repository.updateStock) {
        await this.repository.updateStock({
          id: stock.id,
          availableQuantity: stock.availableQuantity - item.quantity,
          reservedQuantity: stock.reservedQuantity + item.quantity
        });
      }
    }

    await this.eventBus.publish({
      type: 'InventoryReserved',
      orderId: input.orderId,
      reservationIds
    });

    return { success: true, reservationIds };
  }
}
