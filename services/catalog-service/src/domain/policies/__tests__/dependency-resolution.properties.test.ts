// @ts-nocheck
/**
 * DependencyResolutionPolicy — Property-Based Tests
 *
 * Verifies conditional filtering, required enforcement, mutual exclusion
 * detection, and idempotence.
 *
 * Feature: configuration-definition-foundation
 */

import { DependencyResolutionPolicy } from '../dependency-resolution.policy';
import {
  ConfigurationDefinitionData,
  ConfigurationDependencyData,
} from '../../entities/configuration-definition.entity';

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

/** Build a minimal definition data with two dimensions and multiple options */
function buildDefinitionData(
  numDims = 2,
  numOptsPerDim = 3,
  dependencies: ConfigurationDependencyData[] = []
): {
  definition: ConfigurationDefinitionData;
  dimIds: string[];
  optIdsByDim: Record<string, string[]>;
} {
  const defId = `cfg-def-${randomSuffix()}`;
  const dimIds: string[] = [];
  const optIdsByDim: Record<string, string[]> = {};
  const dimensions = [];
  const options = [];

  for (let d = 0; d < numDims; d++) {
    const dimId = `dim-${randomSuffix()}`;
    dimIds.push(dimId);
    optIdsByDim[dimId] = [];
    dimensions.push({
      id: dimId,
      configurationDefinitionId: defId,
      name: `Dim${d}`,
      selectionType: 'selectable' as const,
      selectionMode: 'single' as const,
      minSelections: 1,
      maxSelections: 1,
      required: true,
      sortOrder: d,
    });
    for (let o = 0; o < numOptsPerDim; o++) {
      const optId = `opt-${randomSuffix()}`;
      optIdsByDim[dimId].push(optId);
      options.push({
        id: optId,
        configurationDimensionId: dimId,
        displayValue: `Opt${d}${o}`,
        normalizedValue: `opt${d}${o}`,
        sortOrder: o,
        active: true,
      });
    }
  }

  const definition: ConfigurationDefinitionData = {
    id: defId,
    productId: `prod-${randomSuffix()}`,
    version: 1,
    status: 'draft',
    dimensions,
    options,
    dependencies,
    constraints: [],
    combinations: [],
    predecessorVersionId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return { definition, dimIds, optIdsByDim };
}

// ── Property 1: Conditional Filtering
// Feature: configuration-definition-foundation, Property 1: Conditional Filtering
// Validates: Requirements 15.1
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 1: Conditional Filtering', () => {
  it('should filter target dimension options when source option with conditional dependency is selected', () => {
    forAll(
      100,
      () => {
        const { definition, dimIds, optIdsByDim } = buildDefinitionData(2, 3);
        const [sourceDimId, targetDimId] = dimIds;
        const sourceOptId = optIdsByDim[sourceDimId][0];
        // Only allow first option of target dimension when source is selected
        const allowedTargetOpts = [optIdsByDim[targetDimId][0]];

        const dep: ConfigurationDependencyData = {
          id: `dep-${randomSuffix()}`,
          type: 'conditional',
          sourceDimensionId: sourceDimId,
          sourceOptionId: sourceOptId,
          targetDimensionId: targetDimId,
          targetOptionIds: allowedTargetOpts,
        };
        return { definition: { ...definition, dependencies: [dep] }, sourceDimId, sourceOptId, targetDimId, allowedTargetOpts };
      },
      ({ definition, sourceDimId, sourceOptId, targetDimId, allowedTargetOpts }) => {
        // Select the source option
        const selections = { [sourceDimId]: [sourceOptId] };
        const result = DependencyResolutionPolicy.resolve(selections, definition);

        // Target dimension should be filtered to only allowed options
        expect(result.filteredOptions[targetDimId]).toEqual(allowedTargetOpts);
        expect(result.conflicts).toHaveLength(0);
      }
    );
  });

  it('should NOT filter target options when source option is NOT selected', () => {
    forAll(
      100,
      () => {
        const { definition, dimIds, optIdsByDim } = buildDefinitionData(2, 3);
        const [sourceDimId, targetDimId] = dimIds;
        const sourceOptId = optIdsByDim[sourceDimId][0];
        const otherSourceOptId = optIdsByDim[sourceDimId][1]; // Not the conditional source
        const allowedTargetOpts = [optIdsByDim[targetDimId][0]];

        const dep: ConfigurationDependencyData = {
          id: `dep-${randomSuffix()}`,
          type: 'conditional',
          sourceDimensionId: sourceDimId,
          sourceOptionId: sourceOptId,
          targetDimensionId: targetDimId,
          targetOptionIds: allowedTargetOpts,
        };
        return { definition: { ...definition, dependencies: [dep] }, otherSourceOptId, targetDimId, sourceDimId };
      },
      ({ definition, otherSourceOptId, targetDimId, sourceDimId }) => {
        // Select a different option (not the conditional source)
        const selections = { [sourceDimId]: [otherSourceOptId] };
        const result = DependencyResolutionPolicy.resolve(selections, definition);

        // Target dimension should still have all options
        const allTargetOpts = definition.options
          .filter(o => o.configurationDimensionId === targetDimId)
          .map(o => o.id);
        expect(result.filteredOptions[targetDimId]).toEqual(allTargetOpts);
      }
    );
  });
});

// ── Property 2: Required Enforcement
// Feature: configuration-definition-foundation, Property 2: Required Enforcement
// Validates: Requirements 15.2
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 2: Required Enforcement', () => {
  it('should report requiredSelections when source option is selected but target is missing', () => {
    forAll(
      100,
      () => {
        const { definition, dimIds, optIdsByDim } = buildDefinitionData(2, 3);
        const [sourceDimId, targetDimId] = dimIds;
        const sourceOptId = optIdsByDim[sourceDimId][0];
        const requiredTargetOptId = optIdsByDim[targetDimId][0];

        const dep: ConfigurationDependencyData = {
          id: `dep-${randomSuffix()}`,
          type: 'required',
          sourceDimensionId: sourceDimId,
          sourceOptionId: sourceOptId,
          targetDimensionId: targetDimId,
          targetOptionIds: [requiredTargetOptId],
        };
        return { definition: { ...definition, dependencies: [dep] }, sourceDimId, sourceOptId, requiredTargetOptId };
      },
      ({ definition, sourceDimId, sourceOptId, requiredTargetOptId }) => {
        // Select source but NOT the required target
        const selections = { [sourceDimId]: [sourceOptId] };
        const result = DependencyResolutionPolicy.resolve(selections, definition);

        expect(result.requiredSelections).toContain(requiredTargetOptId);
        expect(result.conflicts).toHaveLength(0);
      }
    );
  });

  it('should NOT report requiredSelections when source option is NOT selected', () => {
    forAll(
      100,
      () => {
        const { definition, dimIds, optIdsByDim } = buildDefinitionData(2, 3);
        const [sourceDimId, targetDimId] = dimIds;
        const sourceOptId = optIdsByDim[sourceDimId][0];
        const otherSourceOptId = optIdsByDim[sourceDimId][1];
        const requiredTargetOptId = optIdsByDim[targetDimId][0];

        const dep: ConfigurationDependencyData = {
          id: `dep-${randomSuffix()}`,
          type: 'required',
          sourceDimensionId: sourceDimId,
          sourceOptionId: sourceOptId,
          targetDimensionId: targetDimId,
          targetOptionIds: [requiredTargetOptId],
        };
        return { definition: { ...definition, dependencies: [dep] }, sourceDimId, otherSourceOptId };
      },
      ({ definition, sourceDimId, otherSourceOptId }) => {
        // Select a different option — required dep should not trigger
        const selections = { [sourceDimId]: [otherSourceOptId] };
        const result = DependencyResolutionPolicy.resolve(selections, definition);
        expect(result.requiredSelections).toHaveLength(0);
      }
    );
  });
});

// ── Property 3: Mutual Exclusion
// Feature: configuration-definition-foundation, Property 3: Mutual Exclusion
// Validates: Requirements 15.3
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 3: Mutual Exclusion', () => {
  it('should always produce a conflict when two mutually exclusive options are selected together', () => {
    forAll(
      100,
      () => {
        const { definition, dimIds, optIdsByDim } = buildDefinitionData(2, 3);
        const [sourceDimId, targetDimId] = dimIds;
        const sourceOptId = optIdsByDim[sourceDimId][0];
        const targetOptId = optIdsByDim[targetDimId][0];

        const dep: ConfigurationDependencyData = {
          id: `dep-${randomSuffix()}`,
          type: 'mutually_exclusive',
          sourceDimensionId: sourceDimId,
          sourceOptionId: sourceOptId,
          targetDimensionId: targetDimId,
          targetOptionIds: [targetOptId],
        };
        return { definition: { ...definition, dependencies: [dep] }, sourceDimId, sourceOptId, targetDimId, targetOptId };
      },
      ({ definition, sourceDimId, sourceOptId, targetDimId, targetOptId }) => {
        // Select BOTH mutually exclusive options
        const selections = {
          [sourceDimId]: [sourceOptId],
          [targetDimId]: [targetOptId],
        };
        const result = DependencyResolutionPolicy.resolve(selections, definition);

        expect(result.conflicts.length).toBeGreaterThan(0);
        const conflict = result.conflicts[0];
        expect(conflict.code).toBe('MUTUALLY_EXCLUSIVE_VIOLATION');
        expect(conflict.optionIds).toContain(sourceOptId);
        expect(conflict.optionIds).toContain(targetOptId);
      }
    );
  });

  it('should NOT produce a conflict when only one of a mutually exclusive pair is selected', () => {
    forAll(
      100,
      () => {
        const { definition, dimIds, optIdsByDim } = buildDefinitionData(2, 3);
        const [sourceDimId, targetDimId] = dimIds;
        const sourceOptId = optIdsByDim[sourceDimId][0];
        const targetOptId = optIdsByDim[targetDimId][0];

        const dep: ConfigurationDependencyData = {
          id: `dep-${randomSuffix()}`,
          type: 'mutually_exclusive',
          sourceDimensionId: sourceDimId,
          sourceOptionId: sourceOptId,
          targetDimensionId: targetDimId,
          targetOptionIds: [targetOptId],
        };
        return { definition: { ...definition, dependencies: [dep] }, sourceDimId, sourceOptId };
      },
      ({ definition, sourceDimId, sourceOptId }) => {
        // Select ONLY the source option (target not selected)
        const selections = { [sourceDimId]: [sourceOptId] };
        const result = DependencyResolutionPolicy.resolve(selections, definition);
        expect(result.conflicts).toHaveLength(0);
      }
    );
  });
});

// ── Property 4: Idempotence
// Feature: configuration-definition-foundation, Property 4: Idempotence
// Validates: Requirements 15.4
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 4: Idempotence', () => {
  it('should return consistent results for the same input across multiple invocations', () => {
    forAll(
      100,
      () => {
        const { definition, dimIds, optIdsByDim } = buildDefinitionData(2, 3);
        const selections: Record<string, string[]> = {};
        for (const dimId of dimIds) {
          selections[dimId] = [optIdsByDim[dimId][0]];
        }
        return { definition, selections };
      },
      ({ definition, selections }) => {
        const result1 = DependencyResolutionPolicy.resolve(selections, definition);
        const result2 = DependencyResolutionPolicy.resolve(selections, definition);

        expect(result2.conflicts).toEqual(result1.conflicts);
        expect(result2.requiredSelections).toEqual(result1.requiredSelections);
        expect(result2.staleReferences).toEqual(result1.staleReferences);
        expect(JSON.stringify(result2.filteredOptions)).toBe(JSON.stringify(result1.filteredOptions));
      }
    );
  });
});
