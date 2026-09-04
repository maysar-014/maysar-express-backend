/**
 * DeliveryJob transition events (Phase 2 §2.2)
 *
 * Backlog contracts:
 *   DriverAssigned        ASSIGNED         (driver takes the job)
 *   GoodsLoaded           LOADING          (cargo confirmed loaded)
 *   ShipmentDeparted      IN_TRANSIT       (left the last pickup)
 *   DeliveryAttempted     AT_DESTINATION   (arrived at destination / attempted)
 *   DeliveryCompleted     DELIVERED        (goods handed over)
 *   DeliveryFailed        FAILED_PICKUP | CUSTOMER_UNAVAILABLE
 *
 * `mapTransitionEvent` is pure (no I/O). Consumers persist it to the outbox /
 * publish to the shared event bus. Order service, payment service, and trust
 * service subscribe to `DeliveryCompleted` / `DeliveryFailed`.
 */

import { DeliveryJobStatus } from '../entities/delivery-job.entity';

export const DELIVERY_JOB_EVENT_NAMES = [
  'DriverAssigned',
  'GoodsLoaded',
  'ShipmentDeparted',
  'DeliveryAttempted',
  'DeliveryCompleted',
  'DeliveryFailed',
] as const;

export type DeliveryJobEventName = typeof DELIVERY_JOB_EVENT_NAMES[number];

/** Map a DeliveryJob transition (fromStatus → toStatus) to a backlog event name. */
export function mapTransitionEvent(
  fromStatus: DeliveryJobStatus,
  toStatus: DeliveryJobStatus,
): DeliveryJobEventName | null {
  // Guard against no-ops.
  if (fromStatus === toStatus) return null;

  switch (toStatus) {
    case 'ASSIGNED':            return 'DriverAssigned';
    case 'LOADING':             return 'GoodsLoaded';
    case 'IN_TRANSIT':          return 'ShipmentDeparted';
    case 'AT_DESTINATION':      return 'DeliveryAttempted';
    case 'DELIVERED':           return 'DeliveryCompleted';
    case 'FAILED_PICKUP':       return 'DeliveryFailed';
    case 'CUSTOMER_UNAVAILABLE': return 'DeliveryFailed';
    default:                    return null;
  }
}