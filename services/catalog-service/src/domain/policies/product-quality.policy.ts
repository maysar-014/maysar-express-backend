/**
 * Product Quality Policy
 * Scoring signals and publish gate logic
 */

import { QualityScore, QualityScoreSignals } from '../value-objects/product-quality-score.value-object';

export interface QualityScoringInput {
  brand: string;
  productName: string;
  keyAttribute: string;
  requiredAttributesFilled: number;
  totalRequiredAttributes: number;
  imageCount: number;
  descriptionLength: number;
  isLeafCategory: boolean;
}

export class ProductQualityPolicy {
  private static readonly SIGNAL_WEIGHTS = {
    titleCompleteness: 20,
    attributesCompleteness: 25,
    imagesUploaded: 20,
    descriptionLength: 20,
    categoryAccuracy: 15,
  };

  static computeScore(input: QualityScoringInput): QualityScore {
    const signals: QualityScoreSignals = {
      titleCompleteness: this.scoreTitleCompleteness(input.brand, input.productName, input.keyAttribute),
      attributesCompleteness: this.scoreAttributesCompleteness(
        input.requiredAttributesFilled,
        input.totalRequiredAttributes
      ),
      imagesUploaded: this.scoreImagesUploaded(input.imageCount),
      descriptionLength: this.scoreDescriptionLength(input.descriptionLength),
      categoryAccuracy: this.scoreCategoryAccuracy(input.isLeafCategory),
    };

    return QualityScore.create(signals);
  }

  private static scoreTitleCompleteness(
    brand: string,
    productName: string,
    keyAttribute: string
  ): number {
    let score = 0;

    if (brand && brand.trim().length > 0) {
      score += 7;
    }

    if (productName && productName.trim().length > 0) {
      score += 7;
    }

    if (keyAttribute && keyAttribute.trim().length > 0) {
      score += 6;
    }

    return Math.min(score, this.SIGNAL_WEIGHTS.titleCompleteness);
  }

  private static scoreAttributesCompleteness(filled: number, total: number): number {
    if (total === 0) {
      return this.SIGNAL_WEIGHTS.attributesCompleteness;
    }

    const percentage = (filled / total) * 100;

    if (percentage === 100) {
      return this.SIGNAL_WEIGHTS.attributesCompleteness;
    }
    if (percentage >= 80) {
      return Math.round(this.SIGNAL_WEIGHTS.attributesCompleteness * 0.9);
    }
    if (percentage >= 60) {
      return Math.round(this.SIGNAL_WEIGHTS.attributesCompleteness * 0.7);
    }
    if (percentage >= 40) {
      return Math.round(this.SIGNAL_WEIGHTS.attributesCompleteness * 0.5);
    }

    return Math.round(this.SIGNAL_WEIGHTS.attributesCompleteness * 0.2);
  }

  private static scoreImagesUploaded(imageCount: number): number {
    if (imageCount >= 3) {
      return this.SIGNAL_WEIGHTS.imagesUploaded;
    }
    if (imageCount === 2) {
      return Math.round(this.SIGNAL_WEIGHTS.imagesUploaded * 0.8);
    }
    if (imageCount === 1) {
      return Math.round(this.SIGNAL_WEIGHTS.imagesUploaded * 0.6);
    }

    return 0;
  }

  private static scoreDescriptionLength(length: number): number {
    const MIN_LENGTH = 120;
    const OPTIMAL_LENGTH = 300;

    if (length >= OPTIMAL_LENGTH) {
      return this.SIGNAL_WEIGHTS.descriptionLength;
    }
    if (length >= MIN_LENGTH) {
      const percentage = (length / OPTIMAL_LENGTH) * 100;
      return Math.round(this.SIGNAL_WEIGHTS.descriptionLength * (percentage / 100));
    }

    return 0;
  }

  private static scoreCategoryAccuracy(isLeafCategory: boolean): number {
    return isLeafCategory ? this.SIGNAL_WEIGHTS.categoryAccuracy : 0;
  }

  static canPublish(score: QualityScore): boolean {
    return score.isPublishable();
  }

  static getPublishThreshold(): number {
    return 60;
  }

  static getSignalWeights(): Record<string, number> {
    return { ...this.SIGNAL_WEIGHTS };
  }

  static getTotalPossibleScore(): number {
    return Object.values(this.SIGNAL_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
  }
}
