/**
 * Buy Box Ranking System — Fraud Detector
 * Anomaly detection pre-pass that flags suspicious signal patterns and
 * substitutes rolling averages for flagged signals before scoring.
 *
 * Requirement 5: Fraud/manipulation detection
 */

import { AnomalyFlagResult, SignalValues, SIGNAL_KEYS } from './types';

// ---------------------------------------------------------------------------
// Input interfaces
// ---------------------------------------------------------------------------

interface HistoricalStats {
  rollingMean: Partial<SignalValues>;
  rollingStdDev: Partial<SignalValues>;
  thirtyDayAveragePrice?: number;
  stockLevelYesterday?: number;
  hasPromotionalCampaign?: boolean;
  hasSupplierShipmentRecord?: boolean;
}

interface CurrentSignalInputs {
  signalValues: SignalValues;
  currentOfferPrice?: number;
  currentStockLevel?: number;
}

// ---------------------------------------------------------------------------
// FraudDetector
// ---------------------------------------------------------------------------

export class FraudDetector {
  /**
   * Detect anomalies in a seller's current signal values by comparing them
   * against their historical rolling statistics.
   *
   * Three detection passes are performed:
   *  1. Statistical outlier check — any signal deviating >2 std deviations
   *     from the rolling mean is flagged.
   *  2. Stock level spike check — a >500% increase in stock without a
   *     supplier shipment record is flagged.
   *  3. Price drop check — a >40% price drop without a promotional campaign
   *     record is flagged.
   *
   * The returned list is deduplicated: at most one flag per signal name.
   */
  detectAnomalies(
    currentInputs: CurrentSignalInputs,
    historicalStats: HistoricalStats,
  ): AnomalyFlagResult[] {
    const flagMap = new Map<keyof SignalValues, AnomalyFlagResult>();

    // --- Pass 1: statistical outlier detection across all 9 signals ---
    for (const key of SIGNAL_KEYS) {
      const mean = historicalStats.rollingMean[key];
      const stdDev = historicalStats.rollingStdDev[key];

      if (mean === undefined || mean === null || stdDev === undefined || stdDev === null) {
        continue;
      }

      const currentValue = currentInputs.signalValues[key];
      const expectedMin = mean - 2 * stdDev;
      const expectedMax = mean + 2 * stdDev;

      if (currentValue < expectedMin || currentValue > expectedMax) {
        flagMap.set(key, {
          signalName: key,
          detectedValue: currentValue,
          expectedMin,
          expectedMax,
          substitutedValue: mean,
        });
      }
    }

    // --- Pass 2: stock level spike detection ---
    const { currentStockLevel } = currentInputs;
    const { stockLevelYesterday, hasSupplierShipmentRecord } = historicalStats;

    if (
      currentStockLevel !== undefined &&
      currentStockLevel !== null &&
      stockLevelYesterday !== undefined &&
      stockLevelYesterday !== null
    ) {
      const isSpike = currentStockLevel > stockLevelYesterday * 6;
      const noShipmentRecord = !hasSupplierShipmentRecord;

      if (isSpike && noShipmentRecord) {
        const signalKey: keyof SignalValues = 'stockReliability';
        if (!flagMap.has(signalKey)) {
          // Use rolling mean as substituted value when available, otherwise
          // fall back to the current detected value (no substitution possible).
          const mean = historicalStats.rollingMean[signalKey];
          const substitutedValue = mean !== undefined && mean !== null
            ? mean
            : currentInputs.signalValues[signalKey];

          // Compute expected bounds from rolling stats when available.
          const stdDev = historicalStats.rollingStdDev[signalKey];
          const expectedMin = mean !== undefined && mean !== null && stdDev !== undefined && stdDev !== null
            ? mean - 2 * stdDev
            : currentInputs.signalValues[signalKey];
          const expectedMax = mean !== undefined && mean !== null && stdDev !== undefined && stdDev !== null
            ? mean + 2 * stdDev
            : currentInputs.signalValues[signalKey];

          flagMap.set(signalKey, {
            signalName: signalKey,
            detectedValue: currentInputs.signalValues[signalKey],
            expectedMin,
            expectedMax,
            substitutedValue,
          });
        }
      }
    }

    // --- Pass 3: price drop detection ---
    const { currentOfferPrice } = currentInputs;
    const { thirtyDayAveragePrice, hasPromotionalCampaign } = historicalStats;

    if (
      currentOfferPrice !== undefined &&
      currentOfferPrice !== null &&
      thirtyDayAveragePrice !== undefined &&
      thirtyDayAveragePrice !== null
    ) {
      const isSteepDrop = currentOfferPrice < thirtyDayAveragePrice * 0.60;
      const noPromoRecord = !hasPromotionalCampaign;

      if (isSteepDrop && noPromoRecord) {
        const signalKey: keyof SignalValues = 'priceCompetitiveness';
        if (!flagMap.has(signalKey)) {
          const mean = historicalStats.rollingMean[signalKey];
          const substitutedValue = mean !== undefined && mean !== null
            ? mean
            : currentInputs.signalValues[signalKey];

          const stdDev = historicalStats.rollingStdDev[signalKey];
          const expectedMin = mean !== undefined && mean !== null && stdDev !== undefined && stdDev !== null
            ? mean - 2 * stdDev
            : currentInputs.signalValues[signalKey];
          const expectedMax = mean !== undefined && mean !== null && stdDev !== undefined && stdDev !== null
            ? mean + 2 * stdDev
            : currentInputs.signalValues[signalKey];

          flagMap.set(signalKey, {
            signalName: signalKey,
            detectedValue: currentInputs.signalValues[signalKey],
            expectedMin,
            expectedMax,
            substitutedValue,
          });
        }
      }
    }

    return Array.from(flagMap.values());
  }

  /**
   * Return a new `SignalValues` object with each flagged signal's value
   * replaced by its `substitutedValue` (the rolling average).
   *
   * The original `signals` object is never mutated.
   */
  applyAnomalySubstitutions(
    signals: SignalValues,
    flags: AnomalyFlagResult[],
  ): SignalValues {
    if (flags.length === 0) {
      return { ...signals };
    }

    const substitutions: Partial<SignalValues> = {};
    for (const flag of flags) {
      substitutions[flag.signalName] = flag.substitutedValue;
    }

    return { ...signals, ...substitutions };
  }

  /**
   * Compute the manipulation penalty based on the number of active anomaly
   * flags for a seller.
   *
   * Returns −20 when `activeFlagCount >= 3`, otherwise 0.
   */
  computeManipulationPenalty(activeFlagCount: number): number {
    return activeFlagCount >= 3 ? -20 : 0;
  }
}
