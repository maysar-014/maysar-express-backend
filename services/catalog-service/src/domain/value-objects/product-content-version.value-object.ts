/**
 * Product Content Version Value Object
 *
 * Tracks the version lineage of generated product content so that:
 *  - Content can be deterministically regenerated from its input snapshot.
 *  - Staleness can be detected when relevant attributes change.
 *  - Audit history is preserved for quality and compliance purposes.
 *
 * The `inputSnapshot` captures every field that feeds generation so that
 * re-running the pipeline on the same snapshot always produces the same output.
 */

export type ContentGenerationSource =
  | 'DETERMINISTIC' // Rule-based generation only (current default)
  | 'AI_ASSISTED';  // LLM-assisted rephrasing (future Phase 5)

export type ContentVerificationStatus =
  | 'UNVERIFIED'          // Default on first generation
  | 'EVIDENCE_VERIFIED'   // All claims traced to input evidence
  | 'CONFLICT_DETECTED'   // Consistency check found a conflict
  | 'MANUALLY_APPROVED';  // Operator has reviewed and approved

export interface ContentInputSnapshot {
  brand: string;
  productName: string;
  categorySlug: string;
  attributes: Record<string, string>;
  /** Schema version used during generation — allows detecting schema drift. */
  schemaVersion: string;
}

export interface ProductContentVersionData {
  version: number;
  generatedAt: Date;
  source: ContentGenerationSource;
  inputSnapshot: ContentInputSnapshot;
  verificationStatus: ContentVerificationStatus;
  /** Set when the content is superseded by a newer version. */
  supersededAt?: Date;
}

export class ProductContentVersion {
  private readonly data: ProductContentVersionData;

  private constructor(data: ProductContentVersionData) {
    this.data = data;
  }

  /**
   * Creates the first version of content for a new product.
   */
  static createInitial(
    inputSnapshot: ContentInputSnapshot,
    source: ContentGenerationSource = 'DETERMINISTIC',
  ): ProductContentVersion {
    return new ProductContentVersion({
      version: 1,
      generatedAt: new Date(),
      source,
      inputSnapshot,
      verificationStatus: 'UNVERIFIED',
    });
  }

  /**
   * Creates a new version when content needs to be regenerated
   * (e.g. after an attribute update that invalidates the previous output).
   */
  bump(newSnapshot: ContentInputSnapshot): ProductContentVersion {
    return new ProductContentVersion({
      version: this.data.version + 1,
      generatedAt: new Date(),
      source: this.data.source,
      inputSnapshot: newSnapshot,
      verificationStatus: 'UNVERIFIED',
      supersededAt: undefined,
    });
  }

  /**
   * Returns true when the current snapshot differs from a new attribute map,
   * indicating that content should be regenerated.
   */
  isStaleFor(newAttributes: Record<string, string>, newBrand: string, newProductName: string): boolean {
    const snap = this.data.inputSnapshot;
    if (snap.brand !== newBrand || snap.productName !== newProductName) return true;

    const oldKeys = Object.keys(snap.attributes).sort();
    const newKeys = Object.keys(newAttributes).sort();
    if (oldKeys.join(',') !== newKeys.join(',')) return true;

    return oldKeys.some(k => snap.attributes[k] !== newAttributes[k]);
  }

  withVerificationStatus(status: ContentVerificationStatus): ProductContentVersion {
    return new ProductContentVersion({ ...this.data, verificationStatus: status });
  }

  getVersion(): number { return this.data.version; }
  getGeneratedAt(): Date { return this.data.generatedAt; }
  getSource(): ContentGenerationSource { return this.data.source; }
  getInputSnapshot(): ContentInputSnapshot { return { ...this.data.inputSnapshot }; }
  getVerificationStatus(): ContentVerificationStatus { return this.data.verificationStatus; }

  /** Serialises to a plain object suitable for JSON storage. */
  toJSON(): ProductContentVersionData {
    return { ...this.data };
  }

  static fromJSON(data: ProductContentVersionData): ProductContentVersion {
    return new ProductContentVersion(data);
  }
}
