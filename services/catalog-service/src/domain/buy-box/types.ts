/**
 * Buy Box Ranking System — Domain Types
 * Core interfaces, enums, and constants for the ranking engine.
 */

// ---------------------------------------------------------------------------
// Signal types
// ---------------------------------------------------------------------------

export interface SignalValues {
  priceCompetitiveness: number;   // 0–100
  sellerTrustScore: number;       // 0–100
  fulfillmentReliability: number; // 0–100
  deliverySpeed: number;          // 0–100
  stockReliability: number;       // 0–100
  disputeRate: number;            // 0–100 (inverted: 100 = 0% dispute rate)
  cancellationRate: number;       // 0–100 (inverted)
  returnRate: number;             // 0–100 (inverted)
  customerRetentionImpact: number; // 0–100
}

export interface SignalWeights {
  priceCompetitiveness: number;
  sellerTrustScore: number;
  fulfillmentReliability: number;
  deliverySpeed: number;
  stockReliability: number;
  disputeRate: number;
  cancellationRate: number;
  returnRate: number;
  customerRetentionImpact: number;
}

/** All 9 signal key names in a fixed order — useful for iteration and validation. */
export const SIGNAL_KEYS: (keyof SignalValues)[] = [
  'priceCompetitiveness',
  'sellerTrustScore',
  'fulfillmentReliability',
  'deliverySpeed',
  'stockReliability',
  'disputeRate',
  'cancellationRate',
  'returnRate',
  'customerRetentionImpact',
];

// ---------------------------------------------------------------------------
// Default strategy weights (Requirement 1.5)
// ---------------------------------------------------------------------------

export const DEFAULT_STRATEGY_WEIGHTS: SignalWeights = {
  priceCompetitiveness: 0.22,
  sellerTrustScore: 0.20,
  fulfillmentReliability: 0.18,
  deliverySpeed: 0.12,
  stockReliability: 0.08,
  disputeRate: 0.08,
  cancellationRate: 0.05,
  returnRate: 0.04,
  customerRetentionImpact: 0.03,
};

// ---------------------------------------------------------------------------
// Category strategy
// ---------------------------------------------------------------------------

export interface CategoryStrategy {
  categoryId: string;
  name: string;
  weights: SignalWeights;
  explorationBudget: number; // 0.0–0.20
  minTrustScoreThreshold?: number; // e.g. 70 for MEDICINES
}

/**
 * Built-in category strategy presets.
 * Weights are tuned per category per Requirement 2.3.
 * Each set sums to exactly 1.0.
 */
export const CATEGORY_STRATEGY_PRESETS: Record<string, CategoryStrategy> = {
  GROCERIES: {
    categoryId: 'GROCERIES',
    name: 'GROCERIES',
    explorationBudget: 0.10,
    weights: {
      priceCompetitiveness: 0.18,
      sellerTrustScore: 0.12,
      fulfillmentReliability: 0.15,
      deliverySpeed: 0.25,       // emphasised
      stockReliability: 0.18,    // emphasised
      disputeRate: 0.05,
      cancellationRate: 0.04,
      returnRate: 0.02,
      customerRetentionImpact: 0.01,
    },
  },
  ELECTRONICS: {
    categoryId: 'ELECTRONICS',
    name: 'ELECTRONICS',
    explorationBudget: 0.10,
    weights: {
      priceCompetitiveness: 0.15,
      sellerTrustScore: 0.28,    // emphasised
      fulfillmentReliability: 0.22, // emphasised
      deliverySpeed: 0.10,
      stockReliability: 0.08,
      disputeRate: 0.08,
      cancellationRate: 0.05,
      returnRate: 0.03,
      customerRetentionImpact: 0.01,
    },
  },
  FASHION: {
    categoryId: 'FASHION',
    name: 'FASHION',
    explorationBudget: 0.10,
    weights: {
      priceCompetitiveness: 0.20,
      sellerTrustScore: 0.15,
      fulfillmentReliability: 0.12,
      deliverySpeed: 0.10,
      stockReliability: 0.06,
      disputeRate: 0.07,
      cancellationRate: 0.05,
      returnRate: 0.15,          // emphasised
      customerRetentionImpact: 0.10, // emphasised
    },
  },
  MEDICINES: {
    categoryId: 'MEDICINES',
    name: 'MEDICINES',
    explorationBudget: 0.05,
    minTrustScoreThreshold: 70,
    weights: {
      priceCompetitiveness: 0.10,
      sellerTrustScore: 0.35,    // heavily emphasised
      fulfillmentReliability: 0.20,
      deliverySpeed: 0.12,
      stockReliability: 0.08,
      disputeRate: 0.07,
      cancellationRate: 0.04,
      returnRate: 0.03,
      customerRetentionImpact: 0.01,
    },
  },
  FURNITURE: {
    categoryId: 'FURNITURE',
    name: 'FURNITURE',
    explorationBudget: 0.10,
    weights: {
      priceCompetitiveness: 0.18,
      sellerTrustScore: 0.15,
      fulfillmentReliability: 0.25, // emphasised
      deliverySpeed: 0.20,          // emphasised
      stockReliability: 0.08,
      disputeRate: 0.06,
      cancellationRate: 0.04,
      returnRate: 0.03,
      customerRetentionImpact: 0.01,
    },
  },
};

// ---------------------------------------------------------------------------
// Geographic zones (Requirement 7.6)
// ---------------------------------------------------------------------------

export enum GeographicZone {
  DAR_ES_SALAAM_KARIAKOO = 'DAR_ES_SALAAM_KARIAKOO',
  DAR_ES_SALAAM_MIKOCHENI = 'DAR_ES_SALAAM_MIKOCHENI',
  DAR_ES_SALAAM_OTHER = 'DAR_ES_SALAAM_OTHER',
  ARUSHA = 'ARUSHA',
  MWANZA = 'MWANZA',
  DODOMA = 'DODOMA',
  OTHER_TANZANIA = 'OTHER_TANZANIA',
}

// ---------------------------------------------------------------------------
// Context and offer types
// ---------------------------------------------------------------------------

export interface BuyBoxContext {
  productId: string;
  buyerZone?: GeographicZone;
  paymentMethod?: string;
}

export interface SellerOffer {
  sellerId: string;
  price: number;
  stockLevel: number;
  accountStatus: string; // 'active' | 'suspended' | 'banned' | 'pending_verification'
}

// ---------------------------------------------------------------------------
// Raw signal data fetched from the database
// ---------------------------------------------------------------------------

export interface SellerSignalData {
  sellerId: string;
  productId: string;
  offerPrice: number;
  allOfferPrices: number[];
  stockLevel: number;
  accountStatus: string;
  // Order history counts within the rolling window
  orderCount: number;
  disputeCount: number;
  cancellationCount: number;
  returnCount: number;
  fulfillmentCount: number;
  stockOutCancellationCount: number;
  // Trust sub-factors
  accountAgeDays: number;
  isVerifiedIdentity: boolean;
  complianceScore: number; // 0–100
  // COD-specific
  codRefusalCount: number;
  codOrderCount: number;
  // Retention
  retentionOrderCount: number;
  repeatBuyerCount: number;
  // Margin
  commissionTier: number;       // fractional, e.g. 0.08 = 8%
  logisticsCostEstimate: number; // absolute TZS amount
  // Fraud detection support
  rollingMean: Partial<SignalValues>;
  rollingStdDev: Partial<SignalValues>;
  platformCategoryAverages: Partial<SignalValues>;
}

// ---------------------------------------------------------------------------
// Anomaly flag result (output of FraudDetector)
// ---------------------------------------------------------------------------

export interface AnomalyFlagResult {
  signalName: keyof SignalValues;
  detectedValue: number;
  expectedMin: number;
  expectedMax: number;
  substitutedValue: number; // rolling average used instead
}

// ---------------------------------------------------------------------------
// Composite score result
// ---------------------------------------------------------------------------

export interface CompositeScoreResult {
  compositeScore: number; // [0, 100]
  signalValues: SignalValues;
  signalWeights: SignalWeights;
  strategyName: string;
  assignmentType: 'MERIT' | 'EXPLORATION';
  anomalyFlags: AnomalyFlagResult[];
  penalties: {
    newSellerPenalty: number;
    manipulationPenalty: number;
    highCodRiskPenalty: number;
    criticalCodRiskPenalty: number;
    negativeMarginPenalty: number;
  };
  bonuses: {
    highMarginBonus: number;
  };
}

// ---------------------------------------------------------------------------
// Buy Box selection result
// ---------------------------------------------------------------------------

export interface BuyBoxSelectionResult {
  winnerId: string;
  winnerScore: number;
  assignmentType: 'MERIT' | 'EXPLORATION';
  alternatives: Array<{
    sellerId: string;
    compositeScore: number;
    rank: number;
  }>;
}

// ---------------------------------------------------------------------------
// Score snapshot input (for persistence)
// ---------------------------------------------------------------------------

export interface ScoreSnapshotInput {
  productId: string;
  sellerId: string;
  compositeScore: number;
  signalValues: SignalValues;
  signalWeights: SignalWeights;
  assignmentType: 'MERIT' | 'EXPLORATION';
  strategyName: string;
  geographicZone?: string;
  anomalyFlags?: AnomalyFlagResult[];
  computedAt: Date;
}
