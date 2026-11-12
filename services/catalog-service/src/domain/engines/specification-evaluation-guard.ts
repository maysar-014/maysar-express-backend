import { ProductCandidate } from './catalog-matching.engine';
import { NormalizationAlgorithm } from '../algorithms/normalization.algorithm';
import { DimensionOutcome, DimensionResult } from '../value-objects/match-audit-record.value-object';

export type { DimensionOutcome, DimensionResult };

export interface SpecificationEvaluationResult {
  /** Composite agreement level — CONTRADICTED wins over CONFIRMED and INSUFFICIENT */
  agreementLevel: DimensionOutcome;
  dimensions: {
    modelSuffix: DimensionResult;
    identityAttributes: DimensionResult;
    criticalIdentifiers: DimensionResult;
  };
}

export interface CategoryAttributeSchema {
  key: string;
  identityRelevant: boolean;
}

export class SpecificationEvaluationGuard {
  /**
   * Recognized model suffix tokens (lowercase).
   * A product whose model string differs in these tokens is a distinct product.
   */
  static readonly SUFFIX_TOKENS: ReadonlySet<string> = new Set([
    '5g', 'pro', 'plus', 'max', 'lite', 'mini', 'ultra', 'neo', 'fe', 'se', 'e', 's',
  ]);

  /**
   * Evaluates specification evidence for a candidate/existing product pair.
   * Returns CONTRADICTED if any dimension contradicts identity;
   * CONFIRMED if at least one confirms and none contradict;
   * INSUFFICIENT otherwise.
   */
  static evaluate(
    candidate: ProductCandidate,
    existing: any, // Product entity — typed as any for compatibility with entity interface
    attributeSchemas: CategoryAttributeSchema[] = [],
  ): SpecificationEvaluationResult {
    const modelSuffix = this.evaluateModelSuffix(
      candidate.model,
      existing.getModel?.() ?? (existing as any).model ?? '',
    );
    const identityAttributes = this.evaluateIdentityAttributes(
      candidate.attributes ?? {},
      existing.getAttributes?.() ?? (existing as any).attributes ?? {},
      attributeSchemas,
    );
    const criticalIdentifiers = this.evaluateCriticalIdentifiers(candidate, existing);

    const allOutcomes: DimensionOutcome[] = [
      modelSuffix.outcome,
      identityAttributes.outcome,
      criticalIdentifiers.outcome,
    ];

    let agreementLevel: DimensionOutcome = 'INSUFFICIENT';
    if (allOutcomes.includes('CONTRADICTED')) {
      agreementLevel = 'CONTRADICTED';
    } else if (allOutcomes.includes('CONFIRMED')) {
      agreementLevel = 'CONFIRMED';
    }

    return {
      agreementLevel,
      dimensions: { modelSuffix, identityAttributes, criticalIdentifiers },
    };
  }

  // ── Model Suffix Dimension ─────────────────────────────────────────────────

  static evaluateModelSuffix(candidateModel: string, existingModel: string): DimensionResult {
    if (!candidateModel || !existingModel) {
      return {
        outcome: 'INSUFFICIENT',
        evidence: 'One or both model strings are absent or empty',
      };
    }

    const candidateSuffixes = this.extractSuffixTokens(candidateModel);
    const existingSuffixes = this.extractSuffixTokens(existingModel);

    const sameSet =
      candidateSuffixes.size === existingSuffixes.size &&
      [...candidateSuffixes].every(t => existingSuffixes.has(t));

    if (sameSet) {
      return {
        outcome: 'CONFIRMED',
        evidence: `Both models share suffix set: [${[...candidateSuffixes].join(', ') || '(none)'}]`,
      };
    }

    return {
      outcome: 'CONTRADICTED',
      evidence:
        `Candidate suffixes [${[...candidateSuffixes].join(', ') || '(none)'}] differ from ` +
        `existing suffixes [${[...existingSuffixes].join(', ') || '(none)'}]`,
    };
  }

  /** Returns the set of recognized suffix tokens found in a normalized model string. */
  static extractSuffixTokens(model: string): Set<string> {
    const normalized = NormalizationAlgorithm.normalizeText(model);
    const tokens = normalized.split(/\s+/);
    const result = new Set<string>();
    for (const token of tokens) {
      const t = token.trim().toLowerCase();
      if (t && this.SUFFIX_TOKENS.has(t)) result.add(t);
    }
    return result;
  }

  // ── Identity-Relevant Attribute Dimension ──────────────────────────────────

  static evaluateIdentityAttributes(
    candidateAttrs: Record<string, unknown>,
    existingAttrs: Record<string, unknown>,
    schemas: CategoryAttributeSchema[],
  ): DimensionResult {
    const identityKeys = schemas
      .filter(s => s.identityRelevant)
      .map(s => s.key);

    const sharedKeys = identityKeys.filter(
      k => k in candidateAttrs && k in existingAttrs,
    );

    if (sharedKeys.length === 0) {
      return {
        outcome: 'INSUFFICIENT',
        evidence: 'No shared identity-relevant attributes to compare',
      };
    }

    const contradictions: string[] = [];
    for (const key of sharedKeys) {
      const cv = this.normalizeAttrValue(candidateAttrs[key]);
      const ev = this.normalizeAttrValue(existingAttrs[key]);
      if (cv && ev && cv !== ev) {
        contradictions.push(`${key}: "${cv}" vs "${ev}"`);
      }
    }

    if (contradictions.length > 0) {
      return {
        outcome: 'CONTRADICTED',
        evidence: `Attribute conflicts: ${contradictions.join('; ')}`,
      };
    }

    return {
      outcome: 'CONFIRMED',
      evidence: `${sharedKeys.length} identity-relevant attribute(s) agree`,
    };
  }

  private static normalizeAttrValue(v: unknown): string {
    if (v === null || v === undefined) return '';
    return String(v).trim().toLowerCase();
  }

  // ── Critical Identifier Dimension ─────────────────────────────────────────

  static evaluateCriticalIdentifiers(
    candidate: ProductCandidate,
    existing: any,
  ): DimensionResult {
    const candidateIds = candidate.identifiers;
    const existingIds = existing.getIdentifiers?.() ?? (existing as any).identifiers;

    if (!candidateIds || !existingIds) {
      return {
        outcome: 'INSUFFICIENT',
        evidence: 'One or both products lack identifier objects',
      };
    }

    type IdType = 'GTIN' | 'MPN' | 'ISBN';
    const types: IdType[] = ['GTIN', 'MPN', 'ISBN'];
    const conflicts: string[] = [];
    const confirmed: string[] = [];

    for (const type of types) {
      const cv = this.getIdentifierValue(candidateIds, type);
      const ev = this.getIdentifierValue(existingIds, type);

      if (!cv || !ev) continue; // INSUFFICIENT for this type

      const normalizedCv = this.normalizeIdentifierSafe(cv, type);
      const normalizedEv = this.normalizeIdentifierSafe(ev, type);

      if (!normalizedCv || !normalizedEv) continue; // malformed — treat as absent

      if (normalizedCv !== normalizedEv) {
        conflicts.push(`${type}: "${normalizedCv}" vs "${normalizedEv}"`);
      } else {
        confirmed.push(type);
      }
    }

    if (conflicts.length > 0) {
      return {
        outcome: 'CONTRADICTED',
        evidence: `Identifier conflicts: ${conflicts.join('; ')}`,
      };
    }
    if (confirmed.length > 0) {
      return {
        outcome: 'CONFIRMED',
        evidence: `Matching identifiers: ${confirmed.join(', ')}`,
      };
    }
    return {
      outcome: 'INSUFFICIENT',
      evidence: 'No shared identifier types to compare',
    };
  }

  private static getIdentifierValue(ids: any, type: 'GTIN' | 'MPN' | 'ISBN'): string | undefined {
    try {
      switch (type) {
        case 'GTIN': return ids.gtin ?? ids.getGtin?.();
        case 'MPN':  return ids.mpn  ?? ids.getMpn?.();
        case 'ISBN': return ids.isbn ?? ids.getIsbn?.();
      }
    } catch {
      return undefined;
    }
  }

  private static normalizeIdentifierSafe(value: string, type: 'GTIN' | 'MPN' | 'ISBN'): string {
    try {
      return NormalizationAlgorithm.normalizeIdentifier(value, type);
    } catch {
      return '';
    }
  }
}
