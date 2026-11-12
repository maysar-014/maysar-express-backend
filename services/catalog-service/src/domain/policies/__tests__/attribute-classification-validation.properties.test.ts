// @ts-nocheck
/**
 * AttributeClassificationPolicy — Validation Property-Based Tests
 *
 * Verifies that invalid classifications are caught, missing classifications
 * are reported per-schema with names, valid schemas pass, and validation
 * is idempotent across repeated calls.
 *
 * Feature: attribute-classification-enforcement
 */

import { AttributeClassificationPolicy } from '../attribute-classification.policy';
import { CategoryAttributeSchema, AttributeClassification } from '../../value-objects/product-attributes.value-object';

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

function randomBoolean(): boolean {
  return Math.random() < 0.5;
}

const CLASSIFICATIONS: AttributeClassification[] = [
  'descriptive', 'filterable', 'configurable', 'operational',
];

function randomClassification(): AttributeClassification {
  return CLASSIFICATIONS[Math.floor(Math.random() * CLASSIFICATIONS.length)];
}

function randomSchema(
  classification?: AttributeClassification | undefined
): CategoryAttributeSchema {
  return {
    id: `attr-${randomSuffix()}`,
    name: `attr_${randomSuffix()}`,
    displayLabel: `Attribute ${randomSuffix()}`,
    type: 'TEXT',
    isRequired: randomBoolean(),
    searchable: randomBoolean(),
    comparable: randomBoolean(),
    filterable: randomBoolean(),
    identityRelevant: randomBoolean(),
    classification,
  };
}

function randomInvalidClassification(): string {
  const invalid = [
    'searchable', 'variant', 'required', 'optional', 'display',
    'metadata', 'pricing', 'inventory', 'shipping', 'unknown',
    'config', 'desc', 'filt', 'op', `invalid-${randomSuffix()}`,
  ];
  return invalid[Math.floor(Math.random() * invalid.length)];
}

function randomSchemaArray(count: number, withClassification: boolean): CategoryAttributeSchema[] {
  return Array.from({ length: count }, () =>
    randomSchema(withClassification ? randomClassification() : undefined)
  );
}

// ── Property 1: Invalid Classification Rejected
// Feature: attribute-classification-enforcement, Property 1: Invalid Classification Rejected
// Validates: Requirements 2.2, 8.1
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 1: Invalid Classification Rejected', () => {
  it('should produce a validation error for any classification outside the four allowed values', () => {
    forAll(
      100,
      () => {
        const schema = randomSchema();
        (schema as any).classification = randomInvalidClassification();
        return schema;
      },
      (schema) => {
        const result = AttributeClassificationPolicy.validate([schema]);
        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe('INVALID_CLASSIFICATION');
        expect(result.errors[0].field).toBe(schema.name);
      }
    );
  });
});

// ── Property 2: Per-Schema Missing Classification Errors
// Feature: attribute-classification-enforcement, Property 2: Per-Schema Missing Classification
// Validates: Requirements 2.3, 8.2
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 2: Per-Schema Missing Classification Errors', () => {
  it('should return an error for each schema missing a classification, identifying each by name', () => {
    forAll(
      100,
      () => {
        const count = Math.floor(Math.random() * 5) + 1;
        return randomSchemaArray(count, false);
      },
      (schemas) => {
        const result = AttributeClassificationPolicy.validate(schemas);
        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(schemas.length);
        for (let i = 0; i < schemas.length; i++) {
          expect(result.errors[i].code).toBe('MISSING_CLASSIFICATION');
          expect(result.errors[i].field).toBe(schemas[i].name);
        }
      }
    );
  });
});

// ── Property 3: Valid Schemas Pass Validation
// Feature: attribute-classification-enforcement, Property 3: Valid Schemas Pass
// Validates: Requirements 8.3
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 3: Valid Schemas Pass Validation', () => {
  it('should return valid result with zero errors for an array of valid schemas', () => {
    forAll(
      100,
      () => randomSchemaArray(Math.floor(Math.random() * 5) + 1, true),
      (schemas) => {
        const result = AttributeClassificationPolicy.validate(schemas);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    );
  });
});

// ── Property 4: Validation Idempotence
// Feature: attribute-classification-enforcement, Property 4: Validation Idempotence
// Validates: Requirements 8.4
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 4: Validation Idempotence', () => {
  it('should produce identical results when validating the same schema array multiple times', () => {
    forAll(
      100,
      () => randomSchemaArray(Math.floor(Math.random() * 5) + 1, Math.random() < 0.5),
      (schemas) => {
        const result1 = AttributeClassificationPolicy.validate(schemas);
        const result2 = AttributeClassificationPolicy.validate(schemas);
        expect(result1.valid).toBe(result2.valid);
        expect(result1.errors).toEqual(result2.errors);
        expect(result1.warnings).toEqual(result2.warnings);
      }
    );
  });
});
