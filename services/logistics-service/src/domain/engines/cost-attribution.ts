/**
 * Cost attribution rules (Phase 3 §3.2)
 *
 * Every logistics cost that deviates from the planned route or schedule must
 * have an attributed cause. This pure mapping is the single source of truth
 * for which (adjustmentType, responsibleParty) pair each operational event
 * produces:
 *
 *   supplier not ready at pickup   → WAITING,                 SUPPLIER
 *   customer unreachable at drop   → FAILED_DELIVERY_ATTEMPT, CUSTOMER
 *   route incorrectly calculated   → ROUTE_DEVIATION,         MAYSAR
 *   driver deviation from route    → ROUTE_DEVIATION,         DRIVER
 *   external (traffic, weather)    → WAITING,                 EXTERNAL
 *
 * PURE — no I/O, no side effects.
 */

export type AttributionEvent =
  | 'SUPPLIER_NOT_READY'
  | 'CUSTOMER_UNREACHABLE'
  | 'ROUTE_MISCALCULATED'
  | 'DRIVER_DEVIATION'
  | 'EXTERNAL_DELAY';

export interface AttributionResult {
  adjustmentType: 'WAITING' | 'FAILED_DELIVERY_ATTEMPT' | 'ROUTE_DEVIATION' | 'LOADING_DELAY' | 'DAMAGE' | 'DISPUTE';
  responsibleParty: 'CUSTOMER' | 'SUPPLIER' | 'DRIVER' | 'MAYSAR' | 'EXTERNAL';
}

const RULES: Record<AttributionEvent, AttributionResult> = {
  SUPPLIER_NOT_READY:    { adjustmentType: 'WAITING',                responsibleParty: 'SUPPLIER' },
  CUSTOMER_UNREACHABLE:  { adjustmentType: 'FAILED_DELIVERY_ATTEMPT', responsibleParty: 'CUSTOMER' },
  ROUTE_MISCALCULATED:   { adjustmentType: 'ROUTE_DEVIATION',        responsibleParty: 'MAYSAR' },
  DRIVER_DEVIATION:      { adjustmentType: 'ROUTE_DEVIATION',        responsibleParty: 'DRIVER' },
  EXTERNAL_DELAY:        { adjustmentType: 'WAITING',                responsibleParty: 'EXTERNAL' },
};

export function resolveAttribution(event: AttributionEvent): AttributionResult {
  return { ...RULES[event] };
}
