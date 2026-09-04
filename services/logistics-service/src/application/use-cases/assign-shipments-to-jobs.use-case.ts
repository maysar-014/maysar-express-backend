/**
 * AssignShipmentsToJobsUseCase (Phase 2 §2.2)
 *
 * After checkout confirmation (order + shipments created), binds the created
 * Shipments to the DeliveryJobs the consolidation engine already produced for
 * the quote groups. For each shipment that is still unassigned:
 *   - find the eligible PENDING DeliveryJob whose shipmentIds reference the
 *     shipment's sellerOrderId, or create a new PENDING job for the shipment
 *   - set shipment.deliveryJobId and mark the shipment PLANNED
 *
 * Backlog parity: the orchestrator creates DeliveryJob records during
 * consolidation; this use case closes the loop by assigning Shipment rows to
 * those jobs (the shipment → job link the backlog calls `deliveryJobId`).
 */

import { Shipment } from '../../domain/entities/shipment.entity';
import { ShipmentRepository } from '../../domain/repositories/shipment.repository';
import { PrismaShipmentRepository } from '../../infrastructure/repositories/prisma-shipment.repository';
import { DeliveryJobRepository } from '../../domain/repositories/delivery-job.repository';
import { PrismaDeliveryJobRepository } from '../../infrastructure/repositories/prisma-delivery-job.repository';

export interface AssignShipmentsToJobsRequest {
  masterOrderId: string;
  /** orderId → sellerOrderId mapping for shipments created at checkout. */
  shipmentOrderIds: string[];
}

export interface AssignShipmentsToJobsResult {
  assigned: number;
  createdJobs: number;
}

export class AssignShipmentsToJobsUseCase {
  private readonly shipmentRepo: ShipmentRepository = new PrismaShipmentRepository();
  private readonly jobRepo: DeliveryJobRepository = new PrismaDeliveryJobRepository();

  async execute(request: AssignShipmentsToJobsRequest): Promise<AssignShipmentsToJobsResult> {
    if (!request?.shipmentOrderIds?.length) return { assigned: 0, createdJobs: 0 };

    // Load shipments belonging to this master order (orderId is the seller order id).
    const shipments: Shipment[] = [];
    for (const orderId of request.shipmentOrderIds) {
      shipments.push(...(await this.shipmentRepo.findByOrderId(orderId)));
    }

    let assigned = 0;
    let createdJobs = 0;

    for (const shipment of shipments) {
      if (shipment.deliveryJobId) continue; // already assigned

      // Find a PENDING job whose shipmentIds reference this sellerOrderId.
      const sellerOrderId = shipment.orderId;
      // The orchestrator stores sellerOrderIds in job.shipmentIds; match on that.
      const eligible = await this.findPendingJobForOrder(sellerOrderId);
      let job = eligible;

      if (!job) {
        // No pre-created job — create one (e.g. shipment arrived outside
        // consolidation window or snapshot was taken for the group).
        const { DeliveryJob } = await import('../../domain/entities/delivery-job.entity');
        job = DeliveryJob.create({ shipmentIds: [sellerOrderId] });
        await this.jobRepo.save(job);
        createdJobs += 1;
      }

      // Assign shipment to job (sets deliveryJobId, marks ASSIGNED/PLANNED).
      // Note: entity assignToJob requires PLANNED→ASSIGNED; a CREATED shipment
      // must be planned first.
      const updatable = shipment;
      if (updatable.status === 'CREATED') updatable.markPlanned();
      updatable.assignToJob(job.id);
      await this.shipmentRepo.save(updatable);
      assigned += 1;
    }

    return { assigned, createdJobs };
  }

  private async findPendingJobForOrder(sellerOrderId: string) {
    const prisma = (globalThis as any).prisma;
    const rows = await prisma?.logistics_DeliveryJob?.findMany?.({
      where: { status: 'PENDING' },
    });
    const match = (rows ?? []).find((r: any) =>
      Array.isArray(r.shipmentIds) && r.shipmentIds.includes(sellerOrderId));
    if (!match) return null;
    const { DeliveryJob } = await import('../../domain/entities/delivery-job.entity');
    return new DeliveryJob({
      id: match.id,
      shipmentIds: match.shipmentIds as string[],
      driverId: null,
      vehicleId: null,
      routeId: match.routeId ?? null,
      status: match.status,
      failureReason: null,
      scheduledPickupAt: match.scheduledPickupAt ?? null,
      estimatedDeliveryAt: match.estimatedDeliveryAt ?? null,
      actualPickupAt: null,
      actualDeliveryAt: null,
      createdAt: match.createdAt,
      updatedAt: match.updatedAt,
    });
  }
}