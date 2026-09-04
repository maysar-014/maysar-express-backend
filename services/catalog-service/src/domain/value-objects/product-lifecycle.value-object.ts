/**
 * Product Lifecycle Value Object
 *
 * Models the explicit state machine a product moves through from seller
 * submission to live publication. Each transition carries an actionable
 * reason so operations teams and sellers never see an opaque "draft" status.
 *
 * States:
 *  DRAFT              — seller has started but not submitted
 *  VALIDATING         — schema/attribute validation in progress
 *  MATCH_REVIEW       — possible duplicate found; awaiting seller confirmation
 *  CONTENT_FAILED     — description or consistency validation failed
 *  QUALITY_FAILED     — quality score below publish threshold
 *  READY              — all checks passed; eligible to publish
 *  PUBLISHED          — visible to buyers
 *  UPDATED            — published but has pending attribute/content changes
 *  REVALIDATION       — re-running validation after seller update
 *  ARCHIVED           — removed from public catalog
 */

export type ProductLifecycleState =
  | 'DRAFT'
  | 'VALIDATING'
  | 'MATCH_REVIEW'
  | 'CONTENT_FAILED'
  | 'QUALITY_FAILED'
  | 'READY'
  | 'PUBLISHED'
  | 'UPDATED'
  | 'REVALIDATION'
  | 'ARCHIVED';

export type BlockReason =
  | 'PENDING_REQUIRED_ATTRIBUTE'
  | 'PRODUCT_MATCH_REVIEW'
  | 'DATA_CONFLICT'
  | 'IMAGE_REQUIREMENT_FAILED'
  | 'CONTENT_VALIDATION_FAILED'
  | 'QUALITY_SCORE_TOO_LOW'
  | 'MISSING_PRICE'
  | 'MISSING_LOCATION'
  | 'MISSING_PRODUCT_NAME';

export interface LifecycleTransition {
  from: ProductLifecycleState;
  to: ProductLifecycleState;
  reason?: string;
  blockReasons?: BlockReason[];
  transitionedAt: Date;
}

const ALLOWED_TRANSITIONS: Record<ProductLifecycleState, ProductLifecycleState[]> = {
  DRAFT:          ['VALIDATING', 'ARCHIVED'],
  VALIDATING:     ['MATCH_REVIEW', 'CONTENT_FAILED', 'QUALITY_FAILED', 'READY', 'DRAFT'],
  MATCH_REVIEW:   ['VALIDATING', 'DRAFT', 'ARCHIVED'],
  CONTENT_FAILED: ['REVALIDATION', 'DRAFT', 'ARCHIVED'],
  QUALITY_FAILED: ['REVALIDATION', 'DRAFT', 'ARCHIVED'],
  READY:          ['PUBLISHED', 'DRAFT', 'ARCHIVED'],
  PUBLISHED:      ['UPDATED', 'REVALIDATION', 'ARCHIVED'],
  UPDATED:        ['REVALIDATION', 'PUBLISHED', 'ARCHIVED'],
  REVALIDATION:   ['CONTENT_FAILED', 'QUALITY_FAILED', 'READY', 'PUBLISHED', 'ARCHIVED'],
  ARCHIVED:       ['DRAFT'],
};

/** Human-readable description for each state, shown in seller dashboards */
const STATE_LABELS: Record<ProductLifecycleState, string> = {
  DRAFT:          'Draft — complete your listing to publish',
  VALIDATING:     'Validating — checking your product data',
  MATCH_REVIEW:   'Match Review — possible duplicate found, confirm to proceed',
  CONTENT_FAILED: 'Content Failed — description validation did not pass',
  QUALITY_FAILED: 'Quality Failed — listing score is below the publish threshold',
  READY:          'Ready — your listing has passed all checks and can be published',
  PUBLISHED:      'Published — your listing is live',
  UPDATED:        'Updated — your listing has pending changes',
  REVALIDATION:   'Re-validating — checking updated product data',
  ARCHIVED:       'Archived — listing removed from catalog',
};

export class ProductLifecycle {
  private readonly state: ProductLifecycleState;
  private readonly history: LifecycleTransition[];
  private readonly blockReasons: BlockReason[];

  private constructor(
    state: ProductLifecycleState,
    history: LifecycleTransition[],
    blockReasons: BlockReason[],
  ) {
    this.state = state;
    this.history = history;
    this.blockReasons = blockReasons;
  }

  /** Create a brand-new lifecycle starting in DRAFT */
  static createDraft(): ProductLifecycle {
    return new ProductLifecycle('DRAFT', [], []);
  }

  /** Reconstruct from persisted state */
  static fromState(
    state: ProductLifecycleState,
    history: LifecycleTransition[] = [],
    blockReasons: BlockReason[] = [],
  ): ProductLifecycle {
    return new ProductLifecycle(state, history, blockReasons);
  }

  /** Attempt a state transition. Throws if the transition is not allowed. */
  transition(
    to: ProductLifecycleState,
    reason?: string,
    blockReasons?: BlockReason[],
  ): ProductLifecycle {
    if (!this.canTransitionTo(to)) {
      throw new Error(
        `Invalid lifecycle transition: ${this.state} → ${to}. ` +
        `Allowed: ${ALLOWED_TRANSITIONS[this.state].join(', ')}`,
      );
    }

    const transition: LifecycleTransition = {
      from: this.state,
      to,
      reason,
      blockReasons,
      transitionedAt: new Date(),
    };

    return new ProductLifecycle(to, [...this.history, transition], blockReasons ?? []);
  }

  canTransitionTo(to: ProductLifecycleState): boolean {
    return ALLOWED_TRANSITIONS[this.state].includes(to);
  }

  getState(): ProductLifecycleState { return this.state; }
  getHistory(): LifecycleTransition[] { return [...this.history]; }
  getBlockReasons(): BlockReason[] { return [...this.blockReasons]; }
  getLabel(): string { return STATE_LABELS[this.state]; }

  isPublished(): boolean { return this.state === 'PUBLISHED' || this.state === 'UPDATED'; }
  isBlocked(): boolean {
    return ['CONTENT_FAILED', 'QUALITY_FAILED', 'MATCH_REVIEW'].includes(this.state);
  }
  isDraft(): boolean { return this.state === 'DRAFT'; }
  isArchived(): boolean { return this.state === 'ARCHIVED'; }

  /**
   * Maps to the Prisma enum values used in the existing Product.status column.
   * 'draft' | 'published' | 'archived'
   */
  toPrismaStatus(): string {
    if (this.isPublished()) return 'published';
    if (this.isArchived()) return 'archived';
    return 'draft';
  }

  /**
   * Derive the appropriate lifecycle state from validation results.
   * Used by CreateProductUseCase after running all validation checks.
   */
  static deriveFromValidation(opts: {
    hasConflicts: boolean;
    qualityScore: number;
    hasPendingMatchConfirmation: boolean;
    hasValidPrice: boolean;
    hasLocation: boolean;
    hasProductName: boolean;
  }): { state: ProductLifecycleState; blockReasons: BlockReason[] } {
    const reasons: BlockReason[] = [];

    if (!opts.hasProductName) reasons.push('MISSING_PRODUCT_NAME');
    if (!opts.hasValidPrice) reasons.push('MISSING_PRICE');
    if (!opts.hasLocation) reasons.push('MISSING_LOCATION');
    if (opts.hasConflicts) reasons.push('DATA_CONFLICT');
    if (opts.hasPendingMatchConfirmation) reasons.push('PRODUCT_MATCH_REVIEW');
    if (opts.qualityScore < 60) reasons.push('QUALITY_SCORE_TOO_LOW');

    if (opts.hasPendingMatchConfirmation) {
      return { state: 'MATCH_REVIEW', blockReasons: reasons };
    }
    if (opts.hasConflicts) {
      return { state: 'CONTENT_FAILED', blockReasons: reasons };
    }
    if (!opts.hasValidPrice || !opts.hasLocation || !opts.hasProductName) {
      return { state: 'QUALITY_FAILED', blockReasons: reasons };
    }
    if (opts.qualityScore < 60) {
      return { state: 'QUALITY_FAILED', blockReasons: reasons };
    }

    return { state: 'READY', blockReasons: [] };
  }
}
