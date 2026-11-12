# Requirements Document

## Introduction

This spec implements ENH-015 from the MUVA+MSLE Constitution Backlog, enforcing the attribute classification rules defined in constitution §4.2. The Maysar Commerce Platform's catalog-service already has a `CategoryAttributeSchema` interface with optional boolean fields (`searchable`, `filterable`, `comparable`, `identityRelevant`) and priority metadata. However, there is no formal `classification` enum that names the four constitutional roles, no domain policy that enforces classification independence, and no guard preventing a `filterable` boolean from silently implying `configurable` semantics.

This spec adds an `AttributeClassification` type to `CategoryAttributeSchema`, creates an `AttributeClassificationPolicy` domain policy that validates classification assignments and enforces independence, and adds property-based tests verifying that classification logic remains independent of boolean flags. The scope is tightly limited to the domain layer: no API changes, no Prisma schema changes, no controller changes.

## Glossary

- **Catalog_Service**: The catalog-service modular monolith within the Maysar platform that owns product identity, configuration, and variant resolution.
- **CategoryAttributeSchema**: The existing TypeScript interface in `services/catalog-service/src/domain/value-objects/product-attributes.value-object.ts` that defines the schema for a category-level attribute, including type, options, requiredness, and semantic metadata booleans (`searchable`, `filterable`, `comparable`, `identityRelevant`).
- **AttributeClassification**: A new type union `'descriptive' | 'filterable' | 'configurable' | 'operational'` added to `CategoryAttributeSchema` that explicitly names the constitutional role of an attribute.
- **Descriptive_Attribute**: An attribute that explains what a product is. Examples: brand, material, weight, dimensions.
- **Filterable_Attribute**: An attribute that helps customers discover products through search facets and comparison tables. Examples: colour, size, price range.
- **Configurable_Attribute**: An attribute that allows customers to choose a purchasable configuration. Examples: storage capacity, RAM, finish.
- **Operational_Attribute**: An attribute that supports fulfillment, storage, compliance, or internal operations. Examples: hazmat code, storage temperature, country of origin.
- **AttributeClassificationPolicy**: A new domain policy class in the catalog-service domain layer that validates classification assignments, enforces classification independence, and provides helper methods for resolving the authoritative classification of an attribute.
- **Classification_Independence**: The constitutional principle (§4.2) that the four attribute classifications remain independent — a `filterable` boolean being `true` does not automatically promote an attribute to `configurable` classification, and classification assignment does not derive from boolean flags.
- **Domain_Error**: The existing error class in `services/catalog-service/src/domain/errors/domain.error.ts` used for domain-level validation failures.
- **Test_Suite**: The property-based and unit test suite within the catalog-service domain layer, following the established `forAll` pattern with randomized generators.

## Requirements

### Requirement 1: Attribute Classification Type

**User Story:** As a catalog architect, I want a formal classification type on CategoryAttributeSchema, so that every attribute explicitly declares its constitutional role.

#### Acceptance Criteria

1. THE Catalog_Service SHALL add an `AttributeClassification` type to `CategoryAttributeSchema` with the value union `'descriptive' | 'filterable' | 'configurable' | 'operational'`.
2. THE `CategoryAttributeSchema.classification` field SHALL be optional during the transition period to avoid breaking existing schemas that do not yet specify a classification.
3. THE Catalog_Service SHALL treat the `classification` field as the authoritative source of an attribute's role when present.
4. THE Catalog_Service SHALL NOT derive the `classification` value from any boolean flag (`searchable`, `filterable`, `comparable`, `identityRelevant`) on the schema.

### Requirement 2: Classification Validation

**User Story:** As a catalog architect, I want a domain policy that validates classification assignments, so that attributes with missing or invalid classifications are caught at the domain layer.

#### Acceptance Criteria

1. WHEN a `CategoryAttributeSchema` with a `classification` value is provided, THE AttributeClassificationPolicy SHALL validate that the classification is one of `'descriptive'`, `'filterable'`, `'configurable'`, or `'operational'`.
2. IF a `CategoryAttributeSchema` has a `classification` value outside the four allowed values, THEN THE AttributeClassificationPolicy SHALL return a validation error identifying the schema by name and the invalid classification value.
3. WHEN a `CategoryAttributeSchema` without a `classification` value is provided, THE AttributeClassificationPolicy SHALL return a validation result indicating the attribute lacks a classification, including the attribute name in the result.
4. THE AttributeClassificationPolicy SHALL accept an array of `CategoryAttributeSchema` instances and return a structured validation result containing a boolean validity flag and an array of validation errors with field, code, and message.

### Requirement 3: Classification Independence Enforcement

**User Story:** As a catalog architect, I want classification independence enforced, so that boolean flags on CategoryAttributeSchema never silently imply a different classification.

#### Acceptance Criteria

1. THE AttributeClassificationPolicy SHALL treat the `classification` field as the sole authoritative determinant of an attribute's role, independent of any boolean flag.
2. WHEN a `CategoryAttributeSchema` has `filterable` set to `true` and `classification` set to `'filterable'`, THE AttributeClassificationPolicy SHALL confirm the classification without error.
3. WHEN a `CategoryAttributeSchema` has `filterable` set to `true` and `classification` set to `'configurable'`, THE AttributeClassificationPolicy SHALL accept this as valid, confirming that a filterable boolean does not prevent a configurable classification.
4. WHEN a `CategoryAttributeSchema` has `filterable` set to `true` and `classification` set to `'descriptive'`, THE AttributeClassificationPolicy SHALL accept this as valid, confirming that a filterable boolean does not auto-promote to filterable classification.
5. THE AttributeClassificationPolicy SHALL NOT modify, override, or infer the `classification` value based on any combination of boolean flags on the schema.

### Requirement 4: Classify Attribute Helper

**User Story:** As a catalog architect, I want a helper method that returns the authoritative classification of an attribute, so that downstream code uses the classification field rather than inferring from boolean flags.

#### Acceptance Criteria

1. THE AttributeClassificationPolicy SHALL provide a `classifyAttribute(schema: CategoryAttributeSchema)` method that returns the `classification` value from the schema.
2. WHEN the `classification` field is present on the schema, THE `classifyAttribute` method SHALL return that value as the authoritative classification.
3. WHEN the `classification` field is absent on the schema, THE `classifyAttribute` method SHALL return `undefined` rather than inferring a classification from boolean flags.
4. THE `classifyAttribute` method SHALL NOT inspect or consider any boolean flag on the schema when determining the return value.

### Requirement 5: IsConfigurable Helper

**User Story:** As a catalog architect, I want an `isConfigurable` helper that checks the classification field, so that code does not mistake the `filterable` boolean for configurability.

#### Acceptance Criteria

1. THE AttributeClassificationPolicy SHALL provide an `isConfigurable(schema: CategoryAttributeSchema)` method that returns `true` when the `classification` field equals `'configurable'`.
2. WHEN the `classification` field is `'filterable'`, THE `isConfigurable` method SHALL return `false`, regardless of the value of the `filterable` boolean.
3. WHEN the `classification` field is `'descriptive'` or `'operational'`, THE `isConfigurable` method SHALL return `false`.
4. WHEN the `classification` field is absent, THE `isConfigurable` method SHALL return `false`.
5. THE `isConfigurable` method SHALL NOT inspect the `filterable`, `searchable`, `comparable`, or `identityRelevant` boolean flags when determining the return value.

### Requirement 6: Classification Consistency with Boolean Flags

**User Story:** As a catalog architect, I want validation that flags are consistent with classification, so that misconfigured attributes are caught without enforcing hard coupling.

#### Acceptance Criteria

1. WHEN a `CategoryAttributeSchema` has `classification` set to `'filterable'` and `filterable` set to `false`, THE AttributeClassificationPolicy SHALL return a warning indicating the classification suggests filterability but the boolean flag is disabled.
2. WHEN a `CategoryAttributeSchema` has `classification` set to `'configurable'` and `filterable` set to `true`, THE AttributeClassificationPolicy SHALL return a warning indicating that a configurable attribute is also marked filterable, which is allowed but may indicate a misconfiguration.
3. THE AttributeClassificationPolicy SHALL distinguish between validation errors (hard failures) and warnings (soft advisories) in its structured result.
4. THE AttributeClassificationPolicy SHALL NOT reject a schema solely because a boolean flag and classification appear inconsistent — warnings are advisory only.

### Requirement 7: Property-Based Tests for Classification Independence

**User Story:** As a quality engineer, I want property-based tests verifying classification independence, so that the policy never infers classification from boolean flags across arbitrary inputs.

#### Acceptance Criteria

1. THE Test_Suite SHALL include a property-based test verifying that `classifyAttribute` returns the `classification` field value for any arbitrary `CategoryAttributeSchema` with a valid classification, regardless of boolean flag combinations.
2. THE Test_Suite SHALL include a property-based test verifying that `isConfigurable` returns `true` if and only if the `classification` field equals `'configurable'`, regardless of boolean flag combinations.
3. THE Test_Suite SHALL include a property-based test verifying that `isConfigurable` returns `false` when the `classification` field is `'filterable'`, even when `filterable` is `true`.
4. THE Test_Suite SHALL include a property-based test verifying that `classifyAttribute` returns `undefined` for any schema without a `classification` field, regardless of boolean flag combinations.
5. THE Test_Suite SHALL include a property-based test verifying that validation passes for all four classification values when the classification is explicitly set, regardless of boolean flag combinations.
6. THE Test_Suite SHALL include a property-based test verifying that validation fails with a descriptive error for any schema missing a `classification` field.

### Requirement 8: Property-Based Tests for Classification Validation

**User Story:** As a quality engineer, I want property-based tests for classification validation, so that invalid and missing classifications are caught across arbitrary inputs.

#### Acceptance Criteria

1. THE Test_Suite SHALL include a property-based test verifying that any `CategoryAttributeSchema` with a classification outside the four allowed values produces a validation error.
2. THE Test_Suite SHALL include a property-based test verifying that validation of an array of schemas returns errors for each schema missing a classification, with each error identifying the schema by name.
3. THE Test_Suite SHALL include a property-based test verifying that validation of an array of valid schemas returns a valid result with zero errors.
4. THE Test_Suite SHALL include a property-based test verifying that the validation result is idempotent — validating the same schema array multiple times produces identical results.
