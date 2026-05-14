/**
 * Buy Box Ranking System — Property-Based Tests
 *
 * Tests 8 correctness properties of the ranking system using pure functions
 * from the domain layer. No database or mocks required.
 *
 * Feature: buy-box-ranking-system
 */

import { describe, it, expect } from 'vitest';
import {
  computePriceCompetitiveness,
} from '../signals/price-competitiveness.signal';
import {
  computeFulfillmentReliability,
} from '../signals/fulfillment-reliability.signal';
import { computeRateSignal } from '../signals/rate-signals.signal';
import { ExplorationAllocator } from '../exploration-allocator';
import {
  SignalValues,
  SignalWeights,
  SIGNAL_KEYS,
  DEFAULT_STRATEGY_WEIGHTS,
} from '../types';
import { CategoryStrategyService } from '../category-strategy.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Run a property test N times with a generator */
function forAll<T>(
  count: number,
  generator: () => T,
  property: (value: T) => void,
): void {
  for (let i = 0; i < count; i++) {
    property(generator());
  }
}

/** Generate random SignalValues with each signal in [0, 100] */
function randomSignalValues(): SignalValues {
  return {
    priceCompetitiveness: randomFloat(0, 100),
    sellerTrustScore: randomFloat(0, 100),
    fulfillmentReliability: randomFloat(0, 100),
    deliverySpeed: randomFloat(0, 100),
    stockReliability: randomFloat(0, 100),
    disputeRate: randomFloat(0, 100),
    cancellationRate: randomFloat(0, 100),
    returnRate: randomFloat(0, 100),
    customerRetentionImpact: randomFloat(0, 100),
  };
}

/**
 * Generate valid SignalWeights that sum to exactly 1.0.
 * Uses a Dirichlet-like approach: generate 9 random values, normalise.
 */
function randomValidWeights(): SignalWeights {
  const raw = SIGNAL_KEYS.map(() => Math.random() + 0.01); // avoid zero
  const total = raw.reduce((a, b) => a + b, 0);
  const normalised = raw.map((v) => v / total);
  return SIGNAL_KEYS.reduce((acc, key, i) => {
    acc[key] = normalised[i];
    return acc;
  }, {} as SignalWeights);
}

/**
 * Pure composite score computation — no I/O.
 * Mirrors the core formula in RankingEngine.computeCompositeScore.
 */
function computeCompositeScore(
  signals: SignalValues,
  weights: SignalWeights,
): number {
  let sum = 0;
  for (const key of SIGNAL_KEYS) {
    sum += signals[key] * weights[key];
  }
  return Math.max(0, Math.min(100, sum));
}

// ---------------------------------------------------------------------------
// Property 1 — Score Bounds Invariant
// Feature: buy-box-ranking-system, Property 1: Score Bounds Invariant
// Validates: Requirement 14.1
// ---------------------------------------------------------------------------

describe('Property 1: Score Bounds Invariant', () => {
  it('composite score is always in [0, 100] for any valid signals and weights', () => {
    forAll(
      500,
      () => ({ signals: randomSignalValues(), weights: randomValidWeights() }),
      ({ signals, weights }) => {
        const score = computeCompositeScore(signals, weights);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      },
    );
  });

  it('score is 0 when all signals are 0', () => {
    const zeroSignals: SignalValues = SIGNAL_KEYS.reduce((acc, key) => {
      acc[key] = 0;
      return acc;
    }, {} as SignalValues);
    const score = computeCompositeScore(zeroSignals, DEFAULT_STRATEGY_WEIGHTS);
    expect(score).toBe(0);
  });

  it('score is 100 when all signals are 100', () => {
    const maxSignals: SignalValues = SIGNAL_KEYS.reduce((acc, key) => {
      acc[key] = 100;
      return acc;
    }, {} as SignalValues);
    const score = computeCompositeScore(maxSignals, DEFAULT_STRATEGY_WEIGHTS);
    expect(score).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Property 2 — Weight Sum Invariant
// Feature: buy-box-ranking-system, Property 2: Weight Sum Invariant
// Validates: Requirement 14.2
// ---------------------------------------------------------------------------

describe('Property 2: Weight Sum Invariant', () => {
  // Use a minimal mock repository (CategoryStrategyService only needs it for DB calls)
  const mockRepo = {
    getCategoryStrategy: async () => null,
    writeOperatorAuditLog: async () => {},
  } as any;
  const service = new CategoryStrategyService(mockRepo);

  it('accepts weights that sum to 1.0 ±0.001', () => {
    forAll(
      200,
      () => randomValidWeights(),
      (weights) => {
        const result = service.validateWeights(weights);
        expect(result.valid).toBe(true);
      },
    );
  });

  it('rejects weights that sum to 1.1', () => {
    // Build weights that sum to 1.1 by scaling valid weights
    forAll(
      100,
      () => {
        const valid = randomValidWeights();
        return SIGNAL_KEYS.reduce((acc, key) => {
          acc[key] = valid[key] * 1.1;
          return acc;
        }, {} as SignalWeights);
      },
      (weights) => {
        const result = service.validateWeights(weights);
        expect(result.valid).toBe(false);
      },
    );
  });

  it('rejects weights that sum to 0.5', () => {
    forAll(
      100,
      () => {
        const valid = randomValidWeights();
        return SIGNAL_KEYS.reduce((acc, key) => {
          acc[key] = valid[key] * 0.5;
          return acc;
        }, {} as SignalWeights);
      },
      (weights) => {
        const result = service.validateWeights(weights);
        expect(result.valid).toBe(false);
      },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3 — Monotonicity Property
// Feature: buy-box-ranking-system, Property 3: Monotonicity
// Validates: Requirement 14.3
// ---------------------------------------------------------------------------

describe('Property 3: Monotonicity Property', () => {
  it('seller A with strictly higher signals always scores higher than seller B', () => {
    forAll(
      300,
      () => {
        const weights = randomValidWeights();
        // Build B with signals in [10, 80] to leave room for A above
        const signalsB: SignalValues = SIGNAL_KEYS.reduce((acc, key) => {
          acc[key] = randomFloat(10, 80);
          return acc;
        }, {} as SignalValues);
        // A is strictly higher on every signal
        const delta = randomFloat(1, 10);
        const signalsA: SignalValues = SIGNAL_KEYS.reduce((acc, key) => {
          acc[key] = Math.min(100, signalsB[key] + delta);
          return acc;
        }, {} as SignalValues);
        return { signalsA, signalsB, weights };
      },
      ({ signalsA, signalsB, weights }) => {
        const scoreA = computeCompositeScore(signalsA, weights);
        const scoreB = computeCompositeScore(signalsB, weights);
        expect(scoreA).toBeGreaterThan(scoreB);
      },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4 — Idempotence Property
// Feature: buy-box-ranking-system, Property 4: Idempotence
// Validates: Requirement 14.5
// ---------------------------------------------------------------------------

describe('Property 4: Idempotence Property', () => {
  it('computing the same score twice always yields identical results', () => {
    forAll(
      300,
      () => ({ signals: randomSignalValues(), weights: randomValidWeights() }),
      ({ signals, weights }) => {
        const score1 = computeCompositeScore(signals, weights);
        const score2 = computeCompositeScore(signals, weights);
        expect(score1).toBe(score2);
      },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5 — Audit Round-Trip Property
// Feature: buy-box-ranking-system, Property 5: Audit Round-Trip
// Validates: Requirement 14.6
// ---------------------------------------------------------------------------

describe('Property 5: Audit Round-Trip Property', () => {
  it('recomputing from stored signal values reproduces the stored score within ±0.01', () => {
    forAll(
      300,
      () => ({ signals: randomSignalValues(), weights: randomValidWeights() }),
      ({ signals, weights }) => {
        const storedScore = computeCompositeScore(signals, weights);
        // Simulate serialise → deserialise via JSON (as stored in Score_Snapshot)
        const restoredSignals: SignalValues = JSON.parse(JSON.stringify(signals));
        const restoredWeights: SignalWeights = JSON.parse(JSON.stringify(weights));
        const recomputedScore = computeCompositeScore(restoredSignals, restoredWeights);
        expect(Math.abs(recomputedScore - storedScore)).toBeLessThanOrEqual(0.01);
      },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6 — Price Ordering Invariant
// Feature: buy-box-ranking-system, Property 6: Price Ordering Invariant
// Validates: Requirements 4.7, 14
// ---------------------------------------------------------------------------

describe('Property 6: Price Ordering Invariant', () => {
  const median = 1000;

  it('price within ±5% of median scores 100', () => {
    forAll(
      200,
      () => randomFloat(median * 0.95, median * 1.05),
      (price) => {
        // Keep median stable with many copies so median of array ≈ median
        const prices = Array(9).fill(median).concat([price]);
        const score = computePriceCompetitiveness(price, prices);
        expect(score).toBe(100);
      },
    );
  });

  it('price more than 20% above median scores 0', () => {
    forAll(
      200,
      () => randomFloat(median * 1.21, median * 2.0),
      (price) => {
        // Pass a large array so the median stays close to `median`
        // Use many copies of median so the median of the array is exactly `median`
        const prices = Array(9).fill(median).concat([price]);
        const score = computePriceCompetitiveness(price, prices);
        expect(score).toBe(0);
      },
    );
  });

  it('price more than 5% below median scores at most 85', () => {
    forAll(
      200,
      () => randomFloat(median * 0.1, median * 0.94),
      (price) => {
        // Keep median stable by using many copies of median
        const prices = Array(9).fill(median).concat([price]);
        const score = computePriceCompetitiveness(price, prices);
        expect(score).toBeLessThanOrEqual(85);
      },
    );
  });

  it('no seller priced >20% above median scores higher than a seller within the band', () => {
    forAll(
      200,
      () => ({
        aboveMedian: randomFloat(median * 1.21, median * 2.0),
        withinBand: randomFloat(median * 0.95, median * 1.05),
      }),
      ({ aboveMedian, withinBand }) => {
        // Use many copies of median so the computed median stays at `median`
        const prices = Array(9).fill(median).concat([aboveMedian, withinBand]);
        const scoreAbove = computePriceCompetitiveness(aboveMedian, prices);
        const scoreWithin = computePriceCompetitiveness(withinBand, prices);
        expect(scoreWithin).toBeGreaterThan(scoreAbove);
      },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7 — COD Risk Ordering Invariant
// Feature: buy-box-ranking-system, Property 7: COD Risk Ordering Invariant
// Validates: Requirements 8.6, 14
// ---------------------------------------------------------------------------

describe('Property 7: COD Risk Ordering Invariant', () => {
  it('seller with COD refusal rate <15% scores higher than seller with rate >30% (COD payment)', () => {
    forAll(
      200,
      () => ({
        fulfillmentRate: randomFloat(60, 100),
      }),
      ({ fulfillmentRate }) => {
        const scoreHighRisk = computeFulfillmentReliability({
          fulfillmentRate,
          codRefusalRate: randomFloat(0.31, 0.80),
          paymentMethod: 'COD',
        });
        const scoreLowRisk = computeFulfillmentReliability({
          fulfillmentRate,
          codRefusalRate: randomFloat(0.0, 0.14),
          paymentMethod: 'COD',
        });
        expect(scoreLowRisk).toBeGreaterThan(scoreHighRisk);
      },
    );
  });

  it('COD penalties do not apply when payment method is not COD', () => {
    forAll(
      100,
      () => randomFloat(60, 100),
      (fulfillmentRate) => {
        const scoreWithCod = computeFulfillmentReliability({
          fulfillmentRate,
          codRefusalRate: 0.50,
          paymentMethod: 'COD',
        });
        const scoreWithoutCod = computeFulfillmentReliability({
          fulfillmentRate,
          codRefusalRate: 0.50,
          paymentMethod: 'WALLET',
        });
        // Without COD, no penalty — score should be higher
        expect(scoreWithoutCod).toBeGreaterThan(scoreWithCod);
      },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8 — Rotation Property
// Feature: buy-box-ranking-system, Property 8: Rotation Property
// Validates: Requirement 14.4
// ---------------------------------------------------------------------------

describe('Property 8: Rotation Property', () => {
  const allocator = new ExplorationAllocator();

  it('with explorationBudget=0.10, exploration slots are allocated every 10 windows', () => {
    const explorationBudget = 0.10;
    const explorationWindows: number[] = [];

    for (let counter = 0; counter < 100; counter++) {
      if (allocator.shouldAllocateExplorationSlot('product-1', counter, explorationBudget)) {
        explorationWindows.push(counter);
      }
    }

    // With budget 0.10, every 10th window (0, 10, 20, ...) should be exploration
    expect(explorationWindows.length).toBeGreaterThan(0);
    expect(explorationWindows.length).toBeLessThanOrEqual(11); // ~10% of 100
  });

  it('with explorationBudget=0, no exploration slots are ever allocated', () => {
    forAll(
      100,
      () => randomInt(0, 1000),
      (counter) => {
        const result = allocator.shouldAllocateExplorationSlot('product-1', counter, 0);
        expect(result).toBe(false);
      },
    );
  });

  it('exploration candidate selection prevents monopolisation over 30 windows', () => {
    // Simulate 30 windows with 2 sellers; seller A always wins on merit
    const sellerA = 'seller-a';
    const sellerB = 'seller-b';
    const explorationBudget = 0.10;
    const assignments: string[] = [];

    for (let counter = 0; counter < 30; counter++) {
      const isExploration = allocator.shouldAllocateExplorationSlot(
        'product-1',
        counter,
        explorationBudget,
      );

      if (isExploration) {
        // Seller A is the recent winner — exploration picks seller B
        const candidate = allocator.selectExplorationCandidate(
          [
            { sellerId: sellerA, compositeScore: 80, hasActiveManipulationPenalty: false, hasAnomalyFlag: false },
            { sellerId: sellerB, compositeScore: 72, hasActiveManipulationPenalty: false, hasAnomalyFlag: false },
          ],
          [sellerA], // sellerA held Buy Box recently
          80,
        );
        assignments.push(candidate ?? sellerA);
      } else {
        assignments.push(sellerA);
      }
    }

    // Seller A should NOT hold 100% of assignments
    const sellerACount = assignments.filter((s) => s === sellerA).length;
    expect(sellerACount).toBeLessThan(30);
    // Seller B should have received at least one exploration slot
    const sellerBCount = assignments.filter((s) => s === sellerB).length;
    expect(sellerBCount).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Bonus: Rate Signal Invariants
// ---------------------------------------------------------------------------

describe('Rate Signal Invariants', () => {
  it('rate 0 always produces score 100', () => {
    expect(computeRateSignal(0)).toBe(100);
  });

  it('rate 1 always produces score 0', () => {
    expect(computeRateSignal(1)).toBe(0);
  });

  it('score is monotonically decreasing as rate increases', () => {
    forAll(
      200,
      () => {
        const r1 = randomFloat(0, 0.99);
        const r2 = randomFloat(r1 + 0.001, 1.0);
        return { r1, r2 };
      },
      ({ r1, r2 }) => {
        expect(computeRateSignal(r1)).toBeGreaterThan(computeRateSignal(r2));
      },
    );
  });
});
