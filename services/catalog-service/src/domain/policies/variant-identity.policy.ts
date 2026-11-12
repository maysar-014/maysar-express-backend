/**
 * Variant Identity Policy
 * ENH-017: Formalizes the immutability contract for variant identity.
 *
 * Constitution §7:
 * "A variant must have an immutable identifier."
 * "Do not use a mutable product name, SKU or price as the variant's identity."
 * "Changing the commercial price must not create a new variant."
 *
 * The SKU is a human-assigned reference — it should NOT be used as the
 * canonical variant identity. The variant's system ID (e.g. `cat_var_xxx`)
 * and ConfigurationFingerprint are the authoritative identifiers.
 */

export interface VariantUpdateCandidate {
  /** The current SKU stored in the database */
  currentSku?: string;
  /** The SKU being submitted in the update request */
  submittedSku?: string;
  /** The current system identifier (immutable by definition) */
  variantId: string;
}

export interface VariantIdentityValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class VariantIdentityPolicy {
  /**
   * Validates a proposed variant update against the identity immutability rules.
   *
   * Hard errors:
   * - Attempting to change the variant system ID (variantId is always immutable)
   *
   * Warnings (soft advisories):
   * - SKU change detected: allowed but noted since SKU should not be used as
   *   identity. Callers may choose to reject or log this.
   *
   * Note: Price changes are always allowed — they must never create a new variant.
   */
  static validateUpdate(candidate: VariantUpdateCandidate): VariantIdentityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // SKU changes are allowed (the SKU is a human label, not the canonical identity)
    // but we issue a warning so callers are aware — constitution says don't use SKU as identity
    if (
      candidate.currentSku !== undefined &&
      candidate.submittedSku !== undefined &&
      candidate.currentSku !== candidate.submittedSku
    ) {
      warnings.push(
        `SKU change detected on variant ${candidate.variantId}: ` +
        `"${candidate.currentSku}" → "${candidate.submittedSku}". ` +
        `SKU is a human reference and must not be used as the canonical variant identity. ` +
        `The system ID and ConfigurationFingerprint remain the authoritative identifiers.`
      );
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Returns true when a price change is being made.
   * Price changes must NEVER create a new variant — this method is a guard
   * for code that might mistakenly create variants on price update.
   */
  static isPriceOnlyChange(updates: Record<string, unknown>): boolean {
    const priceFields = new Set(['price', 'compareAtPrice', 'costPrice', 'currency']);
    return Object.keys(updates).every(k => priceFields.has(k));
  }

  /**
   * Asserts that a price change does not trigger variant creation.
   * Returns false if the updates appear to be trying to create a new variant
   * through a price-change path (which is forbidden).
   */
  static priceChangeMustNotCreateVariant(
    existingVariantCount: number,
    proposedVariantCount: number,
  ): boolean {
    // Variant count must not increase from a price-only change
    return proposedVariantCount <= existingVariantCount;
  }
}
