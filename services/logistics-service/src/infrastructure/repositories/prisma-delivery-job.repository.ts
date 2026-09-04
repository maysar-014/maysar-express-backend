/**
 * Prisma implementation of DeliveryJobRepository (Phase 2 §2.2).
 * Thin mapper — the entity owns all invariants and state-machine enforcement.
 */

import { DeliveryJob, DeliveryJobData, DeliveryJobFailureReason } from '../../domain/entities/delivery-job.entity';
import { DeliveryJobRepository } from '../../domain/repositories/delivery-job.repository';

export class PrismaDeliveryJobRepository implements DeliveryJobRepository {
  private get prisma(): any {
    return (globalThis as any).prisma;
  }

  async save(job: DeliveryJob): Promise<void> {
    const data = job.toData();
    await this.prisma?.logistics_DeliveryJob?.upsert?.({
      where: { id: data.id },
      create: {
        id: data.id,
        shipmentIds: data.shipmentIds,
        driverId: data.driverId,
        vehicleId: data.vehicleId,
        routeId: data.routeId,
        status: data.status,
        failureReason: data.failureReason,
        scheduledPickupAt: data.scheduledPickupAt,
        estimatedDeliveryAt: data.estimatedDeliveryAt,
        actualPickupAt: data.actualPickupAt,
        actualDeliveryAt: data.actualDeliveryAt,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
      update: {
        shipmentIds: data.shipmentIds,
        driverId: data.driverId,
        vehicleId: data.vehicleId,
        routeId: data.routeId,
        status: data.status,
        failureReason: data.failureReason,
        actualPickupAt: data.actualPickupAt,
        actualDeliveryAt: data.actualDeliveryAt,
        updatedAt: new Date(),
      },
    });
  }

  async findById(id: string): Promise<DeliveryJob | null> {
    const row = await this.prisma?.logistics_DeliveryJob?.findUnique?.({ where: { id } });
    return row ? this.rowToEntity(row) : null;
  }

  async findByDriverId(driverId: string): Promise<DeliveryJob[]> {
    const rows = await this.prisma?.logistics_DeliveryJob?.findMany?.({
      where: { driverId },
      orderBy: { createdAt: 'asc' },
    });
    return (rows ?? []).map((r: any) => this.rowToEntity(r));
  }

  async findByShipmentId(shipmentId: string): Promise<DeliveryJob | null> {
    // JSON array containment — Prisma can't filter Json arrays portably,
    // so scan active/pending jobs by status and match in memory (jobs are few).
    const rows = await this.prisma?.logistics_DeliveryJob?.findMany?.({
      where: { status: { notIn: ['SETTLED', 'FAILED_PICKUP', 'CUSTOMER_UNAVAILABLE'] } },
    });
    const match = (rows ?? []).find((r: any) => Array.isArray(r.shipmentIds) && r.shipmentIds.includes(shipmentId));
    return match ? this.rowToEntity(match) : null;
  }

  async findActive(): Promise<DeliveryJob[]> {
    const rows = await this.prisma?.logistics_DeliveryJob?.findMany?.({
      where: { status: { in: ['ASSIGNED', 'DRIVER_ACCEPTED', 'AT_PICKUP', 'LOADING', 'IN_TRANSIT'] } },
      orderBy: { createdAt: 'asc' },
    });
    return (rows ?? []).map((r: any) => this.rowToEntity(r));
  }

  async updateStatus(id: string, status: string, failureReason?: string): Promise<void> {
    await this.prisma?.logistics_DeliveryJob?.update?.({
      where: { id },
      data: { status, failureReason: failureReason ?? null, updatedAt: new Date() },
    });
  }

  private rowToEntity(row: any): DeliveryJob {
    const data: DeliveryJobData = {
      id: row.id,
      shipmentIds: (row.shipmentIds as string[]) ?? [],
      driverId: row.driverId ?? null,
      vehicleId: row.vehicleId ?? null,
      routeId: row.routeId ?? null,
      status: row.status,
      failureReason: (row.failureReason ?? null) as DeliveryJobFailureReason | null,
      scheduledPickupAt: row.scheduledPickupAt ?? null,
      estimatedDeliveryAt: row.estimatedDeliveryAt ?? null,
      actualPickupAt: row.actualPickupAt ?? null,
      actualDeliveryAt: row.actualDeliveryAt ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
    return new DeliveryJob(data);
  }
}
