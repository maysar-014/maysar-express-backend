# Implementation Plan: Attribute Classification Enforcement

## Overview

This plan implements ENH-015 from the MUVA+MSLE Constitution Backlog, enforcing attribute classification rules from constitution §4.2 within the catalog-service domain layer. It delivers the `AttributeClassification` type addition to `CategoryAttributeSchema`, the `AttributeClassificationPolicy` domain policy, and property-based tests verifying classification independence and validation behavior.

Tasks are ordered so the type is added first, then the policy, then tests. The scope is tightly limited to the domain layer — no API changes, no Prisma schema changes, no controller changes.

## Tasks

- [ ] 1. Add AttributeClassification type to CategoryAttributeSchema
  - [ ] 1.1 Define AttributeClassification type union
    - File: `services/catalog-service/src/domain/value-objects/product-attributes.value-object.ts` (MODIFIED)
    - Add `export type AttributeClassification = 'descriptive' | 'filterable' | 'configurable' | 'operational';` with JSDoc explaining the four roles and the independence principle from §4.2
    - Place above the `CategoryAttributeSchema` interface definition
    - _Requirements: 1.1_

  - [ ] 1.2 Add classification field to CategoryAttributeSchema interface
    - File: `services/catalog-service/src/domain/value-objects/product-attributes.value-object.ts` (MODIFIED)
    - Add `classification?: AttributeClassification;` as an optional field to the `CategoryAttributeSchema` interface, after the existing `identityRelevant?` field
    - Include JSDoc comment explaining: authoritative role, sole determinant when present, independence from boolean flags, optional during transition
    - _Requirements: 1.2, 1.3, 1.4_

- [ ] 2. Implement AttributeClassificationPolicy
  - [ ] 2.1 Create policy file with result interfaces
    - File: `services/catalog-service/src/domain/policies/attribute-classification.policy.ts` (NEW)
    - Import `CategoryAttributeSchema` and `AttributeClassification` from `../value-objects/product-attributes.value-object`
    - Define `ClassificationFieldError` interface (field, code, message)
    - Define `ClassificationFieldWarning` interface (field, code, message)
    - Define `ClassificationValidationResult` interface (valid: boolean, errors: ClassificationFieldError[], warnings: ClassificationFieldWarning[])
    - Define `VALID_CLASSIFICATIONS` constant array: `['descriptive', 'filterable', 'configurable', 'operational']`
    - Create `AttributeClassificationPolicy` class skeleton
    - _Requirements: 2.4, 6.3_

  - [ ] 2.2 Implement validate() method
    - File: `services/catalog-service/src/domain/policies/attribute-classification.policy.ts`
    - Implement `static validate(schemas: CategoryAttributeSchema[]): ClassificationValidationResult`
    - For each schema: check if classification is missing (undefined or null) → push `MISSING_CLASSIFICATION` error with schema name, continue to next schema
    - Check if classification is not in `VALID_CLASSIFICATIONS` → push `INVALID_CLASSIFICATION` error with schema name and invalid value, continue to next schema
    - For valid classifications, call `checkFlagConsistency()` to collect advisory warnings
    - Return `{ valid: errors.length === 0, errors, warnings }`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 2.3 Implement classifyAttribute() method
    - File: `services/catalog-service/src/domain/policies/attribute-classification.policy.ts`
    - Implement `static classifyAttribute(schema: CategoryAttributeSchema): AttributeClassification | undefined`
    - Return `schema.classification` directly — do not inspect any boolean flag
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ] 2.4 Implement isConfigurable() method
    - File: `services/catalog-service/src/domain/policies/attribute-classification.policy.ts`
    - Implement `static isConfigurable(schema: CategoryAttributeSchema): boolean`
    - Return `schema.classification === 'configurable'` — do not inspect any boolean flag
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 2.5 Implement checkFlagConsistency() private helper
    - File: `services/catalog-service/src/domain/policies/attribute-classification.policy.ts`
    - Implement `private static checkFlagConsistency(schema, warnings: ClassificationFieldWarning[]): void`
    - If `classification === 'filterable'` and `filterable === false` → push `FLAG_CLASSIFICATION_MISMATCH` warning
    - If `classification === 'configurable'` and `filterable === true` → push `CONFIGURABLE_ALSO_FILTERABLE` warning
    - Warnings are advisory only and do not affect validity
    - _Requirements: 6.1, 6.2, 6.4_

- [ ] 3. Write property-based tests for classification independence
  - [ ] 3.1 Create independence test file with helpers
    - File: `services/catalog-service/src/domain/policies/__tests__/attribute-classification.properties.test.ts` (NEW)
    - Add `// @ts-nocheck` and feature doc comment
    - Import `AttributeClassificationPolicy` and types
    - Implement `forAll(count, generator, property)` helper
    - Implement `randomSuffix()`, `randomBoolean()`, `randomClassification()`, `randomSchema(classification?)` helper generators
    - _Requirements: 7.1_

  - [ ] 3.2 Write Property 1: classifyAttribute returns classification field value
    - File: `services/catalog-service/src/domain/policies/__tests__/attribute-classification.properties.test.ts`
    - **Property 1: classifyAttribute Returns Classification Field Value** — for any schema with a valid classification, `classifyAttribute` returns that value regardless of boolean flags
    - Use `forAll(100, randomSchemaWithClassification, ...)` asserting `result === schema.classification`
    - **Validates: Requirements 4.2, 7.1**

  - [ ] 3.3 Write Property 2: isConfigurable checks classification only
    - File: `services/catalog-service/src/domain/policies/__tests__/attribute-classification.properties.test.ts`
    - **Property 2: isConfigurable Checks Classification Only** — `isConfigurable` returns `true` iff `classification === 'configurable'`, regardless of booleans
    - Use `forAll(100, randomSchemaWithClassification, ...)` asserting `result === (schema.classification === 'configurable')`
    - **Validates: Requirements 5.1, 7.2**

  - [ ] 3.4 Write Property 3: isConfigurable returns false for filterable even when filterable=true
    - File: `services/catalog-service/src/domain/policies/__tests__/attribute-classification.properties.test.ts`
    - **Property 3: isConfigurable Returns False for Filterable** — `isConfigurable` returns `false` when classification is `'filterable'` even if `filterable === true`
    - Generate schemas with `classification = 'filterable'` and force `filterable = true`
    - **Validates: Requirements 5.2, 7.3**

  - [ ] 3.5 Write Property 4: classifyAttribute returns undefined without classification
    - File: `services/catalog-service/src/domain/policies/__tests__/attribute-classification.properties.test.ts`
    - **Property 4: classifyAttribute Returns Undefined Without Classification** — for schemas without classification, `classifyAttribute` returns `undefined` regardless of booleans
    - Use `forAll(100, randomSchemaWithoutClassification, ...)` asserting `result === undefined`
    - **Validates: Requirements 4.3, 7.4**

  - [ ] 3.6 Write Property 5: all four classifications pass validation
    - File: `services/catalog-service/src/domain/policies/__tests__/attribute-classification.properties.test.ts`
    - **Property 5: All Four Classifications Pass Validation** — validation passes for any schema with a valid classification, regardless of booleans
    - Use `forAll(100, randomSchemaWithClassification, ...)` asserting `result.valid === true` and `result.errors.length === 0`
    - **Validates: Requirements 7.5**

  - [ ] 3.7 Write Property 6: missing classification fails validation
    - File: `services/catalog-service/src/domain/policies/__tests__/attribute-classification.properties.test.ts`
    - **Property 6: Missing Classification Fails Validation** — validation fails for schemas without classification, regardless of booleans
    - Assert `result.valid === false`, `result.errors[0].code === 'MISSING_CLASSIFICATION'`, `result.errors[0].field === schema.name`
    - **Validates: Requirements 7.6, 2.3**

  - [ ] 3.8 Write Property 7: classifyAttribute ignores boolean flags
    - File: `services/catalog-service/src/domain/policies/__tests__/attribute-classification.properties.test.ts`
    - **Property 7: classifyAttribute Ignores Boolean Flags** — two schemas with identical classification but different booleans produce the same `classifyAttribute` result
    - Generate two schemas with same classification, invert all boolean flags, assert both return the same classification
    - **Validates: Requirements 4.4**

  - [ ] 3.9 Write Property 8: isConfigurable ignores boolean flags
    - File: `services/catalog-service/src/domain/policies/__tests__/attribute-classification.properties.test.ts`
    - **Property 8: isConfigurable Ignores Boolean Flags** — two schemas with identical classification but different booleans produce the same `isConfigurable` result
    - Generate two schemas with same classification, invert all boolean flags, assert both return the same result
    - **Validates: Requirements 5.5**

- [ ] 4. Write property-based tests for classification validation
  - [ ] 4.1 Create validation test file with helpers
    - File: `services/catalog-service/src/domain/policies/__tests__/attribute-classification-validation.properties.test.ts` (NEW)
    - Add `// @ts-nocheck` and feature doc comment
    - Import `AttributeClassificationPolicy` and types
    - Implement `forAll(count, generator, property)` helper
    - Implement `randomSuffix()`, `randomBoolean()`, `randomClassification()`, `randomSchema()`, `randomInvalidClassification()`, `randomSchemaArray(count, withClassification)` helpers
    - _Requirements: 8.1_

  - [ ] 4.2 Write Property 1: invalid classification rejected
    - File: `services/catalog-service/src/domain/policies/__tests__/attribute-classification-validation.properties.test.ts`
    - **Property 1: Invalid Classification Rejected** — any classification value outside the four allowed values produces `INVALID_CLASSIFICATION` error with schema name
    - Generate random invalid classification strings, assert `result.valid === false`, `result.errors[0].code === 'INVALID_CLASSIFICATION'`
    - **Validates: Requirements 2.2, 8.1**

  - [ ] 4.3 Write Property 2: per-schema missing classification errors
    - File: `services/catalog-service/src/domain/policies/__tests__/attribute-classification-validation.properties.test.ts`
    - **Property 2: Per-Schema Missing Classification Errors** — validation of an array returns one `MISSING_CLASSIFICATION` error per unclassified schema, each identifying the schema by name
    - Generate random arrays of 1-5 schemas without classification, assert `errors.length === schemas.length` and each error's field matches
    - **Validates: Requirements 2.3, 8.2**

  - [ ] 4.4 Write Property 3: valid schemas pass validation
    - File: `services/catalog-service/src/domain/policies/__tests__/attribute-classification-validation.properties.test.ts`
    - **Property 3: Valid Schemas Pass Validation** — validation of an array of valid schemas returns `valid: true` with zero errors
    - Generate random arrays of 1-5 schemas with valid classifications, assert `result.valid === true`, `result.errors.length === 0`
    - **Validates: Requirements 8.3**

  - [ ] 4.5 Write Property 4: validation idempotence
    - File: `services/catalog-service/src/domain/policies/__tests__/attribute-classification-validation.properties.test.ts`
    - **Property 4: Validation Idempotence** — validating the same schema array multiple times produces identical results (valid flag, errors, warnings)
    - Generate random schema arrays, call `validate()` twice, deep-compare results
    - **Validates: Requirements 8.4**

- [ ] 5. Write example-based tests for advisory warnings
  - [ ] 5.1 Write example: filterable classification with filterable=false produces warning
    - File: `services/catalog-service/src/domain/policies/__tests__/attribute-classification.properties.test.ts`
    - Create a schema with `classification = 'filterable'` and `filterable = false`
    - Assert `result.valid === true` (warnings are advisory), `result.warnings` contains entry with code `FLAG_CLASSIFICATION_MISMATCH`
    - **Validates: Requirements 6.1, 6.4**

  - [ ] 5.2 Write example: configurable classification with filterable=true produces warning
    - File: `services/catalog-service/src/domain/policies/__tests__/attribute-classification.properties.test.ts`
    - Create a schema with `classification = 'configurable'` and `filterable = true`
    - Assert `result.valid === true` (warnings are advisory), `result.warnings` contains entry with code `CONFIGURABLE_ALSO_FILTERABLE`
    - **Validates: Requirements 6.2, 6.4**

  - [ ] 5.3 Write example: classification independence scenarios
    - File: `services/catalog-service/src/domain/policies/__tests__/attribute-classification.properties.test.ts`
    - Example: `filterable=true` + `classification='filterable'` is valid with no warnings (Req 3.2)
    - Example: `filterable=true` + `classification='configurable'` is valid with advisory warning (Req 3.3)
    - Example: `filterable=true` + `classification='descriptive'` is valid with no warnings (Req 3.4)
    - **Validates: Requirements 3.2, 3.3, 3.4**

- [ ] 6. Checkpoint — ensure all implementation compiles and tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Each task references specific requirements for traceability
- Property-based tests use the hand-rolled `forAll(count, generator, property)` pattern with 100 iterations per property, matching `configuration-validation.properties.test.ts` conventions
- Domain policy uses static methods on a class, matching `CatalogMatchingPolicy` and `ConfigurationValidationPolicy` conventions
- The `classification` field is optional on `CategoryAttributeSchema` to avoid breaking existing schemas during transition
- No API changes, no Prisma schema changes, no controller changes — domain layer only
- All files use TypeScript as specified in the design document
