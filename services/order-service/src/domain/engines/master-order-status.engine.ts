/**
 * Master Order Status Derivation Engine
 *
 * Computes the derived master order status from the statuses of its child
 * seller orders. This is computed on every read — never persisted to the DB.
 *
 * Precedence rules (evaluated in order):
 *  1. ALL DELIVERED or COMPLETED → COMPLETED
 *  2. ALL cancelled → CANCELLED
 *  3. ANY cancelled → PARTIALLY_CANCELLED
 *  4. ANY SHIPPED or IN_TRANSIT → IN_TRANSIT
 *  5. ANY SELLER_CONFIRMED or SELLER_VERIFIED → CONFIRMED
 *  6. ALL PENDING or PENDING_SELLER_VERIFICATION → PENDING
 *  7. Otherwise → PROCESSING
 */

export type MasterOrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'PARTIALLY_CANCELLED'
  | 'PROCESSING';

/**
 * Pure function — deterministic for identical inputs.
 * @param sellerOrderStatuses Array of status strings from child Order_Order records
 * @returns The derived master order status
 */
export function deriveMasterOrderStatus(sellerOrderStatuses: string[]): MasterOrderStatus {
  if (!sellerOrderStatuses || sellerOrderStatuses.length === 0) return 'PENDING';

  const statuses = sellerOrderStatuses.map(s => s.toLowerCase());

  const isDeliveredOrCompleted = (s: string) =>
    s === 'delivered' || s === 'completed';

  const isCancelled = (s: string) =>
    s === 'cancelled';

  const isShippedOrTransit = (s: string) =>
    s === 'shipped' || s === 'in_transit';

  const isConfirmed = (s: string) =>
    s === 'seller_confirmed' ||
    s === 'seller_verified' ||
    s === 'confirmed' ||
    s === 'order_placed';

  const isPending = (s: string) =>
    s === 'pending' ||
    s === 'pending_seller_verification' ||
    s === 'draft';

  // Rule 1: all delivered/completed
  if (statuses.every(isDeliveredOrCompleted)) return 'COMPLETED';

  // Rule 2: all cancelled
  if (statuses.every(isCancelled)) return 'CANCELLED';

  // Rule 3: any cancelled (but not all)
  if (statuses.some(isCancelled)) return 'PARTIALLY_CANCELLED';

  // Rule 4: any in transit or shipped
  if (statuses.some(isShippedOrTransit)) return 'IN_TRANSIT';

  // Rule 5: any confirmed
  if (statuses.some(isConfirmed)) return 'CONFIRMED';

  // Rule 6: all pending
  if (statuses.every(isPending)) return 'PENDING';

  // Default
  return 'PROCESSING';
}
