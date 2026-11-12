// @ts-nocheck
/**
 * ConfigurationDefinition — Serialization Round-Trip Tests
 *
 * Verifies that toJSON/fromJSON preserves all entity state, and that
 * the pure functions exported for PBT work correctly.
 *
 * Feature: configuration-definition-foundation
 */

import {
  ConfigurationDefinition,
  ConfigurationDefinitionData,
  configurationDefinitionsEqual,
  serializeConfigurationDefinition,
  deserializeConfigurationDefinition,
  validateCombination,
} from '../configuration-definition.entity';
import { ConfigurationDimension } from '../../value-objects/configuration-dimension.value-object';
import { ConfigurationOption } from '../../value-objects/configuration-option.value-object';
import { ConfigurationFingerprintAlgorithm } from '../../algorithms/configuration-fingerprint.algorithm';

// ── Helpers ──────────────────────────────────────────────────────────────────

function forAll<T>(
  count: number,
  generator: () => T,
  property: (value: T) => void
): void {
  for (let i = 0; i < count; i++) {
    property(generator());
  }
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 10);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Build a minimal but valid ConfigurationDefinition in draft status
 * with one dimension, two options, and one combination.
 */
function buildMinimalDefinition(): ConfigurationDefinition {
  const defId = `cfg-def-${randomSuffix()}`;
  const productId = `prod-${randomSuffix()}`;
  const def = ConfigurationDefinition.create(productId);

  const dimId = `dim-${randomSuffix()}`;
  const dim = new ConfigurationDimension(
    dimId,
    (def as any).id || defId,
    `Colour-${randomSuffix()}`,
    'selectable',
    'single',
    1,
    1,
    true,
    0
  );
  def.addDimension(dim);

  const opt1Id = `opt-${randomSuffix()}`;
  const opt2Id = `opt-${randomSuffix()}`;
  const opt1 = new ConfigurationOption(opt1Id, dimId, 'Black', undefined, 0);
  const opt2 = new ConfigurationOption(opt2Id, dimId, 'Blue', undefined, 1);
  def.addOption(opt1);
  def.addOption(opt2);

  // Add one combination
  def.addCombination({
    id: `combo-${randomSuffix()}`,
    configurationDefinitionId: (def as any).id,
    optionSelections: { [dimId]: [opt1Id] },
    fingerprint: '',   // will be overwritten inside addCombination
    active: true,
  });

  return def;
}

/**
 * Build a ConfigurationDefinition with random number of dimensions/options.
 */
function buildRandomDefinition(): ConfigurationDefinition {
  const def = ConfigurationDefinition.create(`prod-${randomSuffix()}`);
  const numDims = randomInt(1, 3);
  const dimIds: string[] = [];
  const optIdsByDim: Record<string, string[]> = {};

  for (let d = 0; d < numDims; d++) {
    const dimId = `dim-${randomSuffix()}`;
    dimIds.push(dimId);
    const dim = new ConfigurationDimension(
      dimId,
      (def as any).id,
      `Dimension-${d}-${randomSuffix()}`,
      'selectable',
      'single',
      1,
      1,
      true,
      d
    );
    def.addDimension(dim);

    const numOpts = randomInt(2, 4);
    optIdsByDim[dimId] = [];
    for (let o = 0; o < numOpts; o++) {
      const optId = `opt-${randomSuffix()}`;
      optIdsByDim[dimId].push(optId);
      const opt = new ConfigurationOption(optId, dimId, `opt-${o}-${randomSuffix()}`, undefined, o);
      def.addOption(opt);
    }
  }

  // Add one combination using first option from each dimension
  const onePerDim: Record<string, string[]> = {};
  for (const [dimId, optIds] of Object.entries(optIdsByDim)) {
    onePerDim[dimId] = [optIds[0]];
  }
  def.addCombination({
    id: `combo-${randomSuffix()}`,
    configurationDefinitionId: (def as any).id,
    optionSelections: onePerDim,
    fingerprint: '',
    active: true,
  });

  return def;
}

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('ConfigurationDefinition Serialization', () => {

  // Task 2.7 — Round-trip: toJSON → fromJSON
  describe('toJSON / fromJSON round-trip (Req 16.1)', () => {
    it('should produce equivalent data after toJSON → fromJSON', () => {
      const def = buildMinimalDefinition();
      const json = def.toJSON();
      const restored = ConfigurationDefinition.fromJSON(json);
      const restoredJson = restored.toJSON();

      expect(restoredJson.id).toBe(json.id);
      expect(restoredJson.productId).toBe(json.productId);
      expect(restoredJson.version).toBe(json.version);
      expect(restoredJson.status).toBe(json.status);
      expect(restoredJson.dimensions).toEqual(json.dimensions);
      expect(restoredJson.options).toEqual(json.options);
      expect(restoredJson.dependencies).toEqual(json.dependencies);
      expect(restoredJson.constraints).toEqual(json.constraints);
      expect(restoredJson.combinations.length).toBe(json.combinations.length);
      expect(restoredJson.predecessorVersionId).toBe(json.predecessorVersionId);
    });

    it('should preserve combination fingerprints through serialization', () => {
      const def = buildMinimalDefinition();
      const json = def.toJSON();
      expect(json.combinations.length).toBeGreaterThan(0);
      expect(json.combinations[0].fingerprint).toMatch(/^[a-f0-9]{64}$/);

      const restored = ConfigurationDefinition.fromJSON(json);
      expect(restored.getCombinations()[0].fingerprint).toBe(json.combinations[0].fingerprint);
    });
  });

  // Task 2.8 — Round-trip: combination option selections
  describe('combination option selections JSON round-trip (Req 16.2)', () => {
    it('should preserve optionSelections through JSON serialization', () => {
      const def = buildMinimalDefinition();
      const json = def.toJSON();
      const combo = json.combinations[0];

      // Serialize just the optionSelections
      const serialized = JSON.stringify(combo.optionSelections);
      const deserialized = JSON.parse(serialized);

      expect(deserialized).toEqual(combo.optionSelections);
    });

    it('should be able to reconstruct valid combinations from JSON', () => {
      const def = buildMinimalDefinition();
      const json = def.toJSON();
      const restored = ConfigurationDefinition.fromJSON(json);

      expect(restored.getCombinations()).toHaveLength(json.combinations.length);
      for (let i = 0; i < json.combinations.length; i++) {
        expect(restored.getCombinations()[i].optionSelections).toEqual(
          json.combinations[i].optionSelections
        );
      }
    });
  });

  // Task 2.9 — Property: round-trip consistency across arbitrary definitions
  describe('Property 3: Round-Trip Consistency (Req 16.3)', () => {
    it('should satisfy configurationDefinitionsEqual(serialize→deserialize, original) for arbitrary definitions', () => {
      forAll(
        100,
        buildRandomDefinition,
        (def) => {
          const original = def.toJSON();
          const json = serializeConfigurationDefinition(original);
          const restored = deserializeConfigurationDefinition(json);

          expect(configurationDefinitionsEqual(original, restored)).toBe(true);
        }
      );
    });
  });

  // validateCombination pure function
  describe('validateCombination pure function', () => {
    it('should return matches=true for a combination that was added to the definition', () => {
      const def = buildMinimalDefinition();
      const data = def.toJSON();
      const combo = data.combinations[0];

      // Reconstruct the normalized selections from the combination
      const optionMap = new Map(data.options.map(o => [o.id, o.normalizedValue]));
      const normalizedSelections: Record<string, string[]> = {};
      for (const [dimId, optIds] of Object.entries(combo.optionSelections)) {
        normalizedSelections[dimId] = optIds.map(id => optionMap.get(id) || id);
      }

      const result = validateCombination(normalizedSelections, data.combinations);
      expect(result.matches).toBe(true);
    });

    it('should return matches=false for selections that do not match any combination', () => {
      const def = buildMinimalDefinition();
      const data = def.toJSON();
      // Use a non-existent option ID
      const result = validateCombination(
        { [`dim-nonexistent-${randomSuffix()}`]: [`opt-nonexistent-${randomSuffix()}`] },
        data.combinations
      );
      expect(result.matches).toBe(false);
      expect(result.combination).toBeNull();
    });
  });
});
