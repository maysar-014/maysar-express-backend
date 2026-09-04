/**
 * Consistency Validation Policy
 *
 * Detects contradictions in seller-submitted product data before publication.
 * A conflict is "critical" when it would materially mislead a buyer —
 * for example, the product title says "128GB" but an attribute says "256GB".
 *
 * Critical conflicts block publication; non-critical conflicts are surfaced
 * as warnings so sellers can review before listing goes live.
 */

export type ConflictSeverity = 'CRITICAL' | 'WARNING';

export interface DataConflict {
  code: 'DATA_CONFLICT';
  severity: ConflictSeverity;
  field: string;
  valueA: string;
  sourceA: string;
  valueB: string;
  sourceB: string;
  message: string;
}

export interface ConsistencyValidationResult {
  isConsistent: boolean;
  /** true when any CRITICAL conflict is present — blocks publication */
  hasBlockingConflicts: boolean;
  conflicts: DataConflict[];
}

export class ConsistencyValidationPolicy {
  /**
   * Validates that the title, attributes, and category are internally consistent.
   *
   * @param title          - The seller-provided product title.
   * @param attributes     - Key/value map of structured attributes.
   * @param categoryName   - The resolved category name for the listing.
   */
  static validate(
    title: string,
    attributes: Record<string, string>,
    categoryName: string,
  ): ConsistencyValidationResult {
    const conflicts: DataConflict[] = [];

    // ── Rule 1: Numeric values mentioned in the title must match attributes ──
    conflicts.push(...this.detectTitleAttributeConflicts(title, attributes));

    // ── Rule 2: Category-incompatible attributes (e.g. engine type on a laptop) ──
    conflicts.push(...this.detectCategoryAttributeConflicts(categoryName, attributes));

    const hasBlockingConflicts = conflicts.some(c => c.severity === 'CRITICAL');

    return {
      isConsistent: conflicts.length === 0,
      hasBlockingConflicts,
      conflicts,
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Detects cases where a numeric quantity appearing in the title (e.g. "128GB",
   * "5000mAh") contradicts a matching attribute value.
   */
  private static detectTitleAttributeConflicts(
    title: string,
    attributes: Record<string, string>,
  ): DataConflict[] {
    const conflicts: DataConflict[] = [];

    // Patterns we look for in the title: a number immediately followed by a unit.
    // Storage and RAM use different GB patterns — they must not be mixed to avoid
    // false positives when the title contains e.g. "8GB RAM 256GB storage".
    const titlePatterns: Array<{
      regex: RegExp;
      attributeKeys: string[];
      unit: string;
    }> = [
      // RAM-specific: look for GB immediately preceded by or followed by RAM/memory context
      { regex: /(\d+)\s*gb\s*ram\b/i, attributeKeys: ['ram'], unit: 'GB' },
      // Storage-specific: GB that is NOT immediately followed by "ram"
      { regex: /(\d+)\s*gb(?!\s*ram)\b/i, attributeKeys: ['storage', 'internal_memory', 'rom'], unit: 'GB' },
      { regex: /(\d+)\s*tb/i, attributeKeys: ['storage', 'internal_memory', 'rom'], unit: 'TB' },
      { regex: /(\d+)\s*mb/i, attributeKeys: ['storage', 'ram', 'memory'], unit: 'MB' },
      { regex: /(\d+)\s*mah/i, attributeKeys: ['battery', 'battery_capacity'], unit: 'mAh' },
      { regex: /(\d+(?:\.\d+)?)\s*l\b/i, attributeKeys: ['volume', 'capacity'], unit: 'L' },
      { regex: /(\d+(?:\.\d+)?)\s*ml\b/i, attributeKeys: ['volume', 'capacity'], unit: 'ml' },
      { regex: /(\d+(?:\.\d+)?)\s*kg\b/i, attributeKeys: ['weight', 'net_weight'], unit: 'kg' },
      { regex: /(\d+(?:\.\d+)?)\s*g\b(?!b)/i, attributeKeys: ['weight', 'net_weight'], unit: 'g' },
    ];

    for (const { regex, attributeKeys, unit } of titlePatterns) {
      const titleMatch = title.match(regex);
      if (!titleMatch) continue;

      const titleValue = titleMatch[1];

      // Only check the first attribute key that actually has a value.
      // Checking all keys causes false positives — e.g. a title saying "256GB"
      // (storage) must not be compared against a RAM attribute that also uses GB.
      const attrKey = attributeKeys.find(k => attributes[k]);
      if (!attrKey) continue;

      const attrValue = attributes[attrKey];
      const attrMatch = attrValue.match(/(\d+(?:\.\d+)?)/);
      if (!attrMatch) continue;

      if (titleValue !== attrMatch[1]) {
        conflicts.push({
          code: 'DATA_CONFLICT',
          severity: 'CRITICAL',
          field: attrKey,
          valueA: `${titleValue}${unit}`,
          sourceA: 'title',
          valueB: attrValue,
          sourceB: `attribute:${attrKey}`,
          message: `Title states "${titleValue}${unit}" but attribute "${attrKey}" says "${attrValue}". Resolve before publishing.`,
        });
      }
    }

    return conflicts;
  }

  /**
   * Detects attributes that are semantically incompatible with the assigned category.
   * Only raises conflicts for attribute keys that are definitively wrong for that
   * category family — this is intentionally conservative to avoid false positives.
   */
  private static detectCategoryAttributeConflicts(
    categoryName: string,
    attributes: Record<string, string>,
  ): DataConflict[] {
    const conflicts: DataConflict[] = [];
    const cat = categoryName.toLowerCase();

    // Non-motor categories should not have engine-type attributes
    const isElectronicsOrFood =
      /phone|laptop|tablet|computer|electronics|food|grocery|beverage|clothing|fashion/.test(cat);

    if (isElectronicsOrFood) {
      const engineKeys = ['engine_type', 'engine_cc', 'fuel_type', 'transmission'];
      for (const key of engineKeys) {
        if (attributes[key]) {
          conflicts.push({
            code: 'DATA_CONFLICT',
            severity: 'CRITICAL',
            field: key,
            valueA: categoryName,
            sourceA: 'category',
            valueB: attributes[key],
            sourceB: `attribute:${key}`,
            message: `Attribute "${key}" is not applicable to category "${categoryName}". Remove or recategorise.`,
          });
        }
      }
    }

    // Food/grocery products should not have electrical attributes
    const isFoodCategory = /food|grocery|beverage|produce|dairy/.test(cat);
    if (isFoodCategory) {
      const electricalKeys = ['voltage', 'wattage', 'amperage', 'frequency_hz'];
      for (const key of electricalKeys) {
        if (attributes[key]) {
          conflicts.push({
            code: 'DATA_CONFLICT',
            severity: 'WARNING',
            field: key,
            valueA: categoryName,
            sourceA: 'category',
            valueB: attributes[key],
            sourceB: `attribute:${key}`,
            message: `Electrical attribute "${key}" is unexpected for food/grocery category "${categoryName}". Please verify.`,
          });
        }
      }
    }

    return conflicts;
  }
}
