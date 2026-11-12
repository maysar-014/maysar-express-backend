# Requirements Document

## Introduction

The Maysar Commerce Platform's constitution (§3.1) mandates that similar product names alone must never trigger automatic merging. A Galaxy A10 and a Galaxy A10 5G are distinct products and must not be conflated by name similarity alone. Today, `CatalogMatchingEngine.matchProduct()` emits a POSSIBLE match at Jaro-Winkler-like similarity ≥ 0.85 based purely on brand + normalized model string, with no specification evaluation. Although `CatalogMatchingPolicy.canAutoMerge()` already blocks auto-merging of POSSIBLE matches, the engine can still surface incorrect merge suggestions to sellers — and there is no formal guard documenting which criteria must be satisfied before a merge is even proposed, nor any audit trail for match decisions.

This feature introduces a `SpecificationEvaluationGuard` that gates POSSIBLE match emission on multi-dimensional specification evidence, a `MatchAuditRecord` value object that captures the full rationale for every match decision, and a formal `canSuggestMerge()` guard on `CatalogMatchingPolicy` that prevents premature merge suggestions. All changes are confined to the domain layer.

## Glossary

- **Matching_Engine**: `CatalogMatchingEngine` — the domain service that evaluates a product candidate against existing catalog products and returns a `MatchResult`.
- **Matching_Policy**: `CatalogMatchingPolicy` — the domain policy that interprets `MatchResult` values and determines what actions (auto-merge, suggest-merge, create-new) are permissible.
- **Specification_Guard**: `SpecificationEvaluationGuard` — a new domain component that evaluates whether a candidate product's specifications provide sufficient evidence to justify emitting a POSSIBLE match.
- **Specification_Evaluation**: The process of comparing two products across multiple dimensions (model suffix differentiation, category-specific attributes marked `identityRelevant`, critical external identifiers, connectivity/network-tier flags) to determine specification agreement level.
- **Audit_Record**: `MatchAuditRecord` — a new immutable value object that records the complete rationale for a match decision, including match level, evidence criteria, specification evaluation outcome, and a timestamp.
- **POSSIBLE_Match**: A `MatchResult` with `level = MatchLevel.POSSIBLE` — a candidate match based on name/brand similarity that requires seller confirmation and specification evaluation before a merge may be suggested.
- **Merge_Suggestion**: The act of presenting a seller with a POSSIBLE match candidate and recommending merge consideration. Distinct from auto-merge (EXACT/STRONG) and from flagging a match for confirmation.
- **Model_Suffix**: The trailing portion of a product model string that differentiates product tiers or generations (e.g., "5G" in "Galaxy A10 5G", "Pro" in "iPhone 15 Pro", "Plus" in "Pixel 8 Plus"). Model suffixes signal meaningfully different products.
- **Identity_Relevant_Attribute**: A `CategoryAttributeSchema` entry with `identityRelevant: true` — an attribute that contributes to canonical product identity for deduplication purposes.
- **Specification_Agreement_Level**: The outcome of `SpecificationEvaluationGuard`, expressed as one of: `CONFIRMED` (sufficient evidence of same product), `CONTRADICTED` (evidence of different products), or `INSUFFICIENT` (not enough data to determine).
- **Critical_Identifier**: An external product identifier (GTIN, MPN, ISBN) that, when present on both candidate and existing product but differing in value, constitutes definitive evidence of distinct product identity.

---

## Requirements

### Requirement 1: Model Suffix Differentiation

**User Story:** As a platform operator, I want the catalog matching engine to distinguish products whose model numbers differ by a meaningful suffix, so that a Galaxy A10 and a Galaxy A10 5G are never treated as merge candidates based on name similarity alone.

#### Acceptance Criteria

1. WHEN a candidate product model and an existing product model are identical after suffix stripping but differ in their model suffix tokens (e.g., "5G", "Pro", "Plus", "Max", "Lite", "Mini", "Ultra", "Neo", "FE", "SE", "E", "s"), THEN THE Specification_Guard SHALL set Specification_Agreement_Level to `CONTRADICTED` for that pair.
2. WHEN a candidate product model and an existing product model share the same normalized base model string and the same model suffix tokens, THE Specification_Guard SHALL treat model suffix comparison as `CONFIRMED` for that dimension.
3. WHEN a candidate product model contains no suffix tokens and the existing product model contains one or more suffix tokens (or vice versa), THEN THE Specification_Guard SHALL set Specification_Agreement_Level to `CONTRADICTED` for that pair.
4. THE Specification_Guard SHALL treat suffix comparison as case-insensitive and SHALL strip leading/trailing whitespace from each suffix token before comparison.
5. IF the model string of either the candidate or the existing product is absent or empty, THEN THE Specification_Guard SHALL treat model suffix comparison as `INSUFFICIENT` for that dimension rather than `CONFIRMED`.

---

### Requirement 2: Identity-Relevant Attribute Comparison

**User Story:** As a platform operator, I want the catalog matching engine to compare category-specific attributes that are marked as identity-relevant before suggesting a merge, so that products with genuinely different specifications (e.g., different RAM, connectivity tier, or storage) are never merged on name similarity alone.

#### Acceptance Criteria

1. WHEN both the candidate and the existing product have one or more attributes whose schema marks `identityRelevant: true`, THEN THE Specification_Guard SHALL compare the values of all shared identity-relevant attribute keys between the two products.
2. WHEN at least one shared identity-relevant attribute key has differing non-empty values between the candidate and the existing product, THEN THE Specification_Guard SHALL set Specification_Agreement_Level to `CONTRADICTED` for that dimension.
3. WHEN all shared identity-relevant attribute keys have equal values between the candidate and the existing product, AND at least one such attribute was compared, THE Specification_Guard SHALL treat identity-relevant attribute comparison as `CONFIRMED` for that dimension.
4. WHEN neither the candidate nor the existing product provides any identity-relevant attributes, THE Specification_Guard SHALL treat identity-relevant attribute comparison as `INSUFFICIENT` for that dimension.
5. WHILE evaluating identity-relevant attributes, THE Specification_Guard SHALL normalize attribute values (trim whitespace, case-insensitive comparison for string values) before comparing them.

---

### Requirement 3: Critical Identifier Conflict Detection

**User Story:** As a platform operator, I want the catalog matching engine to treat differing external identifiers as definitive evidence of distinct products, so that two products with different GTINs, MPNs, or ISBNs are never presented as merge candidates regardless of name similarity.

#### Acceptance Criteria

1. WHEN both the candidate and the existing product have a non-empty value for the same identifier type (GTIN, MPN, or ISBN) and those values differ, THEN THE Specification_Guard SHALL set Specification_Agreement_Level to `CONTRADICTED` for that dimension.
2. WHEN both the candidate and the existing product have a non-empty value for the same identifier type and those values are equal, THE Specification_Guard SHALL treat critical identifier comparison as `CONFIRMED` for that dimension — note this case escalates the overall match to EXACT and is handled by the existing exact-match cascade, but the guard records it for audit.
3. WHEN only one of the two products has an external identifier (the other has none for that identifier type), THE Specification_Guard SHALL treat critical identifier comparison as `INSUFFICIENT` for that dimension and SHALL NOT use its absence to contradict.
4. IF a GTIN, MPN, or ISBN value on either product is present but malformed (fails normalization), THEN THE Specification_Guard SHALL treat that identifier as absent for comparison purposes and SHALL log the anomaly in the Audit_Record.

---

### Requirement 4: POSSIBLE Match Emission Gate

**User Story:** As a platform operator, I want the catalog matching engine to withhold POSSIBLE match results when specification evaluation contradicts product identity, so that the engine never surfaces a merge suggestion for products that are demonstrably different.

#### Acceptance Criteria

1. WHEN the Matching_Engine computes a brand + model name similarity score ≥ 0.85 and the Specification_Guard evaluates the pair, THE Matching_Engine SHALL only emit a `MatchResult` with `level = MatchLevel.POSSIBLE` if the overall Specification_Agreement_Level is `CONFIRMED` or `INSUFFICIENT`.
2. WHEN the Specification_Guard returns `CONTRADICTED` for any evaluated dimension, THEN THE Matching_Engine SHALL return `MatchResult.noMatch()` rather than a POSSIBLE match, regardless of the name similarity score.
3. WHEN the Specification_Guard returns `INSUFFICIENT` across all evaluated dimensions (no confirmatory or contradictory evidence exists), THE Matching_Engine SHALL emit a POSSIBLE match with `requiresConfirmation: true` and SHALL include the `INSUFFICIENT` evaluation outcome in the associated Audit_Record.
4. THE Matching_Engine SHALL NOT change the behavior of EXACT or STRONG match levels — the specification guard applies exclusively to the POSSIBLE match cascade.
5. WHEN more than one existing product passes the name similarity threshold for the same candidate, THE Matching_Engine SHALL evaluate each candidate pair independently through the Specification_Guard and SHALL return only the highest-scoring non-contradicted result.

---

### Requirement 5: MatchAuditRecord Value Object

**User Story:** As a platform operator, I want every match decision to be accompanied by an immutable audit record explaining why it was made, so that merge decisions are traceable and reviewable without relying on external logging infrastructure.

#### Acceptance Criteria

1. THE Matching_Engine SHALL produce a `MatchAuditRecord` for every match decision it returns, including NO_MATCH results.
2. THE Audit_Record SHALL capture: the match level assigned, the name similarity score (where computed), the Specification_Agreement_Level (where evaluated), a structured list of evaluated evidence dimensions with their individual outcomes (`CONFIRMED`, `CONTRADICTED`, or `INSUFFICIENT`), the product IDs of both the candidate (if available) and the matched product (if any), and a UTC timestamp of the decision.
3. THE Audit_Record SHALL be immutable once constructed — THE Audit_Record SHALL NOT expose any mutation methods.
4. THE Matching_Engine SHALL attach the Audit_Record to the `MatchResult` value object so that callers receive both the decision and its rationale in a single return value.
5. WHEN the match level is NO_MATCH because Specification_Guard returned `CONTRADICTED`, THE Audit_Record SHALL record the specific dimension(s) that produced the contradiction and the evidence values that triggered it.
6. THE Audit_Record SHALL be serializable to a plain JSON-compatible object via a `toJSON()` method for downstream persistence or event emission.

---

### Requirement 6: Formal Merge Suggestion Guard on CatalogMatchingPolicy

**User Story:** As a platform operator, I want the catalog matching policy to expose a formal `canSuggestMerge()` method that validates specification criteria before a merge is proposed to a seller, so that the policy layer provides an explicit, documented checkpoint that cannot be bypassed.

#### Acceptance Criteria

1. THE Matching_Policy SHALL expose a static method `canSuggestMerge(matchResult: MatchResult, auditRecord: MatchAuditRecord): boolean`.
2. WHEN `canSuggestMerge` is called with a `MatchResult` whose level is EXACT or STRONG, THE Matching_Policy SHALL return `true` — these levels already imply sufficient evidence.
3. WHEN `canSuggestMerge` is called with a `MatchResult` whose level is POSSIBLE and the associated Audit_Record shows Specification_Agreement_Level `CONTRADICTED`, THE Matching_Policy SHALL return `false`.
4. WHEN `canSuggestMerge` is called with a `MatchResult` whose level is POSSIBLE and the associated Audit_Record shows Specification_Agreement_Level `CONFIRMED` or `INSUFFICIENT`, THE Matching_Policy SHALL return `true` — the seller will be asked to confirm.
5. WHEN `canSuggestMerge` is called with a `MatchResult` whose level is NO_MATCH, THE Matching_Policy SHALL return `false`.
6. THE Matching_Policy SHALL preserve all existing methods (`canAutoMerge`, `requiresSellerConfirmation`, `shouldCreateNewProduct`) without change — `canSuggestMerge` is an addition, not a replacement.

---

### Requirement 7: Property-Based Safeguard Invariants

**User Story:** As a platform engineer, I want property-based tests that verify the core safety invariants of the catalog matching safeguards, so that no future change to the matching engine or policy can silently reintroduce name-similarity-only merging.

#### Acceptance Criteria

1. FOR ALL pairs of products where the candidate model and existing model differ by at least one recognized model suffix token, THE Matching_Engine SHALL never return a `MatchResult` with `level = MatchLevel.POSSIBLE` or higher — this is the primary safety invariant.
2. FOR ALL pairs of products where both products carry the same identifier type (GTIN, MPN, or ISBN) with differing non-empty values, THE Matching_Engine SHALL never return a `MatchResult` with `level = MatchLevel.POSSIBLE` — conflicting identifiers must always produce NO_MATCH when similarity-based matching is the only active cascade.
3. FOR ALL `MatchResult` values produced by THE Matching_Engine, a corresponding Audit_Record SHALL be present and non-null — the audit trail completeness invariant.
4. FOR ALL `MatchResult` values where `canSuggestMerge()` returns `true`, the associated Audit_Record SHALL never show Specification_Agreement_Level `CONTRADICTED` — the policy consistency invariant.
5. FOR ALL `MatchResult` values where `shouldAutoMerge()` returns `true`, the match level SHALL be EXACT or STRONG — auto-merge invariant preserved from prior behavior.
