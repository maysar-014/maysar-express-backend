/**
 * Pricing Pipeline Benchmark
 *
 * Measures the end-to-end cost of a single DeliveryPricingEngine.compute() call
 * in absolute terms. The engine is a pure, synchronous function, so this
 * benchmark isolates CPU cost only (no I/O, no async, no network).
 *
 * Spec reference (delivery-pricing-engine task 21):
 *   Run engine.compute() 1000 times and assert average < 10ms per call.
 *   Log p50 and p99.
 *
 * The repo's unit-test harness is jest (see root jest.config.js), so this file
 * is a plain benchmark runner; the assertion wrapper lives in
 * pricing-pipeline.benchmark.test.ts.
 */

import { performance } from 'perf_hooks';
import { DeliveryPricingEngine, PricingInput } from '../../domain/engines/delivery-pricing.engine';
import { PricingConfig, PricingConfigData } from '../../domain/value-objects/pricing-config.value-object';

export interface BenchmarkPercentiles {
  p50Ms: number;
  p99Ms: number;
}

export interface BenchmarkSummary {
  iterations: number;
  averageMs: number;
  percentiles: BenchmarkPercentiles;
  /** True when averageMs < 10ms (the spec assertion). */
  passes: boolean;
  /** Deterministic output captured to prove the engine ran correctly. */
  sampledDeliveryFee: number;
}

/** A minimal, valid v2 config with calibrated Dar es Salaam local-urban bands. */
function makeBenchmarkConfig(): PricingConfig {
  const data: PricingConfigData = {
    version: 2,
    platformMarginPct: 0.20,
    floorPriceTzs: 1500,
    ceilingPriceTzs: 50000,
    roundingIncrementTzs: 50,
    codPolicy: {
      fixedChargeTzs: 500,
      valueSurchargeRate: 0.005,
      valueSurchargeThresholdTzs: 100000,
    },
    localUrban: {
      distanceBands: [
        { maxDistanceKm: 3, fulfillmentCostTzs: 1800 },
        { maxDistanceKm: 7, fulfillmentCostTzs: 2500 },
        { maxDistanceKm: 12, fulfillmentCostTzs: 3200 },
        { maxDistanceKm: 20, fulfillmentCostTzs: 4000 },
      ],
      weightBands: [
        { maxWeightKg: 1, additionalCostTzs: 0 },
        { maxWeightKg: 5, additionalCostTzs: 500 },
        { maxWeightKg: 10, additionalCostTzs: 1200 },
        { maxWeightKg: 20, additionalCostTzs: 2500 },
        { maxWeightKg: 9999, additionalCostTzs: 5000 },
      ],
      operationalSurcharge: {
        peakHourSurchargeAmount: 300,
        peakHours: [
          { startHour: 7, endHour: 9 },
          { startHour: 17, endHour: 20 },
        ],
      },
    },
    metropolitan: {
      distanceBands: [
        { maxDistanceKm: 35, fulfillmentCostTzs: 5000 },
        { maxDistanceKm: 50, fulfillmentCostTzs: 6500 },
        { maxDistanceKm: 80, fulfillmentCostTzs: 8500 },
      ],
      weightBands: [
        { maxWeightKg: 1, additionalCostTzs: 0 },
        { maxWeightKg: 5, additionalCostTzs: 800 },
        { maxWeightKg: 10, additionalCostTzs: 1800 },
        { maxWeightKg: 20, additionalCostTzs: 3500 },
        { maxWeightKg: 9999, additionalCostTzs: 7000 },
      ],
      operationalSurcharge: { peakHourSurchargeAmount: 0, peakHours: [] },
    },
    intercityCorridors: [],
    intercityFallback: null,
    remoteUnavailable: true,
    quoteValiditySeconds: 900,
    routingCacheTtlMs: 300000,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };
  return PricingConfig.fromPersisted(data);
}

function percentile(sortedMs: number[], percentile: number): number {
  if (sortedMs.length === 0) return 0;
  const index = Math.min(sortedMs.length - 1, Math.ceil((percentile / 100) * sortedMs.length) - 1);
  return sortedMs[Math.max(0, index)];
}

/**
 * Runs engine.compute() `iterations` times and returns timing statistics.
 * Deterministic input: Kariakoo-style local-urban delivery (8 km, 0.5 kg, non-COD).
 */
export function runPricingPipelineBenchmark(
  iterations = 1000,
  engine: DeliveryPricingEngine = new DeliveryPricingEngine(),
  config: PricingConfig = makeBenchmarkConfig(),
): BenchmarkSummary {
  const input: PricingInput = {
    distanceKm: 8,
    durationMinutes: 25,
    packageWeightKg: 0.5,
    deliveryZone: 'same_district',
    isCoD: false,
    isOperationalPeakHour: false,
    courierCompensationEstimate: 0,
    routeSource: 'fallback',
  };

  // Warm-up: let the JIT settle before measuring.
  for (let i = 0; i < 50; i++) {
    engine.compute(input, config);
  }

  const durationsMs: number[] = new Array(iterations);
  let sampledDeliveryFee = 0;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    const result = engine.compute(input, config);
    const elapsed = performance.now() - start;
    durationsMs[i] = elapsed;
    if (i === iterations - 1 && 'deliveryFee' in result) {
      sampledDeliveryFee = (result as { deliveryFee: number }).deliveryFee;
    }
  }

  const sortedMs = [...durationsMs].sort((a, b) => a - b);
  const totalMs = durationsMs.reduce((sum, ms) => sum + ms, 0);
  const averageMs = totalMs / iterations;

  return {
    iterations,
    averageMs,
    percentiles: {
      p50Ms: percentile(sortedMs, 50),
      p99Ms: percentile(sortedMs, 99),
    },
    passes: averageMs < 10,
    sampledDeliveryFee,
  };
}