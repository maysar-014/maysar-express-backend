/**
 * DeliveryOutcomeClassification (MYS-DEL-001 Article 23)
 *
 * Every delivery attempt must have a traceable, actor/cause-attributed outcome.
 * The flat legacy `DeliveryStatus` (assigned | picked_up | ...) captures the
 * operational lifecycle of an in-progress shipment.
 *
 * This enum captures the *terminal result* of a delivery attempt with the
 * granularity required for financial classification, cancellation economics
 * (Article 24), and failed delivery controls (Article 25).
 *
 * The distinction matters financially:
 *   - CANCELLED_BY_CUSTOMER may warrant a cancellation fee recovered from the buyer.
 *   - CANCELLED_BY_MERCHANT may warrant a supplier deduction.
 *   - CANCELLED_BY_DRIVER may trigger compensation under the driver policy.
 *   - FAILED_CUSTOMER_UNAVAILABLE has a different cost-responsibility chain
 *     than FAILED_ADDRESS_OR_LOCATION.
 *   - RETURNED_TO_ORIGIN incurs return-journey costs that must be attributed.
 *
 * Usage: set alongside (not instead of) ShipmentStatus when a shipment reaches
 * a terminal state. The outcome feeds the CostAdjustment responsible-party
 * attribution and the financial feasibility reporting pipeline.
 */

export enum DeliveryOutcome {
  /** Goods successfully delivered and confirmed. */
  COMPLETED = 'COMPLETED',

  /** Customer cancelled before dispatch or before the driver reached the pickup point. */
  CANCELLED_BY_CUSTOMER = 'CANCELLED_BY_CUSTOMER',

  /** Merchant cancelled the order or was unable to fulfil it at the pickup point. */
  CANCELLED_BY_MERCHANT = 'CANCELLED_BY_MERCHANT',

  /** Driver cancelled the assignment after acceptance. */
  CANCELLED_BY_DRIVER = 'CANCELLED_BY_DRIVER',

  /** Platform-initiated cancellation (operational, compliance, or system failure). */
  CANCELLED_BY_PLATFORM = 'CANCELLED_BY_PLATFORM',

  /**
   * Delivery attempted but the customer could not be reached or was not present.
   * Cost responsibility: typically the customer (see CostVariancePolicy).
   */
  FAILED_CUSTOMER_UNAVAILABLE = 'FAILED_CUSTOMER_UNAVAILABLE',

  /**
   * Delivery could not proceed because the merchant was not ready or unavailable at pickup.
   * Cost responsibility: typically the merchant (supplier deduction).
   */
  FAILED_MERCHANT_UNAVAILABLE = 'FAILED_MERCHANT_UNAVAILABLE',

  /**
   * Delivery location could not be found or accessed (address incomplete, locked gate, etc.).
   * Cost responsibility: shared — depends on who provided the address data.
   */
  FAILED_ADDRESS_OR_LOCATION = 'FAILED_ADDRESS_OR_LOCATION',

  /** Delivery failed for a reason not covered by the specific codes above. */
  FAILED_OTHER = 'FAILED_OTHER',

  /**
   * Package returned to the seller origin after a failed delivery attempt.
   * Incurs a return-journey cost that must be attributed to the responsible party.
   */
  RETURNED_TO_ORIGIN = 'RETURNED_TO_ORIGIN',
}

/** Map from DeliveryOutcome to the responsible-party classification used in
 *  CostAdjustment for financial settlement. This is the default; the
 *  SettleDeliveryJobUseCase may override when evidence exists. */
export const OUTCOME_DEFAULT_RESPONSIBLE_PARTY: Record<
  DeliveryOutcome,
  'CUSTOMER' | 'SUPPLIER' | 'DRIVER' | 'MAYSAR' | null
> = {
  [DeliveryOutcome.COMPLETED]:                  null,       // no adjustment needed
  [DeliveryOutcome.CANCELLED_BY_CUSTOMER]:      'CUSTOMER',
  [DeliveryOutcome.CANCELLED_BY_MERCHANT]:      'SUPPLIER',
  [DeliveryOutcome.CANCELLED_BY_DRIVER]:        'DRIVER',
  [DeliveryOutcome.CANCELLED_BY_PLATFORM]:      'MAYSAR',
  [DeliveryOutcome.FAILED_CUSTOMER_UNAVAILABLE]:'CUSTOMER',
  [DeliveryOutcome.FAILED_MERCHANT_UNAVAILABLE]:'SUPPLIER',
  [DeliveryOutcome.FAILED_ADDRESS_OR_LOCATION]: 'CUSTOMER', // conservative default; can be overridden
  [DeliveryOutcome.FAILED_OTHER]:               'MAYSAR',   // unknown → Maysar absorbs by default
  [DeliveryOutcome.RETURNED_TO_ORIGIN]:         'CUSTOMER', // return triggered by failed delivery
};
