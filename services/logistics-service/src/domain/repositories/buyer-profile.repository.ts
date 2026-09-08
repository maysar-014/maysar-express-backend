/**
 * BuyerProfileRepository (Phase 6 §6.3)
 */

export interface BuyerProfileRow {
  buyerId: string;
  deliverySuccessRate: number;
  completedDeliveries: number;
  failedDeliveries: number;
  typicalOrderWeightKg: number;
  consolidationAcceptanceRate: number;
  preferredDeliveryWindows: Record<string, number>;
  pickupPreference: string;
}

export interface BuyerDeliveryOutcome {
  success: boolean;
  weightKg?: number;
  /** Window bucket the delivery fell into, e.g. 'STANDARD' or hour histogram. */
  windowBucket?: string;
  /** Whether the buyer had chosen a shared (consolidated) option. */
  choseShared?: boolean;
}

export interface BuyerProfileRepository {
  findByBuyerId(buyerId: string): Promise<BuyerProfileRow | null>;
  /** Creates the profile row if absent, then applies the outcome. */
  recordOutcome(buyerId: string, outcome: BuyerDeliveryOutcome): Promise<BuyerProfileRow>;
}
