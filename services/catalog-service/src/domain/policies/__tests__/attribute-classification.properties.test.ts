// @ts-nocheck
/**
 * AttributeClassificationPolicy — Classification Independence Property-Based Tests
 *
 * Verifies that classification is never inferred from boolean flags, that
 * isConfigurable checks only the classification field, and that classifyAttribute
 * returns the classification field value (or undefined) regardless of booleans.
 * Also includes example-based tests for advisory warnings.
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

function randomSchemaWithClassification(): CategoryAttributeSchema {
  return randomSchema(randomClassification());
}

function randomSchemaWithoutClassification(): CategoryAttributeSchema {
  return randomSchema(undefined);
}

// ── Property 1: classifyAttribute Returns Classification Field Value
// Feature: attribute-classification-enforcement, Property 1: Classification Authority
// Validates: Requirements 4.2, 7.1
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 1: classifyAttribute Returns Classification Field Value', () => {
  it('should return the classification field value regardless of boolean flags', () => {
    forAll(
      100,
      randomSchemaWithClassification,
      (schema) => {
        const result = AttributeClassificationPolicy.classifyAttribute(schema);
        expect(result).toBe(schema.classification);
      }
    );
  });
});

// ── Property 2: isConfigurable Checks Classification Only
// Feature: attribute-classification-enforcement, Property 2: isConfigurable Independence
// Validates: Requirements 5.1, 7.2
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 2: isConfigurable Checks Classification Only', () => {
  it('should return true if and only if classification is configurable, regardless of booleans', () => {
    forAll(
      100,
      randomSchemaWithClassification,
      (schema) => {
        const result = AttributeClassificationPolicy.isConfigurable(schema);
        expect(result).toBe(schema.classification === 'configurable');
      }
    );
  });
});

// ── Property 3: isConfigurable Returns False for Filterable
// Feature: attribute-classification-enforcement, Property 3: Filterable Not Configurable
// Validates: Requirements 5.2, 7.3
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 3: isConfigurable Returns False for Filterable', () => {
  it('should return false when classification is filterable, even if filterable boolean is true', () => {
    forAll(
      100,
      () => {
        const schema = randomSchema('filterable');
        (schema as any).filterable = true;
        return schema;
      },
      (schema) => {
        const result = AttributeClassificationPolicy.isConfigurable(schema);
        expect(result).toBe(false);
      }
    );
  });
});

// ── Property 4: classifyAttribute Returns Undefined Without Classification
// Feature: attribute-classification-enforcement, Property 4: Undefined Without Classification
// Validates: Requirements 4.3, 7.4
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 4: classifyAttribute Returns Undefined Without Classification', () => {
  it('should return undefined for schemas without classification, regardless of booleans', () => {
    forAll(
      100,
      randomSchemaWithoutClassification,
      (schema) => {
        const result = AttributeClassificationPolicy.classifyAttribute(schema);
        expect(result).toBeUndefined();
      }
    );
  });
});

// ── Property 5: All Four Classifications Pass Validation
// Feature: attribute-classification-enforcement, Property 5: All Classifications Valid
// Validates: Requirements 7.5
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 5: All Four Classifications Pass Validation', () => {
  it('should pass validation for any schema with a valid classification, regardless of booleans', () => {
    forAll(
      100,
      randomSchemaWithClassification,
      (schema) => {
        const result = AttributeClassificationPolicy.validate([schema]);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    );
  });
});

// ── Property 6: Missing Classification Fails Validation
// Feature: attribute-classification-enforcement, Property 6: Missing Classification Fails
// Validates: Requirements 7.6, 2.3
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 6: Missing Classification Fails Validation', () => {
  it('should fail validation for schemas without classification, regardless of booleans', () => {
    forAll(
      100,
      randomSchemaWithoutClassification,
      (schema) => {
        const result = AttributeClassificationPolicy.validate([schema]);
        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe('MISSING_CLASSIFICATION');
        expect(result.errors[0].field).toBe(schema.name);
      }
    );
  });
});

// ── Property 7: classifyAttribute Ignores Boolean Flags
// Feature: attribute-classification-enforcement, Property 7: No Boolean Inspection
// Validates: Requirements 4.4
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 7: classifyAttribute Ignores Boolean Flags', () => {
  it('should return the same classification for schemas with identical classification but different booleans', () => {
    forAll(
      100,
      () => {
        const classification = randomClassification();
        const schema1 = randomSchema(classification);
        const schema2 = randomSchema(classification);
        schema2.filterable   = !schema1.filterable;
        schema2.searchable   = !schema1.searchable;
        schema2.comparable   = !schema1.comparable;
        schema2.identityRelevant = !schema1.identityRelevant;
        return { schema1, schema2, classification };
      },
      ({ schema1, schema2, classification }) => {
        expect(AttributeClassificationPolicy.classifyAttribute(schema1)).toBe(classification);
        expect(AttributeClassificationPolicy.classifyAttribute(schema2)).toBe(classification);
      }
    );
  });
});

// ── Property 8: isConfigurable Ignores Boolean Flags
// Feature: attribute-classification-enforcement, Property 8: isConfigurable Ignores Booleans
// Validates: Requirements 5.5
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 8: isConfigurable Ignores Boolean Flags', () => {
  it('should return the same result for schemas with identical classification but different booleans', () => {
    forAll(
      100,
      () => {
        const classification = randomClassification();
        const schema1 = randomSchema(classification);
        const schema2 = randomSchema(classification);
        schema2.filterable   = !schema1.filterable;
        schema2.searchable   = !schema1.searchable;
        schema2.comparable   = !schema1.comparable;
        schema2.identityRelevant = !schema1.identityRelevant;
        return { schema1, schema2 };
      },
      ({ schema1, schema2 }) => {
        expect(AttributeClassificationPolicy.isConfigurable(schema1))
          .toBe(AttributeClassificationPolicy.isConfigurable(schema2));
      }
    );
  });
});

// ── Example Tests — Advisory Warnings (Task 5) ────────────────────────────────

describe('Advisory Warnings (example-based)', () => {
  it('filterable classification with filterable=false produces FLAG_CLASSIFICATION_MISMATCH warning (Req 6.1)', () => {
    const schema = randomSchema('filterable');
    schema.filterable = false;
    const result = AttributeClassificationPolicy.validate([schema]);
    expect(result.valid).toBe(true); // advisory only
    expect(result.errors).toHaveLength(0);
    expect(result.warnings.some(w => w.code === 'FLAG_CLASSIFICATION_MISMATCH')).toBe(true);
  });

  it('configurable classification with filterable=true produces CONFIGURABLE_ALSO_FILTERABLE warning (Req 6.2)', () => {
    const schema = randomSchema('configurable');
    schema.filterable = true;
    const result = AttributeClassificationPolicy.validate([schema]);
    expect(result.valid).toBe(true); // advisory only
    expect(result.errors).toHaveLength(0);
    expect(result.warnings.some(w => w.code === 'CONFIGURABLE_ALSO_FILTERABLE')).toBe(true);
  });

  it('filterable=true + classification=filterable is valid with no warnings (Req 3.2)', () => {
    const schema = randomSchema('filterable');
    schema.filterable = true;
    const result = AttributeClassificationPolicy.validate([schema]);
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('filterable=true + classification=configurable is valid with advisory warning (Req 3.3)', () => {
    const schema = randomSchema('configurable');
    schema.filterable = true;
    const result = AttributeClassificationPolicy.validate([schema]);
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('filterable=true + classification=descriptive is valid with no warnings (Req 3.4)', () => {
    const schema = randomSchema('descriptive');
    schema.filterable = true;
    const result = AttributeClassificationPolicy.validate([schema]);
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('validation result always contains both errors and warnings arrays (Req 6.3)', () => {
    const schema = randomSchemaWithClassification();
    const result = AttributeClassificationPolicy.validate([schema]);
    expect(Array.isArray(result.errors)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
  });
});
