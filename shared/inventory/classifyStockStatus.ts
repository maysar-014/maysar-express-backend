/**
 * Shared Stock Status Classification Utility
 *
 * Single authoritative rule for deriving stock status from quantity data.
 * Used by both the analytics service (CalculateInventoryHealth) and the
 * catalog service (get-product.use-case) to guarantee consistent status
 * labels across all surfaces.
 *
 * Rule (quantity-threshold based):
 *   - effectiveAvailable <= 0              → 'out_of_stock'
 *   - reorderPoint > 0 && available <= rp  → 'low_stock'
 *   - otherwise                            → 'in_stock'
 */

export type StockStatusLabel = 'in_stock' | 'low_stock' | 'out_of_stock';

/**
 * Classify stock status using a consistent quantity-threshold rule.
 *
 * @param effectiveAvailable  quantityAvailable - quantityReserved, clamped ≥ 0.
 *                            Pass Math.max(0, quantityAvailable - quantityReserved).
 * @param reorderPoint        The configured reorder threshold for the variant.
 *                            Pass 0 (or omit) when no threshold is configured.
 * @returns StockStatusLabel  'in_stock' | 'low_stock' | 'out_of_stock'
 */
export function classifyStockStatus(
  effectiveAvailable: number,
  reorderPoint: number = 0
): StockStatusLabel {
  if (effectiveAvailable <= 0) return 'out_of_stock';
  if (reorderPoint > 0 && effectiveAvailable <= reorderPoint) return 'low_stock';
  return 'in_stock';
}
