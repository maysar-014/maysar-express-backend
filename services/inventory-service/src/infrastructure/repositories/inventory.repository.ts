interface InventoryStockRecord {
  id: string;
  [key: string]: unknown;
}

interface InventoryDelegate {
  findFirst(args: Record<string, unknown>): Promise<InventoryStockRecord | null>;
  update(args: Record<string, unknown>): Promise<unknown>;
}

interface InventoryReservationDelegate {
  create(args: Record<string, unknown>): Promise<unknown>;
}

interface InventoryRepositoryPrisma {
  inventory?: InventoryDelegate;
  inventory_StockItem?: InventoryDelegate;
  inventoryReservation?: InventoryReservationDelegate;
  inventory_Reservation?: InventoryReservationDelegate;
}

export interface CreateReservationInput {
  orderId: string;
  productVariantId: string;
  quantity: number;
  warehouseId: string;
}

export interface UpdateStockInput {
  availableQuantity?: number;
  reservedQuantity?: number;
}

export class InventoryRepository {
  constructor(private readonly prisma: InventoryRepositoryPrisma) {}

  async findStock(productVariantId: string, warehouseId: string): Promise<InventoryStockRecord | null> {
    return this.inventoryDelegate.findFirst({
      where: { productVariantId, warehouseId }
    });
  }

  async createReservation(input: CreateReservationInput): Promise<{ id: string }> {
    const reservation = await this.reservationDelegate.create({
      data: {
        orderId: input.orderId,
        productVariantId: input.productVariantId,
        quantityReserved: input.quantity,
        warehouseId: input.warehouseId,
        status: 'active',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      }
    });

    return reservation as { id: string };
  }

  async updateStock(stockId: string, updates: UpdateStockInput): Promise<void> {
    await this.inventoryDelegate.update({
      where: { id: stockId },
      data: updates
    });
  }

  private get inventoryDelegate(): InventoryDelegate {
    const delegate = this.prisma.inventory ?? this.prisma.inventory_StockItem;
    if (!delegate) {
      throw new Error('Inventory delegate is not configured on prisma client');
    }
    return delegate;
  }

  private get reservationDelegate(): InventoryReservationDelegate {
    const delegate = this.prisma.inventoryReservation ?? this.prisma.inventory_Reservation;
    if (!delegate) {
      throw new Error('Inventory reservation delegate is not configured on prisma client');
    }
    return delegate;
  }
}
