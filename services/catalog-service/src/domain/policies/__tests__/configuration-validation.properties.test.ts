// @ts-nocheck
/**
 * ConfigurationValidationPolicy — Property-Based Tests
 *
 * Verifies sparse combination enforcement: valid active combinations pass,
 * non-matching combinations are rejected, inactive combinations are rejected,
 * and duplicate combinations are prevented by the entity.
 *
 * Feature: configuration-definition-foundation
 */

import { ConfigurationValidationPolicy } from '../configuration-validation.policy';
import {
  ConfigurationDefinition,
  ConfigurationDefinitionData,
  ConfigurationCombinationData,
} from '../../entities/configuration-definition.entity';
import { ConfigurationDimension } from '../../value-objects/configuration-dimension.value-object';
import { ConfigurationOption } from '../../value-objects/configuration-option.value-object';

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
 * Build a definition with one dimension and two options, one active combination
 * pointing to opt1, and one inactive combination pointing to opt2.
 */
function buildDefinitionWithCombinations(): {
  definition: ConfigurationDefinitionData;
  dimId: string;
  opt1Id: string;
  opt2Id: string;
  activeCombination: ConfigurationCombinationData;
  inactiveCombination: ConfigurationCombinationData;
} {
  const def = ConfigurationDefinition.create(`prod-${randomSuffix()}`);
  const dimId = `dim-${randomSuffix()}`;
  const opt1Id = `opt1-${randomSuffix()}`;
  const opt2Id = `opt2-${randomSuffix()}`;

  def.addDimension(new ConfigurationDimension(dimId, (def as any).id, 'Colour', 'selectable', 'single', 1, 1, true, 0));
  def.addOption(new ConfigurationOption(opt1Id, dimId, 'Black', undefined, 0));
  def.addOption(new ConfigurationOption(opt2Id, dimId, 'Blue', undefined, 1));

  def.addCombination({ id: `combo1-${randomSuffix()}`, configurationDefinitionId: (def as any).id, optionSelections: { [dimId]: [opt1Id] }, fingerprint: '', active: true });
  def.addCombination({ id: `combo2-${randomSuffix()}`, configurationDefinitionId: (def as any).id, optionSelections: { [dimId]: [opt2Id] }, fingerprint: '', active: true });

  const data = def.toJSON();
  // Make second combination inactive
  const inactiveData = { ...data };
  inactiveData.combinations = [
    data.combinations[0],
    { ...data.combinations[1], active: false },
  ];

  return {
    definition: inactiveData,
    dimId,
    opt1Id,
    opt2Id,
    activeCombination: inactiveData.combinations[0],
    inactiveCombination: inactiveData.combinations[1],
  };
}

// ── Property 1: Valid Combination Accepted
// Feature: configuration-definition-foundation, Property 1: Valid Combination Accepted
// Validates: Requirements 14.1
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 1: Valid Combination Accepted', () => {
  it('should pass validation for selections matching an explicitly defined active combination', () => {
    forAll(
      100,
      buildDefinitionWithCombinations,
      ({ definition, dimId, opt1Id }) => {
        const selections = { [dimId]: [opt1Id] };
        const result = ConfigurationValidationPolicy.validate(selections, definition);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    );
  });
});

// ── Property 2: Invalid Combination Rejected
// Feature: configuration-definition-foundation, Property 2: Invalid Combination Rejected
// Validates: Requirements 14.2
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 2: Invalid Combination Rejected', () => {
  it('should reject validation for selections not matching any defined combination', () => {
    forAll(
      100,
      () => {
        const { definition, dimId } = buildDefinitionWithCombinations();
        const nonExistentOptId = `opt-nonexistent-${randomSuffix()}`;
        return { definition, dimId, nonExistentOptId };
      },
      ({ definition, dimId, nonExistentOptId }) => {
        const selections = { [dimId]: [nonExistentOptId] };
        const result = ConfigurationValidationPolicy.validate(selections, definition);

        expect(result.valid).toBe(false);
        const codes = result.errors.map(e => e.code);
        expect(codes).toContain('NO_MATCHING_COMBINATION');
      }
    );
  });

  it('should reject selections with entirely different dimensions', () => {
    forAll(
      100,
      () => {
        const { definition } = buildDefinitionWithCombinations();
        const wrongDimId = `dim-nonexistent-${randomSuffix()}`;
        const wrongOptId = `opt-nonexistent-${randomSuffix()}`;
        return { definition, wrongDimId, wrongOptId };
      },
      ({ definition, wrongDimId, wrongOptId }) => {
        const selections = { [wrongDimId]: [wrongOptId] };
        const result = ConfigurationValidationPolicy.validate(selections, definition);

        expect(result.valid).toBe(false);
        const codes = result.errors.map(e => e.code);
        expect(codes).toContain('NO_MATCHING_COMBINATION');
      }
    );
  });
});

// ── Property 3: Inactive Combination Rejected
// Feature: configuration-definition-foundation, Property 3: Inactive Combination Rejected
// Validates: Requirements 14.3
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 3: Inactive Combination Rejected', () => {
  it('should reject validation for selections matching an inactive combination', () => {
    forAll(
      100,
      buildDefinitionWithCombinations,
      ({ definition, dimId, opt2Id, inactiveCombination }) => {
        // opt2Id matches the inactive combination
        const selections = { [dimId]: [opt2Id] };
        const result = ConfigurationValidationPolicy.validate(selections, definition);

        expect(result.valid).toBe(false);
        const codes = result.errors.map(e => e.code);
        expect(codes).toContain('INACTIVE_COMBINATION');
      }
    );
  });
});

// ── Property 4: Duplicate Combination Prevention
// Feature: configuration-definition-foundation, Property 4: Duplicate Prevention
// Validates: Requirements 14.4
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 4: Duplicate Combination Prevention', () => {
  it('should throw when adding a duplicate combination (same fingerprint) to a ConfigurationDefinition', () => {
    forAll(
      100,
      () => {
        const def = ConfigurationDefinition.create(`prod-${randomSuffix()}`);
        const dimId = `dim-${randomSuffix()}`;
        const optId = `opt-${randomSuffix()}`;

        def.addDimension(new ConfigurationDimension(dimId, (def as any).id, 'Size', 'selectable', 'single', 1, 1, true, 0));
        def.addOption(new ConfigurationOption(optId, dimId, 'Large', undefined, 0));

        // Add combination once
        def.addCombination({ id: `combo1-${randomSuffix()}`, configurationDefinitionId: (def as any).id, optionSelections: { [dimId]: [optId] }, fingerprint: '', active: true });

        return { def, dimId, optId };
      },
      ({ def, dimId, optId }) => {
        // Try to add the same combination again
        expect(() => {
          def.addCombination({ id: `combo2-${randomSuffix()}`, configurationDefinitionId: (def as any).id, optionSelections: { [dimId]: [optId] }, fingerprint: '', active: true });
        }).toThrow();
      }
    );
  });
});
