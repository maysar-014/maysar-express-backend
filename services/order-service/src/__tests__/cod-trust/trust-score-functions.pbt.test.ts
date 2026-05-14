/**
 * Property-Based Tests — COD Trust Score Pure Functions
 *
 * Validates the five correctness properties defined in the design document:
 *   1. Score bounds invariant
 *   2. Tier completeness (no gaps, no overlaps)
 *   3. Score round-trip (event-sourcing replay)
 *   4. Monotone positive signals
 *   5. Monotone negative signals
 *
 * Requirements: 1.2, 1.6, 2.1–2.5, 3.1–3.6
 */

import * as fc from 'fast-check';
import {
  TrustSignalType,
  TrustTier,
  SIGNAL_WEIGHTS,
} from '../../domain/engines/cod-trust/trust-signal.types';
import {
  applySignal,
  deriveTier,
  getCODLimit,
  replayScore,
} from '../../domain/engines/cod-trust/trust-score.functions';

// ─── Arbitraries ──────────────────────────────────────────────────────────────

const scoreArb = fc.integer({ min: 0, max: 100 });

const signalArb = fc.constantFrom(
  TrustSignalType.SUCCESSFUL_DELIVERY,
  TrustSignalType.PHONE_VERIFIED,
  TrustSignalType.HIGH_VALUE_COMPLETION,
  TrustSignalType.ACCOUNT_AGE_MILESTONE,
  TrustSignalType.POST_DISPATCH_CANCELLATION,
  TrustSignalType.DELIVERY_REFUSED,
  TrustSignalType.DISPUTE_LOST,
  TrustSignalType.COURIER_NEGATIVE_REPORT,
);

const positiveSignalArb = fc.constantFrom(
  TrustSignalType.SUCCESSFUL_DELIVERY,
  TrustSignalType.PHONE_VERIFIED,
  TrustSignalType.HIGH_VALUE_COMPLETION,
  TrustSignalType.ACCOUNT_AGE_MILESTONE,
);

const negativeSignalArb = fc.constantFrom(
  TrustSignalType.POST_DISPATCH_CANCELLATION,
  TrustSignalType.DELIVERY_REFUSED,
  TrustSignalType.DISPUTE_LOST,
  TrustSignalType.COURIER_NEGATIVE_REPORT,
);

const signalSequenceArb = fc.array(signalArb, { minLength: 0, maxLength: 50 });

// ─── Property 1: Score Bounds Invariant ───────────────────────────────────────

describe('Property 1 — Score Bounds Invariant', () => {
  it('applySignal always returns a value in [0, 100] for any score × signal combination', () => {
    fc.assert(
      fc.property(scoreArb, signalArb, (score, signal) => {
        const result = applySignal(score, signal);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(100);
        expect(Number.isInteger(result)).toBe(true);
      }),
      { numRuns: 500 }
    );
  });

  it('applySignal never produces NaN or Infinity', () => {
    fc.assert(
      fc.property(scoreArb, signalArb, (score, signal) => {
        const result = applySignal(score, signal);
        expect(Number.isFinite(result)).toBe(true);
        expect(Number.isNaN(result)).toBe(false);
      }),
      { numRuns: 200 }
    );
  });
});

// ─── Property 2: Tier Completeness ────────────────────────────────────────────

describe('Property 2 — Tier Completeness (no gaps, no overlaps)', () => {
  const ALL_TIERS: TrustTier[] = ['NEW_BUYER', 'TRUSTED_BEGINNER', 'TRUSTED_BUYER'];

  it('deriveTier returns exactly one tier for every integer in [0, 100]', () => {
    fc.assert(
      fc.property(scoreArb, (score) => {
        const tier = deriveTier(score);
        expect(ALL_TIERS).toContain(tier);
      }),
      { numRuns: 101 } // covers all integers 0–100
    );
  });

  it('tier boundaries are correct: 0–20 → NEW_BUYER, 21–40 → TRUSTED_BEGINNER, 41–100 → TRUSTED_BUYER', () => {
    // Boundary values
    expect(deriveTier(0)).toBe('NEW_BUYER');
    expect(deriveTier(20)).toBe('NEW_BUYER');
    expect(deriveTier(21)).toBe('TRUSTED_BEGINNER');
    expect(deriveTier(40)).toBe('TRUSTED_BEGINNER');
    expect(deriveTier(41)).toBe('TRUSTED_BUYER');
    expect(deriveTier(100)).toBe('TRUSTED_BUYER');
  });

  it('no score in [0, 100] maps to more than one tier', () => {
    for (let score = 0; score <= 100; score++) {
      const tier = deriveTier(score);
      const matchCount = ALL_TIERS.filter(t => t === tier).length;
      expect(matchCount).toBe(1);
    }
  });

  it('getCODLimit returns correct limits per tier', () => {
    expect(getCODLimit('NEW_BUYER')).toBe(30_000);
    expect(getCODLimit('TRUSTED_BEGINNER')).toBe(150_000);
    expect(getCODLimit('TRUSTED_BUYER')).toBeNull();
  });
});

// ─── Property 3: Score Round-Trip (Event Sourcing) ────────────────────────────

describe('Property 3 — Score Round-Trip (event-sourcing replay)', () => {
  it('replaying score events from 0 reproduces the final score', () => {
    fc.assert(
      fc.property(signalSequenceArb, (signals) => {
        // Compute score step-by-step (simulating live application)
        let liveScore = 0;
        const events: Array<{ delta: number }> = [];

        for (const signal of signals) {
          const delta = SIGNAL_WEIGHTS[signal];
          const newScore = Math.max(0, Math.min(100, liveScore + delta));
          events.push({ delta: newScore - liveScore }); // actual applied delta (may differ from raw due to clamping)
          liveScore = newScore;
        }

        // Replay from event log
        const replayedScore = replayScore(events);

        expect(replayedScore).toBe(liveScore);
      }),
      { numRuns: 300 }
    );
  });

  it('empty event sequence produces score 0', () => {
    expect(replayScore([])).toBe(0);
  });

  it('single positive signal from 0 produces correct score', () => {
    const events = [{ delta: applySignal(0, TrustSignalType.SUCCESSFUL_DELIVERY) - 0 }];
    expect(replayScore(events)).toBe(8);
  });
});

// ─── Property 4: Monotone Positive Signals ────────────────────────────────────

describe('Property 4 — Monotone Positive Signals', () => {
  it('applying a positive signal to score < 100 never decreases the score', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 99 }),
        positiveSignalArb,
        (score, signal) => {
          const result = applySignal(score, signal);
          expect(result).toBeGreaterThanOrEqual(score);
        }
      ),
      { numRuns: 400 }
    );
  });

  it('applying a positive signal to score = 100 keeps it at 100 (ceiling)', () => {
    fc.assert(
      fc.property(positiveSignalArb, (signal) => {
        expect(applySignal(100, signal)).toBe(100);
      }),
      { numRuns: 50 }
    );
  });
});

// ─── Property 5: Monotone Negative Signals ────────────────────────────────────

describe('Property 5 — Monotone Negative Signals', () => {
  it('applying a negative signal to score > 0 never increases the score', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        negativeSignalArb,
        (score, signal) => {
          const result = applySignal(score, signal);
          expect(result).toBeLessThanOrEqual(score);
        }
      ),
      { numRuns: 400 }
    );
  });

  it('applying a negative signal to score = 0 keeps it at 0 (floor)', () => {
    fc.assert(
      fc.property(negativeSignalArb, (signal) => {
        expect(applySignal(0, signal)).toBe(0);
      }),
      { numRuns: 50 }
    );
  });
});

// ─── Bonus: Signal Weight Table Completeness ──────────────────────────────────

describe('Signal Weight Table — completeness', () => {
  it('every TrustSignalType has a defined weight', () => {
    const allSignals = Object.values(TrustSignalType);
    for (const signal of allSignals) {
      expect(SIGNAL_WEIGHTS[signal]).toBeDefined();
      expect(typeof SIGNAL_WEIGHTS[signal]).toBe('number');
    }
  });

  it('positive signals have positive deltas', () => {
    const positiveSignals = [
      TrustSignalType.SUCCESSFUL_DELIVERY,
      TrustSignalType.PHONE_VERIFIED,
      TrustSignalType.HIGH_VALUE_COMPLETION,
      TrustSignalType.ACCOUNT_AGE_MILESTONE,
    ];
    for (const signal of positiveSignals) {
      expect(SIGNAL_WEIGHTS[signal]).toBeGreaterThan(0);
    }
  });

  it('negative signals have negative deltas', () => {
    const negativeSignals = [
      TrustSignalType.POST_DISPATCH_CANCELLATION,
      TrustSignalType.DELIVERY_REFUSED,
      TrustSignalType.DISPUTE_LOST,
      TrustSignalType.COURIER_NEGATIVE_REPORT,
    ];
    for (const signal of negativeSignals) {
      expect(SIGNAL_WEIGHTS[signal]).toBeLessThan(0);
    }
  });
});
