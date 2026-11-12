// @ts-nocheck
/**
 * Catalog Matching Safeguards — Property-Based Tests
 *
 * Verifies the 8 correctness properties of the specification-evaluation
 * gate, audit trail, and policy consistency. No database required.
 *
 * Feature: catalog-matching-safeguards
 */

import { CatalogMatchingEngine } from '../catalog-matching.engine';
import { SpecificationEvaluationGuard } from '../specification-evaluation-guard';
import { CatalogMatchingPolicy } from '../../policies/catalog-matching.policy';
import { MatchAuditRecord } from '../../value-objects/match-audit-record.value-object';
import { MatchResult, MatchLevel } from '../../value-objects/match-result.value-object';

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  return Math.random().toString(36).slice(2, 8);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Returns a random non-empty subset of SUFFIX_TOKENS */
function randomSuffixSubset(minSize = 0): Set<string> {
  const tokens = [...SpecificationEvaluationGuard.SUFFIX_TOKENS];
  const size = randomInt(minSize, tokens.length);
  const shuffled = [...tokens].sort(() => Math.random() - 0.5);
  return new Set(shuffled.slice(0, size));
}

/** Build a model string from a base + suffix set */
function buildModel(base: string, suffixes: Set<string>): string {
  return [base, ...[...suffixes]].join(' ').trim();
}

/** Minimal in-memory Product stub satisfying the engine's interface */
function makeProductStub(opts: {
  brand: string;
  model?: string;
  categoryId: string;
  attributes?: Record<string, unknown>;
  gtin?: string;
  mpn?: string;
  isbn?: string;
  id?: string;
}): any {
  return {
    getId:          () => ({ toString: () => opts.id ?? `prod-${randomSuffix()}` }),
    getBrand:       () => opts.brand,
    getModel:       () => opts.model ?? '',
    getCategoryId:  () => ({ toString: () => opts.categoryId }),
    getFingerprint: () => undefined,
    getIdentifiers: () =>
      opts.gtin || opts.mpn || opts.isbn
        ? {
            hasAnyIdentifier: () => !!(opts.gtin || opts.mpn || opts.isbn),
            equals:           () => false,
            gtin: opts.gtin,
            mpn:  opts.mpn,
            isbn: opts.isbn,
          }
        : undefined,
    getAttributes:  () => opts.attributes ?? {},
  };
}

/** Minimal ProductCandidate */
function makeCandidate(opts: {
  brand: string;
  model: string;
  categoryId: string;
  attributes?: Record<string, unknown>;
  gtin?: string;
  mpn?: string;
  isbn?: string;
}): any {
  return {
    brand:       opts.brand,
    model:       opts.model,
    categoryId:  opts.categoryId,
    attributes:  opts.attributes,
    identifiers: opts.gtin || opts.mpn || opts.isbn
      ? {
          hasAnyIdentifier: () => true,
          equals: () => false,
          gtin: opts.gtin,
          mpn:  opts.mpn,
          isbn: opts.isbn,
        }
      : undefined,
  };
}

// ── Property 1: Suffix Mismatch Safety Invariant
// Feature: catalog-matching-safeguards, Property 1: Suffix Mismatch Safety Invariant
// Validates: Requirements 1.1, 1.3, 4.2, 7.1
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 1: Suffix Mismatch Safety Invariant', () => {
  it('should return NO_MATCH when candidate and existing models have different suffix token sets', () => {
    forAll(
      100,
      () => {
        const brand = `brand-${randomSuffix()}`;
        const cat   = `cat-${randomSuffix()}`;
        const base  = `Galaxy A${randomInt(10, 99)}`; // shared base — forces high similarity

        // Get two distinct suffix sets
        let suffixA: Set<string>;
        let suffixB: Set<string>;
        do {
          suffixA = randomSuffixSubset(0);
          suffixB = randomSuffixSubset(0);
        } while (
          // retry if sets are equal
          suffixA.size === suffixB.size && [...suffixA].every(t => suffixB.has(t))
        );

        const candidate = makeCandidate({ brand, model: buildModel(base, suffixA), categoryId: cat });
        const existing  = makeProductStub({ brand, model: buildModel(base, suffixB), categoryId: cat });
        return { candidate, existing };
      },
      ({ candidate, existing }) => {
        const result = CatalogMatchingEngine.matchProduct(candidate, [existing]);
        expect(result.level).toBe(MatchLevel.NO_MATCH);
      }
    );
  });
});

// ── Property 2: Suffix Agreement Confirmation
// Feature: catalog-matching-safeguards, Property 2: Suffix Agreement Confirmation
// Validates: Requirements 1.2, 1.4
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 2: Suffix Agreement Confirmation', () => {
  it('should return CONFIRMED when both model strings have the same suffix tokens', () => {
    forAll(
      100,
      () => {
        const suffixes = randomSuffixSubset(0);
        const model = buildModel(`Model-${randomSuffix()}`, suffixes);
        return model;
      },
      (model) => {
        const result = SpecificationEvaluationGuard.evaluateModelSuffix(model, model);
        expect(result.outcome).toBe('CONFIRMED');
      }
    );
  });
});

// ── Property 3: Critical Identifier Conflict Suppresses POSSIBLE
// Feature: catalog-matching-safeguards, Property 3: Critical Identifier Conflict Suppresses POSSIBLE
// Validates: Requirements 3.1, 4.2, 7.2
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 3: Critical Identifier Conflict Suppresses POSSIBLE', () => {
  it('should return NO_MATCH when both products have the same identifier type with different values', () => {
    forAll(
      100,
      () => {
        const brand = `Samsung`;
        const model = `Galaxy A50`; // identical — ensures similarity = 1.0
        const cat   = `cat-${randomSuffix()}`;

        const idType = pick(['gtin', 'mpn'] as const);
        const valueA = `ID-${randomSuffix()}`;
        let valueB: string;
        do { valueB = `ID-${randomSuffix()}`; } while (valueB === valueA);

        const candidate = makeCandidate({ brand, model, categoryId: cat, [idType]: valueA });
        const existing  = makeProductStub({ brand, model, categoryId: cat, [idType]: valueB });
        return { candidate, existing };
      },
      ({ candidate, existing }) => {
        const result = CatalogMatchingEngine.matchProduct(candidate, [existing]);
        expect(result.level).toBe(MatchLevel.NO_MATCH);
      }
    );
  });
});

// ── Property 4: Audit Trail Completeness
// Feature: catalog-matching-safeguards, Property 4: Audit Trail Completeness
// Validates: Requirements 5.1, 5.2, 5.4, 7.3
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 4: Audit Trail Completeness', () => {
  it('should attach a non-null auditRecord to every MatchResult with the correct matchLevel', () => {
    forAll(
      100,
      () => {
        const brand = `brand-${randomSuffix()}`;
        const cat   = `cat-${randomSuffix()}`;
        const numExisting = randomInt(0, 3);
        const candidate = makeCandidate({ brand, model: `Model-${randomSuffix()}`, categoryId: cat });
        const existingProducts = Array.from({ length: numExisting }, () =>
          makeProductStub({ brand, model: `Model-${randomSuffix()}`, categoryId: cat })
        );
        return { candidate, existingProducts };
      },
      ({ candidate, existingProducts }) => {
        const result = CatalogMatchingEngine.matchProduct(candidate, existingProducts);
        expect(result.auditRecord).toBeDefined();
        expect(result.auditRecord).not.toBeNull();
        expect(result.auditRecord.matchLevel).toBe(result.level);
        expect(result.auditRecord.decidedAt).toBeInstanceOf(Date);
      }
    );
  });
});

// ── Property 5: Policy Consistency
// Feature: catalog-matching-safeguards, Property 5: Policy Consistency
// Validates: Requirements 6.2, 6.3, 6.4, 6.5, 7.4
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 5: Policy Consistency', () => {
  it('should never call canSuggestMerge true when audit record shows CONTRADICTED', () => {
    forAll(
      100,
      () => {
        const brand = `brand-${randomSuffix()}`;
        const cat   = `cat-${randomSuffix()}`;
        const candidate = makeCandidate({ brand, model: `Model-${randomSuffix()}`, categoryId: cat });
        const numExisting = randomInt(1, 3);
        const existingProducts = Array.from({ length: numExisting }, () =>
          makeProductStub({ brand, model: `Model-${randomSuffix()}`, categoryId: cat })
        );
        return { candidate, existingProducts };
      },
      ({ candidate, existingProducts }) => {
        const result = CatalogMatchingEngine.matchProduct(candidate, existingProducts);
        if (result.auditRecord) {
          const canSuggest = CatalogMatchingPolicy.canSuggestMerge(result, result.auditRecord);
          if (canSuggest) {
            expect(result.auditRecord.agreementLevel).not.toBe('CONTRADICTED');
          }
        }
      }
    );
  });
});

// ── Property 6: Auto-Merge Level Invariant
// Feature: catalog-matching-safeguards, Property 6: Auto-Merge Level Invariant
// Validates: Requirement 7.5
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 6: Auto-Merge Level Invariant', () => {
  it('should only return shouldAutoMerge=true for EXACT or STRONG match levels', () => {
    forAll(
      100,
      () => {
        const brand = `brand-${randomSuffix()}`;
        const cat   = `cat-${randomSuffix()}`;
        const candidate = makeCandidate({ brand, model: `Model-${randomSuffix()}`, categoryId: cat });
        const existing  = makeProductStub({ brand, model: `Model-${randomSuffix()}`, categoryId: cat });
        return { candidate, existing };
      },
      ({ candidate, existing }) => {
        const result = CatalogMatchingEngine.matchProduct(candidate, [existing]);
        if (result.shouldAutoMerge()) {
          expect([MatchLevel.EXACT, MatchLevel.STRONG]).toContain(result.level);
        }
      }
    );
  });
});

// ── Property 7: AuditRecord Serialization Round-Trip
// Feature: catalog-matching-safeguards, Property 7: AuditRecord Serialization Round-Trip
// Validates: Requirement 5.6
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 7: AuditRecord Serialization Round-Trip', () => {
  it('should produce a deeply equal JSON-compatible object via toJSON()', () => {
    forAll(
      100,
      () => {
        const levels = [MatchLevel.EXACT, MatchLevel.STRONG, MatchLevel.POSSIBLE, MatchLevel.NO_MATCH];
        const level = pick(levels);
        return new MatchAuditRecord({
          matchLevel: level,
          similarityScore: Math.random(),
          agreementLevel: pick(['CONFIRMED', 'CONTRADICTED', 'INSUFFICIENT'] as const),
          decidedAt: new Date(),
        });
      },
      (record) => {
        const json = record.toJSON();
        const roundTripped = JSON.parse(JSON.stringify(json));
        expect(roundTripped).toEqual(json);
        expect(typeof roundTripped.decidedAt).toBe('string');
        // ISO-8601 UTC format
        expect(roundTripped.decidedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      }
    );
  });
});

// ── Property 8: Identity-Relevant Attribute Contradiction
// Feature: catalog-matching-safeguards, Property 8: Identity-Relevant Attribute Contradiction
// Validates: Requirements 2.1, 2.2, 2.5
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 8: Identity-Relevant Attribute Contradiction', () => {
  it('should return CONTRADICTED when shared identity-relevant attributes have different values', () => {
    forAll(
      100,
      () => {
        const key = `attr-${randomSuffix()}`;
        const valueA = `val-A-${randomSuffix()}`;
        let valueB: string;
        do { valueB = `val-B-${randomSuffix()}`; } while (valueB.toLowerCase() === valueA.toLowerCase());

        const schemas = [{ key, identityRelevant: true }];
        const candidateAttrs = { [key]: valueA };
        const existingAttrs  = { [key]: valueB };
        return { schemas, candidateAttrs, existingAttrs };
      },
      ({ schemas, candidateAttrs, existingAttrs }) => {
        const result = SpecificationEvaluationGuard.evaluateIdentityAttributes(
          candidateAttrs,
          existingAttrs,
          schemas
        );
        expect(result.outcome).toBe('CONTRADICTED');
      }
    );
  });
});

// ── Unit Tests ─────────────────────────────────────────────────────────────────

describe('Unit Tests — regression and edge cases', () => {
  it('should produce EXACT match with audit record for identical identifiers', () => {
    const identifiers = {
      hasAnyIdentifier: () => true,
      equals: (other: any) => other === identifiers,
      gtin: '12345678901234',
    };
    const candidate = { brand: 'Samsung', model: 'Galaxy A50', categoryId: 'cat1', identifiers };
    const existing  = makeProductStub({ brand: 'Samsung', model: 'Galaxy A50', categoryId: 'cat1', id: 'prod1' });
    existing.getIdentifiers = () => identifiers;

    const result = CatalogMatchingEngine.matchProduct(candidate as any, [existing]);
    expect(result.level).toBe(MatchLevel.EXACT);
    expect(result.auditRecord).toBeDefined();
    expect(result.auditRecord!.matchLevel).toBe(MatchLevel.EXACT);
  });

  it('should freeze MatchAuditRecord and throw on mutation attempt', () => {
    const record = new MatchAuditRecord({ matchLevel: MatchLevel.NO_MATCH, decidedAt: new Date() });
    expect(() => {
      (record as any).matchLevel = MatchLevel.EXACT;
    }).toThrow();
  });

  it('canSuggestMerge returns true for EXACT', () => {
    const result = new MatchResult({
      level: MatchLevel.EXACT, score: 100, criteria: {}, requiresConfirmation: false,
    });
    const audit = new MatchAuditRecord({ matchLevel: MatchLevel.EXACT, decidedAt: new Date() });
    expect(CatalogMatchingPolicy.canSuggestMerge(result, audit)).toBe(true);
  });

  it('canSuggestMerge returns true for STRONG', () => {
    const result = new MatchResult({
      level: MatchLevel.STRONG, score: 95, criteria: {}, requiresConfirmation: false,
    });
    const audit = new MatchAuditRecord({ matchLevel: MatchLevel.STRONG, decidedAt: new Date() });
    expect(CatalogMatchingPolicy.canSuggestMerge(result, audit)).toBe(true);
  });

  it('canSuggestMerge returns false for NO_MATCH', () => {
    const result = MatchResult.noMatch();
    const audit = new MatchAuditRecord({ matchLevel: MatchLevel.NO_MATCH, decidedAt: new Date() });
    expect(CatalogMatchingPolicy.canSuggestMerge(result, audit)).toBe(false);
  });

  it('canSuggestMerge returns false for POSSIBLE with CONTRADICTED', () => {
    const result = new MatchResult({
      level: MatchLevel.POSSIBLE, score: 88, criteria: {}, requiresConfirmation: true,
    });
    const audit = new MatchAuditRecord({
      matchLevel: MatchLevel.POSSIBLE,
      agreementLevel: 'CONTRADICTED',
      decidedAt: new Date(),
    });
    expect(CatalogMatchingPolicy.canSuggestMerge(result, audit)).toBe(false);
  });

  it('canSuggestMerge returns true for POSSIBLE with CONFIRMED', () => {
    const result = new MatchResult({
      level: MatchLevel.POSSIBLE, score: 90, criteria: {}, requiresConfirmation: true,
    });
    const audit = new MatchAuditRecord({
      matchLevel: MatchLevel.POSSIBLE,
      agreementLevel: 'CONFIRMED',
      decidedAt: new Date(),
    });
    expect(CatalogMatchingPolicy.canSuggestMerge(result, audit)).toBe(true);
  });

  it('empty model string returns INSUFFICIENT from evaluateModelSuffix', () => {
    const result = SpecificationEvaluationGuard.evaluateModelSuffix('', 'Galaxy A50');
    expect(result.outcome).toBe('INSUFFICIENT');
  });

  it('existing methods on CatalogMatchingPolicy are unchanged', () => {
    const result = MatchResult.noMatch();
    expect(CatalogMatchingPolicy.canAutoMerge(result)).toBe(false);
    expect(CatalogMatchingPolicy.shouldCreateNewProduct(result)).toBe(true);
    expect(CatalogMatchingPolicy.requiresSellerConfirmation(result)).toBe(false);
  });
});
