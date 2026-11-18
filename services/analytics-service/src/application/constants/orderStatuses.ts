/**
 * Committed Order Statuses
 *
 * Orders where payment has been committed and the order is in the fulfillment pipeline.
 * These statuses represent real revenue-generating transactions and must be included
 * in all revenue, sales, and performance metric calculations.
 *
 * Excluded statuses (not included here):
 *   DRAFT, PENDING                     — uncommitted orders
 *   CANCELLED                          — cancelled transactions
 *   PENDING_SELLER_VERIFICATION,
 *   SELLER_REVIEWING, SELLER_CONFIRMED,
 *   SELLER_VERIFIED, SELLER_REJECTED,
 *   SELLER_DECLINED, PAYMENT_PENDING,
 *   ORDER_PLACED, VERIFICATION_OVERDUE,
 *   UNDER_ADMIN_REVIEW                 — seller verification states
 */
export const COMMITTED_ORDER_STATUSES = [
  'CONFIRMED',
  'PROCESSING',
  'ASSIGNED',
  'SHIPPED',
  'IN_TRANSIT',
  'DELIVERED',
  'COMPLETED'
];

/**
 * Terminal Completed Statuses
 *
 * The subset of committed statuses that represent orders that have fully completed
 * the fulfillment lifecycle. Used as the numerator in order completion rate calculations.
 */
export const TERMINAL_COMPLETED_STATUSES = [
  'DELIVERED',
  'COMPLETED'
];
