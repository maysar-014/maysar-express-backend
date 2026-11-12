import { MatchLevel } from './match-result.value-object';

// ── Shared outcome types (also exported for SpecificationEvaluationGuard) ──────

export type DimensionOutcome = 'CONFIRMED' | 'CONTRADICTED' | 'INSUFFICIENT';

export interface DimensionResult {
  outcome: DimensionOutcome;
  /** Human-readable evidence that produced this outcome */
  evidence: string;
}

export interface AuditDimensions {
  modelSuffix: DimensionResult;
  identityAttributes: DimensionResult;
  criticalIdentifiers: DimensionResult;
}

// ── MatchAuditRecord ──────────────────────────────────────────────────────────

export interface MatchAuditRecordProps {
  matchLevel: MatchLevel;
  similarityScore?: number;
  agreementLevel?: DimensionOutcome;
  dimensions?: AuditDimensions;
  candidateProductId?: string;
  matchedProductId?: string;
  decidedAt: Date;
}

/**
 * Immutable record of why a match decision was made.
 * Frozen at construction — no mutations permitted.
 */
export class MatchAuditRecord {
  public readonly matchLevel: MatchLevel;
  public readonly similarityScore?: number;
  public readonly agreementLevel?: DimensionOutcome;
  public readonly dimensions?: AuditDimensions;
  public readonly candidateProductId?: string;
  public readonly matchedProductId?: string;
  public readonly decidedAt: Date;

  constructor(props: MatchAuditRecordProps) {
    this.matchLevel = props.matchLevel;
    this.similarityScore = props.similarityScore;
    this.agreementLevel = props.agreementLevel;
    this.dimensions = props.dimensions;
    this.candidateProductId = props.candidateProductId;
    this.matchedProductId = props.matchedProductId;
    this.decidedAt = props.decidedAt;
    Object.freeze(this);
    if (this.dimensions) {
      Object.freeze(this.dimensions);
      Object.freeze(this.dimensions.modelSuffix);
      Object.freeze(this.dimensions.identityAttributes);
      Object.freeze(this.dimensions.criticalIdentifiers);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      matchLevel: this.matchLevel,
      similarityScore: this.similarityScore ?? null,
      agreementLevel: this.agreementLevel ?? null,
      dimensions: this.dimensions
        ? {
            modelSuffix: { ...this.dimensions.modelSuffix },
            identityAttributes: { ...this.dimensions.identityAttributes },
            criticalIdentifiers: { ...this.dimensions.criticalIdentifiers },
          }
        : null,
      candidateProductId: this.candidateProductId ?? null,
      matchedProductId: this.matchedProductId ?? null,
      decidedAt: this.decidedAt.toISOString(),
    };
  }
}
