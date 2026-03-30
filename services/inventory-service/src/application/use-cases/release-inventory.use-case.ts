type ReleaseInventoryRepository = {
  findReservations: (query: { orderId: string; reason?: string }) => Promise<Array<{
    id: string;
    productVariantId: string;
    quantity: number;
    warehouseId?: string;
  }>>;
  updateReservation: (id: string, data: { status: 'released' }) => Promise<unknown>;
  updateStock: (data: {
    id?: string;
    availableQuantity: number;
    reservedQuantity: number;
  }) => Promise<unknown>;
};

type ReleaseInventoryEventBus = {
  publish: (event: { type: string; [key: string]: unknown }) => Promise<void> | void;
};

export class ReleaseInventoryUseCase {
  constructor(
    private readonly repository: ReleaseInventoryRepository,
    private readonly eventBus: ReleaseInventoryEventBus
  ) {}

  async execute(input: { orderId: string; reason: string }): Promise<{ success: boolean }> {
    const reservations = await this.repository.findReservations({ orderId: input.orderId, reason: input.reason });

    for (const reservation of reservations) {
      await this.repository.updateReservation(reservation.id, { status: 'released' });
      await this.repository.updateStock({
        id: reservation.id,
        availableQuantity: reservation.quantity,
        reservedQuantity: 0
      });
    }

    if (reservations.length > 0) {
      await this.eventBus.publish({
        type: 'InventoryReleased',
        orderId: input.orderId,
        reason: input.reason,
        reservationIds: reservations.map(reservation => reservation.id)
      });
    }

    return { success: true };
  }
}
