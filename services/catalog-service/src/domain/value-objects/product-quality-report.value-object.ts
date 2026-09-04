/**
 * Product Quality Report Value Object
 *
 * Provides a seller-facing, human-readable breakdown of listing quality.
 * Goes beyond a numeric score — explains why a score is what it is,
 * what hard publication gates are blocking the listing, and what the
 * seller must do to improve.
 *
 * Principle: sellers should never just see "score: 58". They should see
 * exactly what to fix, in order of impact.
 */

export type QualitySignalStatus = 'EXCELLENT' | 'GOOD' | 'NEEDS_WORK' | 'MISSING';

export interface QualitySignalDetail {
  /** Signal name for display */
  label: string;
  /** Points earned out of the maximum possible */
  earned: number;
  /** Maximum points available for this signal */
  max: number;
  /** Visual status bucket */
  status: QualitySignalStatus;
  /** Specific, actionable improvement instruction — empty if signal is fully earned */
  advice: string;
}

export interface PublicationGate {
  /** Identifier of the gate */
  rule: string;
  /** Whether this gate is currently blocking publication */
  blocking: boolean;
  /** Human-readable description of what is required */
  requirement: string;
  /** The current state that caused this gate to fire (if blocking) */
  currentState?: string;
}

export interface ProductQualityReport {
  /** Total score 0–100 */
  totalScore: number;
  /** 'publishable' | 'needs_improvement' | 'critical' */
  status: 'publishable' | 'needs_improvement' | 'critical';
  /** Whether the listing can be published right now */
  canPublish: boolean;
  /** Per-signal breakdown with advice */
  signals: QualitySignalDetail[];
  /** Hard gates that must pass regardless of score */
  publicationGates: PublicationGate[];
  /** Ordered list of the most impactful actions the seller should take */
  prioritisedActions: string[];
  /** Summary sentence suitable for display in a seller dashboard */
  summary: string;
}

export interface QualityReportInput {
  brand: string;
  productName: string;
  keyAttribute: string;
  requiredAttributesFilled: number;
  totalRequiredAttributes: number;
  imageCount: number;
  descriptionLength: number;
  isLeafCategory: boolean;
  hasValidPrice: boolean;
  hasSupplierLocation: boolean;
  /** Score signals already computed */
  signals: {
    titleCompleteness: number;
    attributesCompleteness: number;
    imagesUploaded: number;
    descriptionLength: number;
    categoryAccuracy: number;
  };
  totalScore: number;
}

export class ProductQualityReport {
  static generate(input: QualityReportInput): ProductQualityReport {
    const signals = this.buildSignalDetails(input);
    const gates = this.buildPublicationGates(input);
    const status = this.computeStatus(input.totalScore);
    const canPublish = input.totalScore >= 60 && !gates.some(g => g.blocking);
    const prioritisedActions = this.buildPrioritisedActions(signals, gates);
    const summary = this.buildSummary(input.totalScore, status, canPublish, gates);

    return {
      totalScore: input.totalScore,
      status,
      canPublish,
      signals,
      publicationGates: gates,
      prioritisedActions,
      summary,
    };
  }

  private static buildSignalDetails(input: QualityReportInput): QualitySignalDetail[] {
    return [
      {
        label: 'Title Completeness',
        earned: input.signals.titleCompleteness,
        max: 20,
        status: this.signalStatus(input.signals.titleCompleteness, 20),
        advice: this.titleAdvice(input.brand, input.productName, input.keyAttribute),
      },
      {
        label: 'Attributes Completeness',
        earned: input.signals.attributesCompleteness,
        max: 25,
        status: this.signalStatus(input.signals.attributesCompleteness, 25),
        advice: this.attributesAdvice(input.requiredAttributesFilled, input.totalRequiredAttributes),
      },
      {
        label: 'Product Images',
        earned: input.signals.imagesUploaded,
        max: 20,
        status: this.signalStatus(input.signals.imagesUploaded, 20),
        advice: this.imagesAdvice(input.imageCount),
      },
      {
        label: 'Description Quality',
        earned: input.signals.descriptionLength,
        max: 20,
        status: this.signalStatus(input.signals.descriptionLength, 20),
        advice: this.descriptionAdvice(input.descriptionLength),
      },
      {
        label: 'Category Accuracy',
        earned: input.signals.categoryAccuracy,
        max: 15,
        status: this.signalStatus(input.signals.categoryAccuracy, 15),
        advice: input.isLeafCategory ? '' : 'Move product to a more specific subcategory.',
      },
    ];
  }

  private static buildPublicationGates(input: QualityReportInput): PublicationGate[] {
    return [
      {
        rule: 'VALID_PRICE',
        blocking: !input.hasValidPrice,
        requirement: 'Product must have a valid price greater than zero.',
        currentState: input.hasValidPrice ? undefined : 'No price set',
      },
      {
        rule: 'SUPPLIER_LOCATION',
        blocking: !input.hasSupplierLocation,
        requirement: 'A supplier location must be linked to the product.',
        currentState: input.hasSupplierLocation ? undefined : 'No location set',
      },
      {
        rule: 'MINIMUM_SCORE',
        blocking: input.totalScore < 60,
        requirement: 'Quality score must be at least 60 to publish.',
        currentState: input.totalScore < 60 ? `Current score: ${input.totalScore}` : undefined,
      },
      {
        rule: 'PRODUCT_NAME',
        blocking: !input.productName?.trim(),
        requirement: 'Product name is required.',
        currentState: !input.productName?.trim() ? 'Product name is empty' : undefined,
      },
    ];
  }

  private static buildPrioritisedActions(
    signals: QualitySignalDetail[],
    gates: PublicationGate[],
  ): string[] {
    const actions: Array<{ priority: number; action: string }> = [];

    // Blocking gates come first
    for (const gate of gates) {
      if (gate.blocking) {
        actions.push({ priority: 0, action: `[Required] ${gate.requirement}` });
      }
    }

    // Then signals by gap size (most points to earn = highest priority)
    for (const signal of signals) {
      if (signal.advice) {
        const gap = signal.max - signal.earned;
        actions.push({ priority: gap, action: signal.advice });
      }
    }

    return actions
      .sort((a, b) => b.priority - a.priority)
      .map(a => a.action);
  }

  private static buildSummary(
    score: number,
    status: 'publishable' | 'needs_improvement' | 'critical',
    canPublish: boolean,
    gates: PublicationGate[],
  ): string {
    if (canPublish) {
      return `Your listing scores ${score}/100 and is ready to publish.`;
    }
    const blockingGates = gates.filter(g => g.blocking);
    if (blockingGates.length > 0) {
      return `Your listing scores ${score}/100 but cannot be published: ${blockingGates.map(g => g.requirement).join('; ')}`;
    }
    if (status === 'critical') {
      return `Your listing scores ${score}/100. Significant improvements are needed before it can be published.`;
    }
    return `Your listing scores ${score}/100. Address the suggestions below to reach the 60-point publish threshold.`;
  }

  private static computeStatus(score: number): 'publishable' | 'needs_improvement' | 'critical' {
    if (score >= 60) return 'publishable';
    if (score >= 40) return 'needs_improvement';
    return 'critical';
  }

  private static signalStatus(earned: number, max: number): QualitySignalStatus {
    const pct = earned / max;
    if (pct >= 1) return 'EXCELLENT';
    if (pct >= 0.7) return 'GOOD';
    if (pct > 0) return 'NEEDS_WORK';
    return 'MISSING';
  }

  private static titleAdvice(brand: string, productName: string, keyAttribute: string): string {
    const missing: string[] = [];
    if (!brand?.trim()) missing.push('brand name');
    if (!productName?.trim()) missing.push('product name');
    if (!keyAttribute?.trim()) missing.push('a key attribute (e.g. size, capacity, model)');
    return missing.length > 0 ? `Add ${missing.join(', ')} to the product title.` : '';
  }

  private static attributesAdvice(filled: number, total: number): string {
    if (total === 0) return '';
    const missing = total - filled;
    if (missing === 0) return '';
    if (missing === 1) return 'Fill in 1 remaining required attribute.';
    return `Fill in ${missing} remaining required attributes.`;
  }

  private static imagesAdvice(count: number): string {
    if (count >= 3) return '';
    if (count === 2) return 'Add 1 more product image to reach the recommended 3.';
    if (count === 1) return 'Add 2 more product images (recommended: front, back, and detail views).';
    return 'Upload at least 1 product image. Listings without images score 0 for this signal.';
  }

  private static descriptionAdvice(length: number): string {
    if (length >= 300) return '';
    if (length >= 120) return `Description is ${length} characters. Expanding to 300+ characters will maximise this signal.`;
    if (length > 0) return `Description is too short (${length} chars). Minimum is 120 characters; 300+ is recommended.`;
    return 'No description generated. Ensure required product attributes are filled in.';
  }
}
