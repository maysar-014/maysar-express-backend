/**
 * Product Quality Score Value Object
 * Manages quality scoring and publish gate logic
 */

export interface QualityScoreSignals {
  titleCompleteness: number; // 0-20
  attributesCompleteness: number; // 0-25
  imagesUploaded: number; // 0-20
  descriptionLength: number; // 0-20
  categoryAccuracy: number; // 0-15
}

export class QualityScore {
  private readonly score: number;
  private readonly signals: QualityScoreSignals;
  private readonly PUBLISH_THRESHOLD = 60;
  private readonly MAX_SCORE = 100;

  private constructor(score: number, signals: QualityScoreSignals) {
    if (score < 0 || score > this.MAX_SCORE) {
      throw new Error(`Quality score must be between 0 and ${this.MAX_SCORE}`);
    }
    this.score = Math.round(score);
    this.signals = signals;
  }

  static create(signals: QualityScoreSignals): QualityScore {
    const totalScore =
      signals.titleCompleteness +
      signals.attributesCompleteness +
      signals.imagesUploaded +
      signals.descriptionLength +
      signals.categoryAccuracy;

    return new QualityScore(totalScore, signals);
  }

  static fromScore(score: number): QualityScore {
    return new QualityScore(score, {
      titleCompleteness: 0,
      attributesCompleteness: 0,
      imagesUploaded: 0,
      descriptionLength: 0,
      categoryAccuracy: 0,
    });
  }

  getValue(): number {
    return this.score;
  }

  isPublishable(): boolean {
    return this.score >= this.PUBLISH_THRESHOLD;
  }

  getPublishThreshold(): number {
    return this.PUBLISH_THRESHOLD;
  }

  getScoreBreakdown(): QualityScoreSignals {
    return { ...this.signals };
  }

  getScorePercentage(): number {
    return Math.round((this.score / this.MAX_SCORE) * 100);
  }

  getPublishabilityStatus(): 'publishable' | 'needs_improvement' | 'critical' {
    if (this.score >= this.PUBLISH_THRESHOLD) {
      return 'publishable';
    }
    if (this.score >= 40) {
      return 'needs_improvement';
    }
    return 'critical';
  }

  getSuggestionsForImprovement(): string[] {
    const suggestions: string[] = [];

    if (this.signals.titleCompleteness < 20) {
      suggestions.push('Add brand, product name, and key attribute to title');
    }
    if (this.signals.attributesCompleteness < 25) {
      suggestions.push('Fill in all required product attributes');
    }
    if (this.signals.imagesUploaded < 20) {
      suggestions.push('Upload at least one product image');
    }
    if (this.signals.descriptionLength < 20) {
      suggestions.push('Write a more detailed product description (minimum 120 characters)');
    }
    if (this.signals.categoryAccuracy < 15) {
      suggestions.push('Ensure product is in the correct leaf category');
    }

    return suggestions;
  }

  compare(other: QualityScore): number {
    return this.score - other.score;
  }

  equals(other: QualityScore): boolean {
    return this.score === other.score;
  }

  toString(): string {
    return `${this.score}/100 (${this.getPublishabilityStatus()})`;
  }
}
