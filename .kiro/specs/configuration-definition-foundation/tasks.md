# Implementation Plan: Configuration Definition Foundation

## Overview

This plan implements Phase 1 Foundation of the MUVA architecture within the catalog-service domain layer. It delivers the ConfigurationDefinition aggregate root, supporting value objects (ConfigurationDimension, ConfigurationOption, ConfigurationFingerprint), the ConfigurationFingerprintAlgorithm, domain policies (ConfigurationValidationPolicy, DependencyResolutionPolicy), the ConfigurationDefinitionRepository interface, Prisma schema additions, and property-based tests using the hand-rolled `forAll` pattern (100 iterations per property).

Tasks are ordered so dependencies are built first: value objects and algorithm before the entity, entity before policies, all domain code before tests. Prisma schema and repository interface can be done in parallel with domain code.

## Tasks

- [ ] 1. Implement configuration value objects and fingerprint algorithm
  - [x] 1.1 Create ConfigurationDimension value object
    - File: `services/catalog-service/src/domain/value-objects/configuration-dimension.value-object.ts`
    - Implement `ConfigurationDimension` class with `public readonly` fields, constructor validation (empty name, negative minSelections, maxSelections < minSelections), `toJSON`/`fromJSON` static factory, `isSelectable()`, `isCustomerDefined()`, `isRequired()` helpers
    - Define `SelectionType` (`'selectable' | 'customer_defined'`), `SelectionMode` (`'single' | 'multiple'`), and `ConfigurationDimensionData` interface
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 1.2 Create ConfigurationOption value object
    - File: `services/catalog-service/src/domain/value-objects/configuration-option.value-object.ts`
    - Implement `ConfigurationOption` class importing `NormalizationAlgorithm` from existing `../algorithms/normalization.algorithm`
    - Normalize `displayValue` at construction time if `normalizedValue` not provided; validate non-empty displayValue
    - Implement `toJSON`/`fromJSON`, `isActive()`, and static `areEquivalent(a, b)` for duplicate detection via normalized value comparison
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 1.3 Create ConfigurationFingerprintAlgorithm
    - File: `services/catalog-service/src/domain/algorithms/configuration-fingerprint.algorithm.ts`
    - Implement `ConfigurationFingerprintInput` interface (`configurationDefinitionId`, `selections: Record<string, string[]>`)
    - Implement `generateFingerprint()`: sort dimension IDs alphabetically, sort option values within each dimension, normalize each value via `NormalizationAlgorithm.normalizeText()`, build canonical string `dimId:opt1|opt2;dimId2:opt3|opt4`, SHA-256 hash to 64-char lowercase hex
    - Implement `validateFingerprint()` regex check: `/^[a-f0-9]{64}$/`
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

  - [x] 1.4 Create ConfigurationFingerprint value object
    - File: `services/catalog-service/src/domain/value-objects/configuration-fingerprint.value-object.ts`
    - Import `ConfigurationFingerprintAlgorithm` and `ConfigurationFingerprintInput` from the algorithm file
    - Implement `ConfigurationFingerprint` class with `value`, `version`, `configurationDefinitionId` readonly fields
    - Implement static `generate(input)` factory that delegates to `ConfigurationFingerprintAlgorithm.generateFingerprint()`
    - Implement `matches(other)` for equality comparison and `toString()` returning the hex value
    - _Requirements: 7.1, 7.4, 7.6_

  - [ ]* 1.5 Write property test: fingerprint order independence
    - File: `services/catalog-service/src/domain/value-objects/__tests__/configuration-fingerprint.properties.test.ts`
    - **Property 1: Order Independence** — identical selections in different dimension/value orders produce identical fingerprints
    - **Validates: Requirements 13.1**
    - Use `forAll(100, ...)` generator pattern with shuffled dimension IDs and option values

  - [ ]* 1.6 Write property test: fingerprint normalized equivalence
    - File: `services/catalog-service/src/domain/value-objects/__tests__/configuration-fingerprint.properties.test.ts`
    - **Property 2: Normalized Equivalence** — options with different display values but equivalent normalized values produce identical fingerprints
    - **Validates: Requirements 13.2**

  - [ ]* 1.7 Write property test: fingerprint distinctness
    - File: `services/catalog-service/src/domain/value-objects/__tests__/configuration-fingerprint.properties.test.ts`
    - **Property 3: Distinctness** — different option selections always produce different fingerprints
    - **Validates: Requirements 13.3**

  - [ ]* 1.8 Write property test: fingerprint format invariant
    - File: `services/catalog-service/src/domain/value-objects/__tests__/configuration-fingerprint.properties.test.ts`
    - **Property 4: Format Invariant** — fingerprint is always a 64-character lowercase hexadecimal string for all valid inputs
    - **Validates: Requirements 13.4**

- [x] 2. Implement ConfigurationDefinition aggregate root entity
  - [x] 2.1 Create core entity with dimension and option management
    - File: `services/catalog-service/src/domain/entities/configuration-definition.entity.ts`
    - Define types: `ConfigurationDefinitionStatus`, `DependencyType`, `ConstraintType`
    - Define data interfaces: `ConfigurationDependencyData`, `ConfigurationConstraintData`, `ConfigurationCombinationData`, `ConfigurationDefinitionData`
    - Implement `ConfigurationDefinition` class with private Maps for dimensions/options, arrays for dependencies/constraints/combinations
    - Implement constructor, getters (`getId`, `getProductId`, `getVersion`, `getStatus`, `getDimensions`, `getOptions`, `getOptionsForDimension`), `static create(productId)` factory
    - Implement `addDimension()` with archived check and duplicate name rejection (case-insensitive)
    - Implement `addOption()` with archived check, dimension existence validation, and duplicate normalized value rejection within same dimension
    - Import and use `DomainError` from `../errors/domain.error` for all validation errors
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.5, 3.1, 3.4, 3.5_

  - [x] 2.2 Implement dependency and constraint management
    - In file: `services/catalog-service/src/domain/entities/configuration-definition.entity.ts`
    - Implement `addDependency()` with archived check and `validateDependencyReferences()` (source dimension, source option, target dimension, all target options must exist within same definition)
    - Implement `addConstraint()` with archived check and `validateConstraintReferences()` (source and target options must exist)
    - Implement `getDependencies()`, `getConstraints()` getters returning defensive copies
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.4_

  - [x] 2.3 Implement combination management with fingerprint and duplicate detection
    - In file: `services/catalog-service/src/domain/entities/configuration-definition.entity.ts`
    - Implement `addCombination()` with archived check, per-option dimension membership validation (option exists and belongs to its referenced dimension)
    - Generate fingerprint via `ConfigurationFingerprint.generate()` using `resolveSelectionsToFingerprintInput()` (maps option IDs to normalized values)
    - Reject duplicate combinations by fingerprint within the same definition
    - Implement `getCombinations()`, `getActiveCombinations()` getters
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.6_

  - [x] 2.4 Implement versioning logic
    - In file: `services/catalog-service/src/domain/entities/configuration-definition.entity.ts`
    - Implement `isStructuralChange(other)`: compare dimensions, options, dependencies, constraints via deep JSON comparison; return true if any differ
    - Implement `createNewVersion()`: create new `ConfigurationDefinition` with incremented version, `draft` status, predecessor reference, and copied structural elements
    - Implement `getPredecessorVersionId()` getter
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 2.5 Implement lifecycle transitions
    - In file: `services/catalog-service/src/domain/entities/configuration-definition.entity.ts`
    - Implement `transitionTo(newStatus)`: reject transitions from `archived`, call `validateForActivation()` when transitioning to `active`
    - Implement `validateForActivation()`: require at least one dimension, one option, and one combination
    - _Requirements: 1.3, 1.4, 1.5, 8.5_

  - [x] 2.6 Implement serialization and pure functions for PBT
    - In file: `services/catalog-service/src/domain/entities/configuration-definition.entity.ts`
    - Implement `toJSON()`: serialize all fields including dimensions/options mapped via their `toJSON()`, dependencies/constraints/combinations as arrays, dates as ISO strings
    - Implement `static fromJSON(data)`: reconstruct entity with dimensions/options via their `fromJSON()`, restore dependencies/constraints/combinations
    - Export pure functions: `validateCombination(selections, combinations)`, `serializeConfigurationDefinition(data)`, `deserializeConfigurationDefinition(json)`, `configurationDefinitionsEqual(a, b)`
    - _Requirements: 16.1, 16.2_

  - [ ]* 2.7 Write serialization round-trip test: ConfigurationDefinition JSON
    - File: `services/catalog-service/src/domain/entities/__tests__/configuration-definition-serialization.test.ts`
    - Verify that a ConfigurationDefinition serialized via `toJSON()` and deserialized via `fromJSON()` produces an equivalent entity (all fields match including nested dimensions, options, dependencies, constraints, combinations)
    - **Validates: Requirements 16.1**

  - [ ]* 2.8 Write serialization round-trip test: combination option selections
    - File: `services/catalog-service/src/domain/entities/__tests__/configuration-definition-serialization.test.ts`
    - Verify that ConfigurationCombination option selections (dimensionId → optionIds map) serialized to JSON and deserialized back produce an equivalent selection set
    - **Validates: Requirements 16.2**

  - [ ]* 2.9 Write property test: round-trip for arbitrary definitions
    - File: `services/catalog-service/src/domain/entities/__tests__/configuration-definition-serialization.test.ts`
    - **Property 3: Round-Tip Consistency** — `configurationDefinitionsEqual(serialize→deserialize, original)` holds for arbitrary valid ConfigurationDefinition instances with varying numbers of dimensions, options, dependencies, and constraints
    - **Validates: Requirements 16.3**
    - Use `forAll(100, ...)` generator producing random definitions with 1-5 dimensions, 2-10 options per dimension, 0-3 dependencies, 0-3 constraints, 1-5 combinations

- [x] 3. Implement domain policies
  - [x] 3.1 Create DependencyResolutionPolicy
    - File: `services/catalog-service/src/domain/policies/dependency-resolution.policy.ts`
    - Import `ConfigurationDefinitionData`, `ConfigurationDependencyData` from entity file
    - Define `DependencyConflict` and `DependencyResolutionResult` interfaces (filteredOptions, requiredSelections, conflicts, staleReferences)
    - Implement `static resolve(selections, definition)`: build option/dimension lookup sets, evaluate each dependency type:
      - `conditional`: if source selected, filter target dimension options to only specified target options
      - `required`: if source selected, add missing target options to requiredSelections
      - `mutually_exclusive`: if both source and target selected, add to conflicts
      - `dependent`/`optional`: no enforcement in this phase
    - Detect stale references (dependencies pointing to non-existent dimensions/options) and add to staleReferences
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 3.2 Create ConfigurationValidationPolicy
    - File: `services/catalog-service/src/domain/policies/configuration-validation.policy.ts`
    - Import `ConfigurationDefinitionData` from entity file, `DependencyResolutionPolicy` from dependency policy file
    - Define `ValidationFieldError` (field, code, message) and `ConfigurationValidationResult` (valid, errors) interfaces
    - Implement `static validate(selections, definition)`:
      1. Find matching combination by comparing normalized selections against each combination's option selections
      2. If no match, return error with unmatched selections listing (code `NO_MATCHING_COMBINATION`)
      3. If matched combination is inactive, add error (code `INACTIVE_COMBINATION`)
      4. Delegate to `DependencyResolutionPolicy.resolve()` and add conflicts as errors
      5. Evaluate constraints (`requires`, `excludes`, `incompatible_with`, `compatible_with`) and add violations
      6. Return `{ valid: errors.length === 0, errors }`
    - Implement private helpers: `findMatchingCombination()`, `selectionsEqual()` (order-independent comparison), `evaluateConstraints()`, `formatUnmatchedSelections()`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 5.3_

  - [ ]* 3.3 Write property test: conditional dependency filters target options
    - File: `services/catalog-service/src/domain/policies/__tests__/dependency-resolution.properties.test.ts`
    - **Property 1: Conditional Filtering** — selecting a source option with a conditional dependency filters target dimension options to only those specified by the dependency
    - **Validates: Requirements 15.1**
    - Use `forAll(100, ...)` with random definitions containing conditional dependencies

  - [ ]* 3.4 Write property test: required dependency validation error
    - File: `services/catalog-service/src/domain/policies/__tests__/dependency-resolution.properties.test.ts`
    - **Property 2: Required Enforcement** — selecting a source option with a required dependency without the target option produces a validation error
    - **Validates: Requirements 15.2**
    - Use `forAll(100, ...)` with random definitions containing required dependencies

  - [ ]* 3.5 Write property test: mutually exclusive conflict detection
    - File: `services/catalog-service/src/domain/policies/__tests__/dependency-resolution.properties.test.ts`
    - **Property 3: Mutual Exclusion** — selecting two mutually exclusive options always produces a validation error identifying both options
    - **Validates: Requirements 15.3**
    - Use `forAll(100, ...)` with random definitions containing mutually_exclusive dependencies

  - [ ]* 3.6 Write property test: dependency resolution idempotence
    - File: `services/catalog-service/src/domain/policies/__tests__/dependency-resolution.properties.test.ts`
    - **Property 4: Idempotence** — DependencyResolutionPolicy returns consistent results for the same input across multiple invocations
    - **Validates: Requirements 15.4**
    - Use `forAll(100, ...)` calling `resolve()` twice with same input and asserting deep equality

  - [ ]* 3.7 Write property test: matching combination passes validation
    - File: `services/catalog-service/src/domain/policies/__tests__/configuration-validation.properties.test.ts`
    - **Property 1: Valid Combination Accepted** — any option selection set matching an explicitly defined active ConfigurationCombination passes validation
    - **Validates: Requirements 14.1**
    - Use `forAll(100, ...)` generating random definitions with active combinations and submitting matching selections

  - [ ]* 3.8 Write property test: non-matching combination rejected
    - File: `services/catalog-service/src/domain/policies/__tests__/configuration-validation.properties.test.ts`
    - **Property 2: Invalid Combination Rejected** — any option selection set not matching any defined ConfigurationCombination is rejected as invalid
    - **Validates: Requirements 14.2**
    - Use `forAll(100, ...)` generating random selections that don't match any combination

  - [ ]* 3.9 Write property test: inactive combination rejected
    - File: `services/catalog-service/src/domain/policies/__tests__/configuration-validation.properties.test.ts`
    - **Property 3: Inactive Combination Rejected** — a ConfigurationCombination marked inactive is rejected by validation even if selections match
    - **Validates: Requirements 14.3**
    - Use `forAll(100, ...)` generating definitions with inactive combinations

  - [ ]* 3.10 Write property test: duplicate combination rejected
    - File: `services/catalog-service/src/domain/policies/__tests__/configuration-validation.properties.test.ts`
    - **Property 4: Duplicate Prevention** — adding a duplicate ConfigurationCombination (same fingerprint) is rejected
    - **Validates: Requirements 14.4**
    - Use `forAll(100, ...)` generating duplicate combinations and verifying rejection

- [x] 4. Implement infrastructure interfaces and Prisma schema
  - [x] 4.1 Add ConfigurationDefinitionRepository interface to interfaces.ts
    - File: `services/catalog-service/src/domain/interfaces.ts` (MODIFIED — append)
    - Add `ConfigurationDefinitionRepository` interface with methods:
      - `saveConfigurationDefinition(definition)`: Promise
      - `findConfigurationDefinitionById(id)`: Promise
      - `findConfigurationDefinitionByProductId(productId)`: Promise
      - `findConfigurationDefinitionByFingerprint(fingerprint)`: Promise
      - `findActiveCombinations(configurationDefinitionId)`: Promise
    - Match existing interface style (use `DomainRecord` type pattern from existing interfaces)
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [x] 4.2 Add Prisma schema models and enums
    - File: `prisma/schema.prisma` (MODIFIED — append)
    - Add 5 enums: `Catalog_ConfigurationStatus` (draft, active, archived), `Catalog_SelectionType` (selectable, customer_defined), `Catalog_SelectionMode` (single, multiple), `Catalog_DependencyType` (conditional, dependent, mutually_exclusive, required, optional), `Catalog_ConstraintType` (requires, excludes, compatible_with, incompatible_with)
    - Add `ConfigurationDefinition` model: id, productId, version, status, predecessorVersionId, dimensions/options/dependencies/constraints as Json, createdAt, updatedAt, relation to Product, relation to ConfigurationCombination, unique on [productId, version], indexes on productId, status, predecessorVersionId
    - Add `ConfigurationCombination` model: id, configurationDefinitionId, optionSelections as Json, fingerprint (VarChar 64), active, createdAt, relation to ConfigurationDefinition, unique on [configurationDefinitionId, fingerprint], indexes on configurationDefinitionId, fingerprint, active
    - Use cascade deletes: Product → ConfigurationDefinition → ConfigurationCombination
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

- [x] 5. Checkpoint — ensure all implementation compiles and non-optional tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Final checkpoint — ensure all tests pass including property-based tests
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property-based tests use the hand-rolled `forAll(count, generator, property)` pattern from `review-properties.test.ts` with 100 iterations per property
- Value objects use `// @ts-nocheck` and `public readonly` fields matching existing `product.entity.ts` and `ids.value-object.ts` conventions
- Domain policies use static methods on classes matching existing `ProductQualityPolicy` convention
- Pure functions exported from entity file for PBT testability matching `product-review.entity.ts` pattern
- All files use TypeScript as specified in the design document
