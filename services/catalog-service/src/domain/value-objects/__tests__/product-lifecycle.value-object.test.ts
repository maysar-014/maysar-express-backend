import { ProductLifecycle } from '../product-lifecycle.value-object';

describe('ProductLifecycle', () => {
  describe('createDraft', () => {
    it('should create a lifecycle in DRAFT state', () => {
      const lifecycle = ProductLifecycle.createDraft();
      expect(lifecycle.getState()).toBe('DRAFT');
      expect(lifecycle.isDraft()).toBe(true);
      expect(lifecycle.isPublished()).toBe(false);
      expect(lifecycle.isArchived()).toBe(false);
    });

    it('should start with empty history and no block reasons', () => {
      const lifecycle = ProductLifecycle.createDraft();
      expect(lifecycle.getHistory()).toHaveLength(0);
      expect(lifecycle.getBlockReasons()).toHaveLength(0);
    });
  });

  describe('transition', () => {
    it('should transition DRAFT → VALIDATING', () => {
      const v = ProductLifecycle.createDraft().transition('VALIDATING');
      expect(v.getState()).toBe('VALIDATING');
    });

    it('should transition VALIDATING → READY', () => {
      const v = ProductLifecycle.createDraft()
        .transition('VALIDATING')
        .transition('READY');
      expect(v.getState()).toBe('READY');
    });

    it('should transition READY → PUBLISHED', () => {
      const v = ProductLifecycle.createDraft()
        .transition('VALIDATING')
        .transition('READY')
        .transition('PUBLISHED');
      expect(v.isPublished()).toBe(true);
    });

    it('should reject invalid transitions', () => {
      const draft = ProductLifecycle.createDraft();
      expect(() => draft.transition('PUBLISHED')).toThrow(/Invalid lifecycle transition/);
    });

    it('should carry block reasons through transition', () => {
      const failed = ProductLifecycle.createDraft()
        .transition('VALIDATING')
        .transition('QUALITY_FAILED', 'Score too low', ['QUALITY_SCORE_TOO_LOW']);
      expect(failed.getBlockReasons()).toContain('QUALITY_SCORE_TOO_LOW');
    });

    it('should record history of transitions', () => {
      const v = ProductLifecycle.createDraft()
        .transition('VALIDATING')
        .transition('READY');
      expect(v.getHistory()).toHaveLength(2);
      expect(v.getHistory()[0].from).toBe('DRAFT');
      expect(v.getHistory()[0].to).toBe('VALIDATING');
      expect(v.getHistory()[1].from).toBe('VALIDATING');
      expect(v.getHistory()[1].to).toBe('READY');
    });

    it('should be immutable — original state unchanged after transition', () => {
      const draft = ProductLifecycle.createDraft();
      draft.transition('VALIDATING');
      expect(draft.getState()).toBe('DRAFT');
    });
  });

  describe('canTransitionTo', () => {
    it('should return true for valid transitions', () => {
      expect(ProductLifecycle.createDraft().canTransitionTo('VALIDATING')).toBe(true);
      expect(ProductLifecycle.createDraft().canTransitionTo('ARCHIVED')).toBe(true);
    });

    it('should return false for invalid transitions', () => {
      expect(ProductLifecycle.createDraft().canTransitionTo('PUBLISHED')).toBe(false);
      expect(ProductLifecycle.createDraft().canTransitionTo('READY')).toBe(false);
    });
  });

  describe('isBlocked', () => {
    it('should be blocked in CONTENT_FAILED', () => {
      const v = ProductLifecycle.createDraft()
        .transition('VALIDATING')
        .transition('CONTENT_FAILED');
      expect(v.isBlocked()).toBe(true);
    });

    it('should be blocked in QUALITY_FAILED', () => {
      const v = ProductLifecycle.createDraft()
        .transition('VALIDATING')
        .transition('QUALITY_FAILED');
      expect(v.isBlocked()).toBe(true);
    });

    it('should NOT be blocked in READY or PUBLISHED', () => {
      const ready = ProductLifecycle.createDraft()
        .transition('VALIDATING')
        .transition('READY');
      expect(ready.isBlocked()).toBe(false);
    });
  });

  describe('toPrismaStatus', () => {
    it('should map PUBLISHED to "published"', () => {
      const v = ProductLifecycle.createDraft()
        .transition('VALIDATING')
        .transition('READY')
        .transition('PUBLISHED');
      expect(v.toPrismaStatus()).toBe('published');
    });

    it('should map ARCHIVED to "archived"', () => {
      const v = ProductLifecycle.createDraft().transition('ARCHIVED');
      expect(v.toPrismaStatus()).toBe('archived');
    });

    it('should map DRAFT/VALIDATING/QUALITY_FAILED to "draft"', () => {
      expect(ProductLifecycle.createDraft().toPrismaStatus()).toBe('draft');
      expect(
        ProductLifecycle.createDraft().transition('VALIDATING').toPrismaStatus()
      ).toBe('draft');
    });
  });

  describe('getLabel', () => {
    it('should return a non-empty label for every state', () => {
      const states = ['DRAFT', 'VALIDATING', 'MATCH_REVIEW', 'CONTENT_FAILED',
        'QUALITY_FAILED', 'READY', 'PUBLISHED', 'UPDATED', 'REVALIDATION', 'ARCHIVED'] as const;
      for (const state of states) {
        const lc = ProductLifecycle.fromState(state);
        expect(lc.getLabel().length).toBeGreaterThan(0);
      }
    });
  });

  describe('deriveFromValidation', () => {
    it('should return READY when all checks pass', () => {
      const { state, blockReasons } = ProductLifecycle.deriveFromValidation({
        hasConflicts: false,
        qualityScore: 75,
        hasPendingMatchConfirmation: false,
        hasValidPrice: true,
        hasLocation: true,
        hasProductName: true,
      });
      expect(state).toBe('READY');
      expect(blockReasons).toHaveLength(0);
    });

    it('should return MATCH_REVIEW when there is a pending match confirmation', () => {
      const { state, blockReasons } = ProductLifecycle.deriveFromValidation({
        hasConflicts: false,
        qualityScore: 80,
        hasPendingMatchConfirmation: true,
        hasValidPrice: true,
        hasLocation: true,
        hasProductName: true,
      });
      expect(state).toBe('MATCH_REVIEW');
      expect(blockReasons).toContain('PRODUCT_MATCH_REVIEW');
    });

    it('should return CONTENT_FAILED when there are data conflicts', () => {
      const { state, blockReasons } = ProductLifecycle.deriveFromValidation({
        hasConflicts: true,
        qualityScore: 80,
        hasPendingMatchConfirmation: false,
        hasValidPrice: true,
        hasLocation: true,
        hasProductName: true,
      });
      expect(state).toBe('CONTENT_FAILED');
      expect(blockReasons).toContain('DATA_CONFLICT');
    });

    it('should return QUALITY_FAILED when score is below 60', () => {
      const { state, blockReasons } = ProductLifecycle.deriveFromValidation({
        hasConflicts: false,
        qualityScore: 45,
        hasPendingMatchConfirmation: false,
        hasValidPrice: true,
        hasLocation: true,
        hasProductName: true,
      });
      expect(state).toBe('QUALITY_FAILED');
      expect(blockReasons).toContain('QUALITY_SCORE_TOO_LOW');
    });

    it('should accumulate multiple block reasons', () => {
      const { blockReasons } = ProductLifecycle.deriveFromValidation({
        hasConflicts: false,
        qualityScore: 30,
        hasPendingMatchConfirmation: false,
        hasValidPrice: false,
        hasLocation: false,
        hasProductName: true,
      });
      expect(blockReasons).toContain('MISSING_PRICE');
      expect(blockReasons).toContain('MISSING_LOCATION');
      expect(blockReasons).toContain('QUALITY_SCORE_TOO_LOW');
    });
  });
});
