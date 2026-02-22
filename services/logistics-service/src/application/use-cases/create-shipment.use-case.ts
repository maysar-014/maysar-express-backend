export class CreateShipmentUseCase {
    constructor(
        private readonly repository: any,
        private readonly eventBus: any
    ) {}

    async execute(dto: { orderId: string; origin: string; destination: string }) {
        const existing = await this.repository.findByOrderId(dto.orderId);
        if (existing) throw new Error('Shipment already exists');

        const shipment = { id: `shipment-${Date.now()}`, ...dto, status: 'PENDING' };
        await this.repository.save(shipment);
        await this.eventBus.publish('ShipmentCreated.v1', shipment);
        return shipment;
    }
}
