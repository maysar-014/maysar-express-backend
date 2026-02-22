export class TrackShipmentUseCase {
    constructor(
        private readonly repository: any,
        private readonly eventBus: any
    ) {}

    async execute(dto: { shipmentId: string; status: string; location: string }) {
        const shipment = await this.repository.findById(dto.shipmentId);
        if (!shipment) throw new Error('Shipment not found');

        shipment.status = dto.status;
        shipment.currentLocation = dto.location;
        await this.repository.update(shipment);
        await this.eventBus.publish('ShipmentStatusUpdated.v1', shipment);
        return shipment;
    }
}
