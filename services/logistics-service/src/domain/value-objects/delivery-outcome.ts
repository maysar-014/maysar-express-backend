/**
 * DeliveryOutcome (MYS-DEL-001 Article 23)
 *
 * Every delivery attempt must have a traceable outcome with actor and cause
 * attribution. This replaces the flat 'cancelled' | 'failed' status type
 * on the legacy DeliveryEntity, which made it impossible to:
 *   - Determine financial responsibility for cancellation costs.
 *   - Distinguish customer-unavailability from address-errors in failure rates.
 *   - Track return-to-origin inventory and cost implications.
 *
 * Usage:
 *   The Logistics_Shipment.status and Logistics_Delivery.status fields shall
 *   use these outcome codes as terminal states. Non-terminal operational states
 *   (CREATED, PLANNED, ASSIGNED, DISPATCHED, etc.) remain as separate status
 *   values on those models — this enum represents the FINAL OUTCOME only.
 *
 * Financial attribution by outcome:
 *   CANCELLED_BY_CUSTOMER        → customer may bear cancellation fee if post-dispatch
 *   CANCELLED_BY_MERCHANT        → merchant bears pickup + waiting cost
 *   CANCELLED_BY_DRIVER          → platform investigates; compensation still owed
 *   CANCELLED_BY_PLATFORM        → Maysar bears cost; full refund to buyer
 *   FAILED_CUSTOMER_UNAVAILABLE  → customer bears re-delivery fee; COD dispute risk
 *   FAILED_MERCHANT_UNAVAILABLE  → merchant bears driver waiting + re-dispatch cost
 *   FAILED_ADDRESS_OR_LOCATION   → attributed per investigation; potential customer cost
 *   FAILED_OTHER                 → attributed per investigation
 *   RETURNED_TO_ORIGIN           → triggered by any FAILED outcome; logistics cost recorded
 *   COMPLETED                    → normal settlement
 */

export type DeliveryOutcome =
  | 'COMPLETED'
  | 'CANCELLED_BY_CUSTOMER'
  | 'CANCELLED_BY_MERCHANT'
  | 'CANCELLED_BY_DRIVER'
  | 'CANCELLED_BY_PLATFORM'
  | 'FAILED_CUSTOMER_UNAVAILABLE'
  | 'FAILED_MERCHANT_UNAVAILABLE'
  | 'FAILED_ADDRESS_OR_LOCATION'
  | 'FAILED_OTHER'
  | 'RETURNED_TO_ORIGIN';

/** All valid terminal outcomes, for validation guards. */
export const DELIVERY_OUTCOMES: readonly DeliveryOutcome[] = [
  'COMPLETED',
  'CANCELLED_BY_CUSTOMER',
  'CANCELLED_BY_MERCHANT',
  'CANCELLED_BY_DRIVER',
  'CANCELLED_BY_PLATFORM',
  'FAILED_CUSTOMER_UNAVAILABLE',
  'FAILED_MERCHANT_UNAVAILABLE',
  'FAILED_ADDRESS_OR_LOCATION',
  'FAILED_OTHER',
  'RETURNED_TO_ORIGIN',
] as const;

/** Outcomes that resulted in the delivery being completed successfully. */
export const SUCCESSFUL_OUTCOMES: readonly DeliveryOutcome[] = ['COMPLETED'];

/** Outcomes that resulted in cancellation before dispatch or during pickup. */
export const CANCELLATION_OUTCOMES: readonly DeliveryOutcome[] = [
  'CANCELLED_BY_CUSTOMER',
  'CANCELLED_BY_MERCHANT',
  'CANCELLED_BY_DRIVER',
  'CANCELLED_BY_PLATFORM',
];

/** Outcomes that resulted in a failed delivery attempt. */
export const FAILURE_OUTCOMES: readonly DeliveryOutcome[] = [
  'FAILED_CUSTOMER_UNAVAILABLE',
  'FAILED_MERCHANT_UNAVAILABLE',
  'FAILED_ADDRESS_OR_LOCATION',
  'FAILED_OTHER',
];

/** Financial responsibility by outcome (informs CostAdjustment.responsibleParty). */
export type OutcomeResponsibleParty = 'CUSTOMER' | 'MERCHANT' | 'DRIVER' | 'MAYSAR' | 'INVESTIGATE';

export const OUTCOME_RESPONSIBLE_PARTY: Record<DeliveryOutcome, OutcomeResponsibleParty> = {
  COMPLETED:                    'MAYSAR',      // settled normally
  CANCELLED_BY_CUSTOMER:        'CUSTOMER',
  CANCELLED_BY_MERCHANT:        'MERCHANT',
  CANCELLED_BY_DRIVER:          'INVESTIGATE', // platform investigates before assigning cost
  CANCELLED_BY_PLATFORM:        'MAYSAR',
  FAILED_CUSTOMER_UNAVAILABLE:  'CUSTOMER',
  FAILED_MERCHANT_UNAVAILABLE:  'MERCHANT',
  FAILED_ADDRESS_OR_LOCATION:   'INVESTIGATE',
  FAILED_OTHER:                 'INVESTIGATE',
  RETURNED_TO_ORIGIN:           'INVESTIGATE', // sub-outcome — responsibility from the triggering failure
};

/** Type guard: checks whether a string is a valid DeliveryOutcome. */
export function isDeliveryOutcome(value: string): value is DeliveryOutcome {
  return (DELIVERY_OUTCOMES as readonly string[]).includes(value);
}

/**
 * Returns true when the outcome requires financial cost attribution
 * (a CostAdjustment record should be created).
 */
export function requiresCostAttribution(outcome: DeliveryOutcome): boolean {
  return outcome !== 'COMPLETED';
}

/**
 * Returns true when the outcome implies the package may need to be
 * tracked for return-to-origin logistics.
 */
export function impliesReturn(outcome: DeliveryOutcome): boolean {
  return FAILURE_OUTCOMES.includes(outcome) || outcome === 'RETURNED_TO_ORIGIN';
}
