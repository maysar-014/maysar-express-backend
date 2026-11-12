// @ts-nocheck
/**
 * Phase 2 — Discrete Configuration Tests
 *
 * Covers ENH-013 (Sparse Combination Enforcement) and
 * ENH-017 (Variant Identity / SKU Immutability).
 *
 * Feature: phase-2-discrete-configuration
 */

import { SparseCombinationPublicationGuard } from '../sparse-combination-publication.guard';
import { VariantIdentityPolicy } from '../variant-identity.policy';
import { ConfigurationDefinitionData } from '../../entities/configuration-definition.entity';

// ── Helpers ──────────────────────────────────────────────────────────────────

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

function makeDefinition(
  status: 'draft' | 'active' | 'archived',
  activeCombinations: number,
  inactiveCombinations: number = 0,
): ConfigurationDefinitionData {
  const combinations = [
    ...Array.from({ length: activeCombinations }, (_, i) => ({
      id: `combo-a-${i}-${randomSuffix()}`,
      configurationDefinitionId: 'cfg-def-1',
      optionSelections: { [`dim-${i}`]: [`opt-${i}`] },
      fingerprint: `fp-active-${i}`,
      active: true,
    })),
    ...Array.from({ length: inactiveCombinations }, (_, i) => ({
      id: `combo-i-${i}-${randomSuffix()}`,
      configurationDefinitionId: 'cfg-def-1',
      optionSelections: { [`dim-${i}`]: [`opt-inactive-${i}`] },
      fingerprint: `fp-inactive-${i}`,
      active: false,
    })),
  ];

  return {
    id: 'cfg-def-1',
    productId: 'prod-1',
    version: 1,
    status,
    dimensions: [],
    options: [],
    dependencies: [],
    constraints: [],
    combinations,
    predecessorVersionId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ── ENH-013: SparseCombinationPublicationGuard ────────────────────────────────

describe('ENH-013: SparseCombinationPublicationGuard', () => {
  describe('Simple products (no ConfigurationDefinition)', () => {
    it('should allow publication for simple products without a configuration definition', () => {
      const result = SparseCombinationPublicationGuard.evaluate(null);
      expect(result.allowed).toBe(true);
      expect(result.activeCombinations).toBe(0);
    });

    it('canPublish should return true for null definition', () => {
      expect(SparseCombinationPublicationGuard.canPublish(null)).toBe(true);
    });
  });

  describe('Products with ConfigurationDefinition', () => {
    it('should block publication when definition is in draft status', () => {
      const definition = makeDefinition('draft', 3);
      const result = SparseCombinationPublicationGuard.evaluate(definition);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('draft');
      expect(result.activeCombinations).toBe(0);
    });

    it('should block publication when definition is archived', () => {
      const definition = makeDefinition('archived', 2);
      const result = SparseCombinationPublicationGuard.evaluate(definition);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('archived');
    });

    it('should block publication when active definition has zero active combinations', () => {
      const definition = makeDefinition('active', 0);
      const result = SparseCombinationPublicationGuard.evaluate(definition);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('no active combinations');
      expect(result.activeCombinations).toBe(0);
    });

    it('should block publication when active definition has only inactive combinations', () => {
      const definition = makeDefinition('active', 0, 3);
      const result = SparseCombinationPublicationGuard.evaluate(definition);
      expect(result.allowed).toBe(false);
      expect(result.activeCombinations).toBe(0);
    });

    it('should allow publication when active definition has at least one active combination', () => {
      const definition = makeDefinition('active', 1);
      const result = SparseCombinationPublicationGuard.evaluate(definition);
      expect(result.allowed).toBe(true);
      expect(result.activeCombinations).toBe(1);
    });

    it('should allow publication when active definition has multiple active combinations', () => {
      const definition = makeDefinition('active', 5, 2);
      const result = SparseCombinationPublicationGuard.evaluate(definition);
      expect(result.allowed).toBe(true);
      expect(result.activeCombinations).toBe(5);
    });

    it('getActiveCombinations should return only active combinations', () => {
      const definition = makeDefinition('active', 3, 2);
      const active = SparseCombinationPublicationGuard.getActiveCombinations(definition);
      expect(active).toHaveLength(3);
      expect(active.every(c => c.active)).toBe(true);
    });

    it('canPublish shorthand should match evaluate().allowed', () => {
      const active = makeDefinition('active', 2);
      const draft = makeDefinition('draft', 2);
      const empty = makeDefinition('active', 0);

      expect(SparseCombinationPublicationGuard.canPublish(active)).toBe(true);
      expect(SparseCombinationPublicationGuard.canPublish(draft)).toBe(false);
      expect(SparseCombinationPublicationGuard.canPublish(empty)).toBe(false);
    });
  });
});

// ── ENH-017: VariantIdentityPolicy ───────────────────────────────────────────

describe('ENH-017: VariantIdentityPolicy', () => {
  describe('validateUpdate', () => {
    it('should pass with no warnings when SKU is unchanged', () => {
      const result = VariantIdentityPolicy.validateUpdate({
        variantId: 'var-1',
        currentSku: 'SKU-ABC',
        submittedSku: 'SKU-ABC',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should produce a warning when SKU changes (allowed but advisory)', () => {
      const result = VariantIdentityPolicy.validateUpdate({
        variantId: 'var-1',
        currentSku: 'SKU-OLD',
        submittedSku: 'SKU-NEW',
      });
      expect(result.valid).toBe(true); // SKU change is allowed but warned
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('SKU change detected');
    });

    it('should pass cleanly when no SKU is provided in the update', () => {
      const result = VariantIdentityPolicy.validateUpdate({
        variantId: 'var-1',
        // No SKU fields submitted
      });
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should not warn when only submittedSku is provided but currentSku is absent', () => {
      const result = VariantIdentityPolicy.validateUpdate({
        variantId: 'var-1',
        submittedSku: 'SKU-NEW',
        // currentSku absent — can't determine if it changed
      });
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('isPriceOnlyChange', () => {
    it('should return true for price-only updates', () => {
      expect(VariantIdentityPolicy.isPriceOnlyChange({ price: 1000 })).toBe(true);
      expect(VariantIdentityPolicy.isPriceOnlyChange({ price: 1000, currency: 'TZS' })).toBe(true);
      expect(VariantIdentityPolicy.isPriceOnlyChange({ compareAtPrice: 2000, costPrice: 800 })).toBe(true);
    });

    it('should return false when non-price fields are included', () => {
      expect(VariantIdentityPolicy.isPriceOnlyChange({ price: 1000, name: 'New Name' })).toBe(false);
      expect(VariantIdentityPolicy.isPriceOnlyChange({ sku: 'NEW-SKU' })).toBe(false);
      expect(VariantIdentityPolicy.isPriceOnlyChange({})).toBe(true); // empty update is trivially price-only
    });
  });

  describe('priceChangeMustNotCreateVariant', () => {
    it('should return true when variant count stays the same', () => {
      expect(VariantIdentityPolicy.priceChangeMustNotCreateVariant(3, 3)).toBe(true);
    });

    it('should return true when variant count decreases', () => {
      expect(VariantIdentityPolicy.priceChangeMustNotCreateVariant(3, 2)).toBe(true);
    });

    it('should return false when variant count increases (forbidden)', () => {
      expect(VariantIdentityPolicy.priceChangeMustNotCreateVariant(2, 3)).toBe(false);
    });
  });
});
