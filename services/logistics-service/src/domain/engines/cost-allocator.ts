/**
 * CostAllocator
 *
 * Allocates a total delivery cost across seller orders using the
 * weight_proportional algorithm with largest-remainder adjustment.
 *
 * The largest-remainder adjustment ensures:
 *   sum(allocations) === totalCostTzs  (exact integer reconciliation)
 *
 * Properties:
 *   - All allocations are non-negative integers
 *   - sum(allocations) === totalCostTzs exactly
 *   - Single-seller group: 100% allocated to that seller
 *   - Pure function — no I/O, no side effects
 */

export interface AllocationInput {
  sellerOrderId: string;
  weightKg: number;
}

export interface AllocationResult {
  sellerOrderId: string;
  allocatedCostTzs: number; // integer TZS
}

/**
 * Allocate totalCostTzs across sellers proportional to package weight.
 * Uses largest-remainder method to handle rounding precisely.
 */
export function allocateByWeight(
  sellers: AllocationInput[],
  totalCostTzs: number,
): AllocationResult[] {
  if (!sellers || sellers.length === 0) return [];
  if (sellers.length === 1) {
    return [{ sellerOrderId: sellers[0].sellerOrderId, allocatedCostTzs: totalCostTzs }];
  }

  const totalWeight = sellers.reduce((sum, s) => sum + s.weightKg, 0);

  if (totalWeight <= 0) {
    // Equal split when weight data unavailable
    const equalShare = Math.floor(totalCostTzs / sellers.length);
    const remainder = totalCostTzs - equalShare * sellers.length;
    return sellers.map((s, idx) => ({
      sellerOrderId: s.sellerOrderId,
      allocatedCostTzs: equalShare + (idx < remainder ? 1 : 0),
    }));
  }

  // Compute raw (fractional) shares
  const rawShares = sellers.map(s => ({
    sellerOrderId: s.sellerOrderId,
    raw: (totalCostTzs * s.weightKg) / totalWeight,
    floored: 0,
    remainder: 0,
  }));

  // Floor each share
  rawShares.forEach(r => {
    r.floored = Math.floor(r.raw);
    r.remainder = r.raw - r.floored;
  });

  // Distribute leftover TZS to sellers with largest remainders
  const distributed = totalCostTzs - rawShares.reduce((sum, r) => sum + r.floored, 0);
  rawShares
    .sort((a, b) => b.remainder - a.remainder)
    .forEach((r, idx) => {
      r.floored += idx < distributed ? 1 : 0;
    });

  return rawShares.map(r => ({
    sellerOrderId: r.sellerOrderId,
    allocatedCostTzs: r.floored,
  }));
}
