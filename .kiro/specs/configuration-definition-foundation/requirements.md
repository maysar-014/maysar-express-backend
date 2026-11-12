# Requirements Document

## Introduction

This spec defines the Configuration Definition domain model for the Maysar Commerce Platform's catalog-service modular monolith. It implements Phase 1 Foundation of the MUVA architecture, covering formal entities for configuration definitions, dimensions, options, dependencies, constraints, and sparse combinations for discrete variant configuration (Mode A).

The current system has Product and ProductVariant entities with a deterministic ProductFingerprint, but lacks the formal Configuration Definition model required by the constitution (§5, §6, §19.3, §20.3). This phase delivers the domain entities, value objects, domain policies, repository interfaces, Prisma schema additions, and property-based tests. It does not include API routes, controllers, parametric (Mode B), or composable (Mode C) configuration — those are later phases.

## Glossary

- **Catalog_Service**: The catalog-service modular monolith within the Maysar platform that owns product identity, configuration, and variant resolution.
- **ConfigurationDefinition**: A formal domain entity that defines which configuration dimensions and options a product has, along with dependencies, constraints, and valid combinations. Linked to a Product via productId.
- **ConfigurationDimension**: A domain entity representing a selectable or customer-defined choice within a ConfigurationDefinition (e.g. Colour, Size, Storage).
- **ConfigurationOption**: A domain entity representing a value within a ConfigurationDimension (e.g. Black, Large, 128GB).
- **ConfigurationDependency**: A domain entity defining a relationship between dimensions or options, with types: conditional, dependent, mutually_exclusive, required, and optional.
- **ConfigurationConstraint**: A domain entity defining a compatibility rule between options, with types: requires, excludes, compatible_with, and incompatible_with.
- **ConfigurationCombination**: A domain entity representing an explicitly defined valid permutation of option selections across dimensions. Not every permutation exists — only defined combinations are valid (sparse matrix).
- **ConfigurationFingerprint**: A deterministic, order-independent, normalized hash that uniquely identifies a configuration based on its dimension-option selections. Extends the existing ProductFingerprint concept.
- **ConfigurationVersion**: A monotonically increasing integer tracking the evolution of a ConfigurationDefinition. Preserved when only metadata changes; incremented when dimensions, options, dependencies, or constraints change.
- **Configuration_Validation_Policy**: A domain policy that validates whether a set of option selections matches an explicitly defined ConfigurationCombination and satisfies all dependencies and constraints.
- **Dependency_Resolution_Policy**: A domain policy that evaluates dependency rules to filter available options, enforce required selections, and detect mutually exclusive conflicts.
- **ProductRepository**: The existing repository interface in the catalog-service domain layer that defines persistence contracts for Product and related entities.
- **Prisma_Schema**: The Prisma schema file (prisma/schema.prisma) defining database models for the Maysar platform.
- **Test_Suite**: The property-based and unit test suite within the catalog-service domain layer.

## Requirements

### Requirement 1: Configuration Definition Entity

**User Story:** As a catalog architect, I want a formal ConfigurationDefinition entity, so that products have an authoritative definition of their configurable dimensions and options.

#### Acceptance Criteria

1. THE Catalog_Service SHALL create a ConfigurationDefinition with a unique identifier, product reference, version number, and lifecycle status.
2. WHEN a ConfigurationDefinition is created, THE Catalog_Service SHALL validate that all referenced dimensions and options are internally consistent.
3. THE ConfigurationDefinition SHALL maintain a lifecycle status of draft, active, or archived.
4. WHEN a ConfigurationDefinition transitions from draft to active, THE Catalog_Service SHALL validate all dimensions, options, dependencies, constraints, and at least one ConfigurationCombination.
5. THE Catalog_Service SHALL prevent modification of an archived ConfigurationDefinition.

### Requirement 2: Configuration Dimension Entity

**User Story:** As a catalog architect, I want configuration dimensions, so that selectable choices for a product are formally defined and owned by the backend.

#### Acceptance Criteria

1. THE Catalog_Service SHALL create ConfigurationDimension instances with a unique identifier, ConfigurationDefinition reference, name, selection type, and selection mode.
2. THE ConfigurationDimension SHALL specify a selection type of either selectable (discrete, Mode A) or customer-defined (placeholder for future parametric Mode B).
3. THE ConfigurationDimension SHALL specify a minimum selection count and a maximum selection count.
4. WHEN a ConfigurationDimension is marked as required, THE Catalog_Service SHALL enforce that at least one ConfigurationOption is selected for that dimension before a configuration is valid.
5. THE Catalog_Service SHALL reject duplicate ConfigurationDimension names within the same ConfigurationDefinition.

### Requirement 3: Configuration Option Entity

**User Story:** As a catalog architect, I want configuration options, so that each dimension has defined values that customers can select.

#### Acceptance Criteria

1. THE Catalog_Service SHALL create ConfigurationOption instances with a unique identifier, ConfigurationDimension reference, display value, and normalized value.
2. THE Catalog_Service SHALL normalize option display values to canonical normalized values using deterministic normalization before storage.
3. THE ConfigurationOption SHALL specify a sort order integer for display purposes.
4. WHEN two ConfigurationOption instances within the same ConfigurationDimension produce equivalent normalized values, THE Catalog_Service SHALL reject the duplicate.
5. THE Catalog_Service SHALL support marking a ConfigurationOption as active or inactive without deleting the record.

### Requirement 4: Configuration Dependency Entity

**User Story:** As a catalog architect, I want configuration dependencies, so that conditional, dependent, mutually exclusive, and required or optional rules are enforced by the backend.

#### Acceptance Criteria

1. THE Catalog_Service SHALL support ConfigurationDependency types: conditional, dependent, mutually_exclusive, required, and optional.
2. WHEN a ConfigurationDependency type is conditional, THE Catalog_Service SHALL specify a source ConfigurationDimension, source ConfigurationOption, target ConfigurationDimension, and applicable target ConfigurationOptions.
3. WHEN a ConfigurationDependency type is mutually_exclusive, THE Catalog_Service SHALL specify two ConfigurationOption instances that cannot be selected together.
4. WHEN a ConfigurationDependency type is required, THE Catalog_Service SHALL specify that selecting the source ConfigurationOption requires selecting the target ConfigurationOption.
5. THE Catalog_Service SHALL validate that all ConfigurationDependency references point to existing ConfigurationDimension and ConfigurationOption instances within the same ConfigurationDefinition.
6. IF a ConfigurationDependency references a ConfigurationDimension or ConfigurationOption outside its parent ConfigurationDefinition, THEN THE Catalog_Service SHALL reject the dependency with a descriptive error.

### Requirement 5: Configuration Constraint Entity

**User Story:** As a catalog architect, I want configuration constraints, so that compatibility rules between options are formally defined and enforced.

#### Acceptance Criteria

1. THE Catalog_Service SHALL create ConfigurationConstraint instances with a constraint type, source ConfigurationOption reference, target ConfigurationOption reference, and rule expression.
2. THE Catalog_Service SHALL support constraint types: requires, excludes, compatible_with, and incompatible_with.
3. WHEN a ConfigurationConstraint is evaluated against a set of selected options, THE Catalog_Service SHALL return a boolean indicating whether the selections satisfy the constraint.
4. THE Catalog_Service SHALL validate that all ConfigurationConstraint references point to existing ConfigurationOption instances within the same ConfigurationDefinition.

### Requirement 6: Configuration Combination (Sparse Matrix)

**User Story:** As a catalog architect, I want configuration combinations, so that only explicitly defined valid option permutations are purchasable.

#### Acceptance Criteria

1. THE Catalog_Service SHALL create ConfigurationCombination instances that represent explicit valid permutations of ConfigurationOption selections across ConfigurationDimension instances.
2. WHEN a ConfigurationCombination is created, THE Catalog_Service SHALL validate that each referenced ConfigurationOption exists in its corresponding ConfigurationDimension.
3. THE Catalog_Service SHALL only create ConfigurationCombination instances for explicitly defined valid permutations, preserving the sparse matrix property.
4. IF a submitted configuration does not match any explicitly defined ConfigurationCombination, THEN THE Catalog_Service SHALL reject that configuration as invalid.
5. THE Catalog_Service SHALL support marking a ConfigurationCombination as active or inactive without deleting the record.
6. THE Catalog_Service SHALL generate a ConfigurationFingerprint for each ConfigurationCombination to prevent duplicate combinations within the same ConfigurationDefinition.

### Requirement 7: Configuration Fingerprint

**User Story:** As a catalog architect, I want a deterministic configuration fingerprint, so that each unique configuration has a stable, order-independent identity.

#### Acceptance Criteria

1. THE Catalog_Service SHALL generate a ConfigurationFingerprint from a set of ConfigurationDimension and ConfigurationOption selections using a deterministic algorithm.
2. THE ConfigurationFingerprint SHALL be independent of the order in which ConfigurationDimension and ConfigurationOption selections are provided.
3. THE ConfigurationFingerprint SHALL normalize equivalent ConfigurationOption values consistently before hashing.
4. WHEN two sets of ConfigurationDimension and ConfigurationOption selections are equivalent after normalization, THE Catalog_Service SHALL produce identical ConfigurationFingerprints.
5. THE ConfigurationFingerprint SHALL produce a 64-character lowercase hexadecimal SHA-256 hash string.
6. THE Catalog_Service SHALL use the ConfigurationFingerprint to prevent duplicate ConfigurationCombination instances within the same ConfigurationDefinition.

### Requirement 8: Configuration Versioning

**User Story:** As a catalog architect, I want configuration versioning, so that configuration definitions can evolve safely without breaking existing references.

#### Acceptance Criteria

1. WHEN a ConfigurationDefinition is created, THE Catalog_Service SHALL assign version 1.
2. WHEN a ConfigurationDefinition's ConfigurationDimension, ConfigurationOption, ConfigurationDependency, or ConfigurationConstraint instances change, THE Catalog_Service SHALL create a new version of the ConfigurationDefinition.
3. WHEN a ConfigurationDefinition changes only its metadata fields without altering dimensions, options, dependencies, or constraints, THE Catalog_Service SHALL preserve the current version number.
4. THE Catalog_Service SHALL maintain a reference from each ConfigurationDefinition version to its predecessor version.
5. THE Catalog_Service SHALL prevent modification of an archived ConfigurationDefinition version.

### Requirement 9: Sparse Combination Enforcement Policy

**User Story:** As a catalog architect, I want a validation policy, so that only explicitly defined combinations may be published and purchased.

#### Acceptance Criteria

1. WHEN a configuration is submitted for validation, THE Configuration_Validation_Policy SHALL verify that the selected ConfigurationOption instances match an explicitly defined ConfigurationCombination.
2. IF a submitted configuration does not match any defined ConfigurationCombination, THEN THE Configuration_Validation_Policy SHALL return a validation error listing the unmatched ConfigurationDimension and ConfigurationOption selections.
3. IF a submitted configuration matches an inactive ConfigurationCombination, THEN THE Configuration_Validation_Policy SHALL return a validation error indicating the combination is inactive.
4. THE Configuration_Validation_Policy SHALL evaluate all ConfigurationDependency and ConfigurationConstraint rules as part of validation.
5. THE Configuration_Validation_Policy SHALL return a structured validation result containing a boolean validity flag and an array of validation errors with field, code, and message.

### Requirement 10: Dependency Resolution Policy

**User Story:** As a catalog architect, I want a dependency resolution policy, so that conditional and dependent option relationships are correctly resolved during validation.

#### Acceptance Criteria

1. WHEN a source ConfigurationOption with a conditional ConfigurationDependency is selected, THE Dependency_Resolution_Policy SHALL filter available target ConfigurationOptions to only those specified by the dependency.
2. WHEN a source ConfigurationOption with a required ConfigurationDependency is selected, THE Dependency_Resolution_Policy SHALL verify that the target ConfigurationOption is also selected.
3. IF two mutually exclusive ConfigurationOption instances are both selected, THEN THE Dependency_Resolution_Policy SHALL return a validation error identifying both ConfigurationOption instances.
4. IF a ConfigurationDependency references a ConfigurationDimension or ConfigurationOption that no longer exists in the ConfigurationDefinition, THEN THE Dependency_Resolution_Policy SHALL return a validation error.
5. THE Dependency_Resolution_Policy SHALL return a structured resolution result containing the filtered available options, required selections, and conflict list.

### Requirement 11: Repository Interface Additions

**User Story:** As a backend developer, I want repository interface additions, so that ConfigurationDefinition entities can be persisted and retrieved through the existing catalog-service domain layer.

#### Acceptance Criteria

1. THE ProductRepository SHALL include a method to save a ConfigurationDefinition entity.
2. THE ProductRepository SHALL include a method to find a ConfigurationDefinition by its unique identifier.
3. THE ProductRepository SHALL include a method to find a ConfigurationDefinition by its associated product identifier.
4. THE ProductRepository SHALL include a method to find a ConfigurationDefinition by its ConfigurationFingerprint.
5. THE ProductRepository SHALL include a method to find all active ConfigurationCombination instances for a given ConfigurationDefinition identifier.
6. THE Catalog_Service SHALL define repository interfaces in the domain layer without coupling to specific persistence implementations.

### Requirement 12: Prisma Schema Additions

**User Story:** As a backend developer, I want Prisma schema additions, so that configuration entities have corresponding database tables with appropriate indexes and constraints.

#### Acceptance Criteria

1. THE Prisma_Schema SHALL include a ConfigurationDefinition model linked to Product via productId with columns for version, status, and fingerprint.
2. THE Prisma_Schema SHALL include a ConfigurationDimension model linked to ConfigurationDefinition with columns for name, selection type, minimum selection, and maximum selection.
3. THE Prisma_Schema SHALL include a ConfigurationOption model linked to ConfigurationDimension with columns for display value, normalized value, sort order, and active status.
4. THE Prisma_Schema SHALL include ConfigurationDependency and ConfigurationConstraint models linked to ConfigurationDefinition with appropriate type and reference columns.
5. THE Prisma_Schema SHALL include a ConfigurationCombination model linked to ConfigurationDefinition with a JSON column for option selections and a fingerprint column.
6. THE Prisma_Schema SHALL include a unique constraint on ConfigurationCombination fingerprint within the same ConfigurationDefinition.
7. THE Prisma_Schema SHALL include indexes on productId, configurationDefinitionId, configurationDimensionId, and fingerprint columns.

### Requirement 13: Property-Based Tests for Fingerprint Determinism

**User Story:** As a quality engineer, I want property-based tests for fingerprint determinism, so that the ConfigurationFingerprint algorithm is verified across arbitrary inputs.

#### Acceptance Criteria

1. THE Test_Suite SHALL include a property-based test verifying that identical ConfigurationOption selections always produce identical ConfigurationFingerprints regardless of selection order.
2. THE Test_Suite SHALL include a property-based test verifying that normalized equivalent ConfigurationOption values produce identical ConfigurationFingerprints.
3. THE Test_Suite SHALL include a property-based test verifying that different ConfigurationOption selections produce different ConfigurationFingerprints.
4. THE Test_Suite SHALL include a property-based test verifying that the ConfigurationFingerprint is a 64-character lowercase hexadecimal string for all valid inputs.

### Requirement 14: Property-Based Tests for Sparse Combination Enforcement

**User Story:** As a quality engineer, I want property-based tests for sparse combination enforcement, so that only explicitly defined combinations are accepted across arbitrary inputs.

#### Acceptance Criteria

1. THE Test_Suite SHALL include a property-based test verifying that any ConfigurationOption selection set matching an explicitly defined ConfigurationCombination passes validation.
2. THE Test_Suite SHALL include a property-based test verifying that any ConfigurationOption selection set not matching an explicitly defined ConfigurationCombination is rejected as invalid.
3. THE Test_Suite SHALL include a property-based test verifying that a ConfigurationCombination marked inactive is rejected by validation.
4. THE Test_Suite SHALL include a property-based test verifying that adding a duplicate ConfigurationCombination (same fingerprint) is rejected.

### Requirement 15: Property-Based Tests for Dependency Resolution

**User Story:** As a quality engineer, I want property-based tests for dependency resolution, so that conditional, required, and mutually exclusive rules are correctly enforced across arbitrary inputs.

#### Acceptance Criteria

1. THE Test_Suite SHALL include a property-based test verifying that selecting a source ConfigurationOption with a conditional dependency filters target ConfigurationOptions to only those specified by the dependency.
2. THE Test_Suite SHALL include a property-based test verifying that selecting a source ConfigurationOption with a required dependency without the target ConfigurationOption produces a validation error.
3. THE Test_Suite SHALL include a property-based test verifying that selecting two mutually exclusive ConfigurationOption instances always produces a validation error.
4. THE Test_Suite SHALL include a property-based test verifying that the Dependency_Resolution_Policy returns consistent results for the same input across multiple invocations (idempotence).

### Requirement 16: Configuration Definition Serialization Round-Trip

**User Story:** As a quality engineer, I want a serialization round-trip test, so that ConfigurationDefinition entities can be serialized and deserialized without loss of information.

#### Acceptance Criteria

1. THE Test_Suite SHALL include a round-trip test verifying that a ConfigurationDefinition serialized to a JSON representation and deserialized back produces an equivalent ConfigurationDefinition.
2. THE Test_Suite SHALL include a round-trip test verifying that ConfigurationCombination option selections serialized to JSON and deserialized back produce an equivalent selection set.
3. THE Test_Suite SHALL include a property-based test verifying that the round-trip property holds for arbitrary valid ConfigurationDefinition instances with varying numbers of dimensions, options, dependencies, and constraints.
