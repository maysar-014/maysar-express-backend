/**
 * DeliveryJob transition event publisher (Phase 2 §2.2).
 *
 * Writes one outbox event per named transition on a DeliveryJob, so downstream
 * services (order, payment, trust) can react. Best-effort: failures never
 * break the transition itself.
 */

import { randomUUID } from 'crypto';
import { DeliveryJob, DeliveryJobStatus } from '../../domain/entities/delivery-job.entity';
import { mapTransitionEvent, DeliveryJobEventName } from '../../domain/engines/delivery-job-events';

export function eventNamesForTransition(from: DeliveryJobStatus, to: DeliveryJobStatus): DeliveryJobEventName | null {
  return mapTransitionEvent(from, to);
}

export async function publishDeliveryJobTransition(
  job: DeliveryJob,
  fromStatus: DeliveryJobStatus,
  toStatus: DeliveryJobStatus,
): Promise<void> {
  const eventName = mapTransitionEvent(fromStatus, toStatus);
  if (!eventName) return;

  const prisma = (globalThis as any).prisma;
  if (!prisma?.logistics_OutboxEvent?.create) return;

  try {
    await prisma.logistics_OutboxEvent.create({
      data: {
        eventId: randomUUID(),
        eventType: eventName,
        eventData: {
          deliveryJobId: job.id,
          shipmentIds: job.shipmentIds,
          fromStatus,
          toStatus,
          driverId: job.driverId,
          occurredAt: new Date().toISOString(),
        },
        status: 'PENDING',
      },
    });
  } catch (err: any) {
    // Best-effort: consumers can reconcile from the delivery job row.
    console.error(`[DeliveryJobEvents] Failed to persist ${eventName} outbox event:`, err?.message);
  }
}