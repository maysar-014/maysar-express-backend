# Implementation Plan: catalog-matching-safeguards

## Overview

Adds a specification-evidence gate (SpecificationEvaluationGuard) to the POSSIBLE match cascade in CatalogMatchingEngine, an immutable MatchAuditRecord value object, and a formal `canSuggestMerge()` method on CatalogMatchingPolicy. All changes are domain-layer only. No API, Prisma schema, or application layer is modified.

## Tasks

- [x] 1. Create MatchAuditRecord value object
  - File: `services/catalog-service/src/domain/value-objects/match-audit-record.value-object.ts`
  - Create immutable `MatchAuditRecord` class with `Object.freeze()` in constructor
  - Fields: `matchLevel`, `similarityScore?`, `agreementLevel?`, `dimensions?`, `candidateProductId?`, `matchedProductId?`, `decidedAt`
  - Define interfaces: `AuditDimensions`, `MatchAuditRecordProps`, `DimensionResult` (re-export from guard once guard exists — initially define locally)
  - Implement `toJSON()` returning a plain JSON-compatible object with `decidedAt` as ISO string
  - _Requirements: 5.1, 5.2, 5.3, 5.6_

- [x] 2. Add `auditRecord` field to MatchResult
  - File: `services/catalog-service/src/domain/value-objects/match-result.value-object.ts`
  - Import `MatchAuditRecord` from the new value object file
  - Add `auditRecord?: MatchAuditRecord` to `MatchResultProps` interface and `MatchResult` class
  - Update `static noMatch(auditRecord?: MatchAuditRecord): MatchResult` factory to accept and pass through the optional audit record
  - All other existing methods and fields unchanged
  - _Requirements: 5.4_

- [x] 3. Create SpecificationEvaluationGuard
  - File: `services/catalog-service/src/domain/engines/specification-evaluation-guard.ts`
  - Define types: `DimensionOutcome` ('CONFIRMED' | 'CONTRADICTED' | 'INSUFFICIENT'), `DimensionResult` ({ outcome, evidence }), `SpecificationEvaluationResult`, `CategoryAttributeSchema` ({ key, identityRelevant })
  - Implement `static readonly SUFFIX_TOKENS: ReadonlySet<string>` = new Set(['5g', 'pro', 'plus', 'max', 'lite', 'mini', 'ultra', 'neo', 'fe', 'se', 'e', 's'])
  - Implement `static evaluate(candidate, existing, attributeSchemas)`: calls all three dimension evaluators, returns composite agreement level (CONTRADICTED wins)
  - Implement `static evaluateModelSuffix(candidateModel, existingModel)`: extract suffix tokens, compare sets — CONFIRMED if equal, CONTRADICTED if different, INSUFFICIENT if either empty
  - Implement `static extractSuffixTokens(model)`: normalize text, split, return set of recognized suffix tokens
  - Implement `static evaluateIdentityAttributes(candidateAttrs, existingAttrs, schemas)`: find shared identityRelevant keys, compare normalized values — CONTRADICTED on any mismatch, CONFIRMED if all agree, INSUFFICIENT if no shared keys
  - Implement `static evaluateCriticalIdentifiers(candidate, existing)`: check GTIN/MPN/ISBN pairs — CONTRADICTED on mismatch, CONFIRMED on match, INSUFFICIENT if no shared types
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4_

- [ ] 4. Wire SpecificationEvaluationGuard into CatalogMatchingEngine
  - File: `services/catalog-service/src/domain/engines/catalog-matching.engine.ts`
  - Add optional third parameter `attributeSchemas: CategoryAttributeSchema[] = []` to `matchProduct()`
  - Import `SpecificationEvaluationGuard` and `CategoryAttributeSchema` from the guard file
  - Import `MatchAuditRecord` from match-audit-record value object
  - In EXACT match path: attach `MatchAuditRecord({ matchLevel: MatchLevel.EXACT, matchedProductId, decidedAt: new Date() })` to returned MatchResult
  - In STRONG match path: attach `MatchAuditRecord({ matchLevel: MatchLevel.STRONG, matchedProductId, decidedAt: new Date() })` to returned MatchResult
  - In POSSIBLE match path: call `SpecificationEvaluationGuard.evaluate(candidate, existing, attributeSchemas)` after similarity ≥ 0.85 check. If `agreementLevel === 'CONTRADICTED'`, skip this candidate (continue). Otherwise build MatchResult with audit record including specResult dimensions.
  - In NO_MATCH fallback: return `MatchResult.noMatch(new MatchAuditRecord({ matchLevel: MatchLevel.NO_MATCH, decidedAt: new Date() }))`
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5. Add `canSuggestMerge()` to CatalogMatchingPolicy
  - File: `services/catalog-service/src/domain/policies/catalog-matching.policy.ts`
  - Import `MatchAuditRecord` from value object file
  - Add `static canSuggestMerge(matchResult: MatchResult, auditRecord: MatchAuditRecord): boolean`
  - Implementation: return `true` for EXACT/STRONG, `false` for NO_MATCH, for POSSIBLE return `auditRecord.agreementLevel !== 'CONTRADICTED'`
  - All existing methods (`canAutoMerge`, `requiresSellerConfirmation`, `shouldCreateNewProduct`) unchanged
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ] 6. Checkpoint — verify diagnostics on all changed files
  - Ensure no TypeScript errors on: match-audit-record, match-result, specification-evaluation-guard, catalog-matching.engine, catalog-matching.policy
  - Ensure all existing tests in `services/catalog-service/src/domain/engines/` still pass

- [x]* 7. Write property-based and unit tests
  - File: `services/catalog-service/src/domain/engines/__tests__/catalog-matching-safeguards.properties.test.ts`
  - Use hand-rolled `forAll(100, generator, property)` pattern
  - Build minimal in-memory Product stub and ProductCandidate for generators
  - **Property 1: Suffix Mismatch Safety Invariant** (100 iterations) — candidate and existing have same brand but different suffix sets; assert result.level === NO_MATCH
    - _// Feature: catalog-matching-safeguards, Property 1: Suffix Mismatch Safety Invariant_
    - **Validates: Requirements 1.1, 1.3, 4.2, 7.1**
  - **Property 2: Suffix Agreement Confirmation** (100 iterations) — call evaluateModelSuffix(model, model); assert outcome === 'CONFIRMED'
    - _// Feature: catalog-matching-safeguards, Property 2: Suffix Agreement Confirmation_
    - **Validates: Requirements 1.2, 1.4**
  - **Property 3: Critical Identifier Conflict Suppresses POSSIBLE** (100 iterations) — same brand+model (similarity=1), different GTIN; assert result.level === NO_MATCH
    - _// Feature: catalog-matching-safeguards, Property 3: Critical Identifier Conflict Suppresses POSSIBLE_
    - **Validates: Requirements 3.1, 4.2, 7.2**
  - **Property 4: Audit Trail Completeness** (100 iterations) — arbitrary products; assert result.auditRecord is defined and matches result.level
    - _// Feature: catalog-matching-safeguards, Property 4: Audit Trail Completeness_
    - **Validates: Requirements 5.1, 5.2, 5.4, 7.3**
  - **Property 5: Policy Consistency** (100 iterations) — if canSuggestMerge returns true, assert agreementLevel !== 'CONTRADICTED'
    - _// Feature: catalog-matching-safeguards, Property 5: Policy Consistency_
    - **Validates: Requirements 6.2, 6.3, 6.4, 6.5, 7.4**
  - **Property 6: Auto-Merge Level Invariant** (100 iterations) — if shouldAutoMerge() is true, assert level is EXACT or STRONG
    - _// Feature: catalog-matching-safeguards, Property 6: Auto-Merge Level Invariant_
    - **Validates: Requirement 7.5**
  - **Property 7: AuditRecord Serialization Round-Trip** (100 iterations) — toJSON() → JSON.stringify → JSON.parse produces deeply equal object
    - _// Feature: catalog-matching-safeguards, Property 7: AuditRecord Serialization Round-Trip_
    - **Validates: Requirement 5.6**
  - **Property 8: Identity-Relevant Attribute Contradiction** (100 iterations) — shared identityRelevant key with different values; assert evaluateIdentityAttributes returns 'CONTRADICTED'
    - _// Feature: catalog-matching-safeguards, Property 8: Identity-Relevant Attribute Contradiction_
    - **Validates: Requirements 2.1, 2.2, 2.5**
  - Also write example-based unit tests: EXACT/STRONG audit record regression, MatchAuditRecord freeze/mutation, canSuggestMerge edge cases, empty model string → INSUFFICIENT

- [x] 8. Final checkpoint — all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional but included for safety coverage
- `MatchAuditRecord` uses `Object.freeze()` — tests in strict mode can verify no mutation
- Engine's `matchProduct` signature is backward-compatible (third param defaults to `[]`)
- `DimensionResult` and `DimensionOutcome` types are defined in `specification-evaluation-guard.ts` and imported by `match-audit-record.value-object.ts`
