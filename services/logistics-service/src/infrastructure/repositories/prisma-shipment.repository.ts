/**
 * Prisma implementation of ShipmentRepository (Phase 2 §2.1).
 *
 * Reads/writes the Logistics_Shipment table. Row shape matches the Prisma
 * model; the entity owns all invariants and state-machine enforcement, so
 * this repository is a thin mapper.
 */

import { Shipment, ShipmentData, ShipmentFailureReason, VehicleClass } from '../../domain/entities/shipment.entity';
import { ShipmentRepository } from '../../domain/repositories/shipment.repository';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';

export class PrismaShipmentRepository implements ShipmentRepository {
  private get prisma(): any {
    return (globalThis as any).prisma;
  }

  async save(shipment: Shipment): Promise<void> {
    const data = shipment.toData();
    await this.prisma?.logistics_Shipment?.upsert?.({
      where: { id: data.id },
      create: {
        id: data.id,
        orderId: data.orderId,
        sellerId: data.sellerId,
        originLat: data.origin.getLatitude(),
        originLng: data.origin.getLongitude(),
        originAddress: data.origin.getAddress(),
        destinationLat: data.destination.getLatitude(),
        destinationLng: data.destination.getLongitude(),
        destinationAddress: data.destination.getAddress(),
        packageWeightKg: data.packageWeightKg,
        packageDimensions: data.packageDimensions ?? undefined,
        handlingRequirements: data.handlingRequirements,
        requestedDeliveryWindow: data.requestedDeliveryWindow
          ? { earliestAt: data.requestedDeliveryWindow.earliestAt, latestAt: data.requestedDeliveryWindow.latestAt }
          : undefined,
        requiredVehicleClass: data.requiredVehicleClass,
        status: data.status,
        failureReason: data.failureReason,
        deliveryJobId: data.deliveryJobId,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
      update: {
        status: data.status,
        failureReason: data.failureReason,
        deliveryJobId: data.deliveryJobId,
        updatedAt: new Date(),
      },
    });
  }

  async findById(id: string): Promise<Shipment | null> {
    const row = await this.prisma?.logistics_Shipment?.findUnique?.({ where: { id } });
    return row ? this.rowToEntity(row) : null;
  }

  async findByOrderId(orderId: string): Promise<Shipment[]> {
    const rows = await this.prisma?.logistics_Shipment?.findMany?.({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });
    return (rows ?? []).map((r: any) => this.rowToEntity(r));
  }

  async findByDeliveryJobId(deliveryJobId: string): Promise<Shipment[]> {
    const rows = await this.prisma?.logistics_Shipment?.findMany?.({
      where: { deliveryJobId },
      orderBy: { createdAt: 'asc' },
    });
    return (rows ?? []).map((r: any) => this.rowToEntity(r));
  }

  async findUnassigned(): Promise<Shipment[]> {
    const rows = await this.prisma?.logistics_Shipment?.findMany?.({
      where: { deliveryJobId: null, status: { in: ['CREATED', 'PLANNED'] } },
      orderBy: { createdAt: 'asc' },
    });
    return (rows ?? []).map((r: any) => this.rowToEntity(r));
  }

  async updateStatus(id: string, status: string, failureReason?: string): Promise<void> {
    await this.prisma?.logistics_Shipment?.update?.({
      where: { id },
      data: { status, failureReason: failureReason ?? null, updatedAt: new Date() },
    });
  }

  private rowToEntity(row: any): Shipment {
    const data: ShipmentData = {
      id: row.id,
      orderId: row.orderId,
      sellerId: row.sellerId,
      origin: GeoPoint.create(Number(row.originLat), Number(row.originLng), row.originAddress ?? ''),
      destination: GeoPoint.create(Number(row.destinationLat), Number(row.destinationLng), row.destinationAddress ?? ''),
      packageWeightKg: Number(row.packageWeightKg),
      packageDimensions: row.packageDimensions ?? null,
      handlingRequirements: row.handlingRequirements ?? { fragile: false, temperatureControlled: false, hazmat: false },
      requestedDeliveryWindow: row.requestedDeliveryWindow
        ? {
            earliestAt: new Date(row.requestedDeliveryWindow.earliestAt),
            latestAt: new Date(row.requestedDeliveryWindow.latestAt),
          }
        : null,
      requiredVehicleClass: (row.requiredVehicleClass ?? null) as VehicleClass | null,
      status: row.status,
      failureReason: (row.failureReason ?? null) as ShipmentFailureReason | null,
      deliveryJobId: row.deliveryJobId ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
    return new Shipment(data);
  }
}
