/**
 * Image Quality Policy
 *
 * Goes beyond simply counting images. Evaluates:
 *  - Whether a primary image exists
 *  - Minimum count thresholds
 *  - Duplicate detection (by URL)
 *  - Category-specific coverage expectations
 *
 * Returns a structured report so the quality engine and seller dashboard
 * can surface actionable image improvement guidance.
 */

export type ImageCoverageRequirement =
  | 'front'
  | 'back'
  | 'detail'
  | 'packaging'
  | 'specification_plate'
  | 'ports'
  | 'context';

export interface CategoryImageSpec {
  /** Minimum number of images to reach full score */
  minimumRequired: number;
  /** Recommended number for full score */
  recommended: number;
  /** Coverage types that are expected */
  expectedCoverage: ImageCoverageRequirement[];
}

export interface ImageQualityInput {
  mediaUrls: string[];
  primaryImageUrl?: string;
  categorySlug: string;
}

export interface ImageQualityResult {
  score: number;            // 0-20 (matching the imagesUploaded signal weight)
  imageCount: number;
  uniqueImageCount: number;
  hasPrimaryImage: boolean;
  duplicatesDetected: number;
  meetsMinimum: boolean;
  meetsRecommended: boolean;
  coverageAdvice: string[];
  summary: string;
}

/** Per-category image specifications */
const CATEGORY_IMAGE_SPECS: Record<string, CategoryImageSpec> = {
  'fashion':       { minimumRequired: 2, recommended: 4, expectedCoverage: ['front', 'back', 'detail'] },
  'clothing':      { minimumRequired: 2, recommended: 4, expectedCoverage: ['front', 'back', 'detail'] },
  'electronics':   { minimumRequired: 2, recommended: 4, expectedCoverage: ['front', 'back', 'ports', 'packaging'] },
  'smartphones':   { minimumRequired: 2, recommended: 4, expectedCoverage: ['front', 'back', 'ports', 'packaging'] },
  'phone':         { minimumRequired: 2, recommended: 4, expectedCoverage: ['front', 'back', 'ports', 'packaging'] },
  'laptops':       { minimumRequired: 2, recommended: 5, expectedCoverage: ['front', 'back', 'ports', 'packaging', 'specification_plate'] },
  'industrial':    { minimumRequired: 2, recommended: 4, expectedCoverage: ['front', 'detail', 'specification_plate', 'context'] },
  'food':          { minimumRequired: 1, recommended: 3, expectedCoverage: ['front', 'packaging'] },
  'grocery':       { minimumRequired: 1, recommended: 3, expectedCoverage: ['front', 'packaging'] },
  'cooking-oil':   { minimumRequired: 1, recommended: 3, expectedCoverage: ['front', 'packaging'] },
};

const DEFAULT_SPEC: CategoryImageSpec = {
  minimumRequired: 1,
  recommended: 3,
  expectedCoverage: ['front'],
};

export class ImageQualityPolicy {
  private static readonly MAX_SCORE = 20;

  static evaluate(input: ImageQualityInput): ImageQualityResult {
    const spec = this.resolveSpec(input.categorySlug);
    const urls = (input.mediaUrls ?? []).filter(Boolean);
    const uniqueUrls = new Set(urls);
    const uniqueCount = uniqueUrls.size;
    const duplicates = urls.length - uniqueCount;

    const hasPrimaryImage = !!input.primaryImageUrl ||
      (urls.length > 0 && !!urls[0]);

    const meetsMinimum = uniqueCount >= spec.minimumRequired;
    const meetsRecommended = uniqueCount >= spec.recommended;

    const score = this.computeScore(uniqueCount, hasPrimaryImage, spec);
    const coverageAdvice = this.buildCoverageAdvice(uniqueCount, hasPrimaryImage, duplicates, spec);
    const summary = this.buildSummary(uniqueCount, score, meetsRecommended);

    return {
      score,
      imageCount: urls.length,
      uniqueImageCount: uniqueCount,
      hasPrimaryImage,
      duplicatesDetected: duplicates,
      meetsMinimum,
      meetsRecommended,
      coverageAdvice,
      summary,
    };
  }

  private static resolveSpec(categorySlug: string): CategoryImageSpec {
    const slug = (categorySlug ?? '').toLowerCase();
    for (const [key, spec] of Object.entries(CATEGORY_IMAGE_SPECS)) {
      if (slug.includes(key)) return spec;
    }
    return DEFAULT_SPEC;
  }

  private static computeScore(
    uniqueCount: number,
    hasPrimaryImage: boolean,
    spec: CategoryImageSpec,
  ): number {
    if (!hasPrimaryImage || uniqueCount === 0) return 0;

    // Scale from 0 to MAX_SCORE based on how close to recommended count
    const ratio = Math.min(uniqueCount / spec.recommended, 1);
    const baseScore = Math.round(this.MAX_SCORE * ratio);

    // Penalise if below minimum
    if (uniqueCount < spec.minimumRequired) {
      return Math.round(baseScore * 0.5);
    }

    return baseScore;
  }

  private static buildCoverageAdvice(
    uniqueCount: number,
    hasPrimaryImage: boolean,
    duplicates: number,
    spec: CategoryImageSpec,
  ): string[] {
    const advice: string[] = [];

    if (!hasPrimaryImage) {
      advice.push('Upload at least one image — listings without images cannot be published.');
    }
    if (duplicates > 0) {
      advice.push(`${duplicates} duplicate image${duplicates > 1 ? 's' : ''} detected. Replace with unique views.`);
    }
    if (uniqueCount < spec.minimumRequired) {
      advice.push(
        `Minimum ${spec.minimumRequired} image${spec.minimumRequired > 1 ? 's' : ''} required. ` +
        `You have ${uniqueCount}.`,
      );
    } else if (uniqueCount < spec.recommended) {
      const needed = spec.recommended - uniqueCount;
      advice.push(
        `Add ${needed} more image${needed > 1 ? 's' : ''} to reach the recommended ${spec.recommended}.`,
      );
    }

    if (spec.expectedCoverage.length > 0 && uniqueCount < spec.recommended) {
      advice.push(
        `Recommended coverage for this category: ${spec.expectedCoverage.join(', ')} views.`,
      );
    }

    return advice;
  }

  private static buildSummary(uniqueCount: number, score: number, meetsRecommended: boolean): string {
    if (meetsRecommended) {
      return `${uniqueCount} image${uniqueCount !== 1 ? 's' : ''} — meets recommended coverage.`;
    }
    if (uniqueCount === 0) {
      return 'No images uploaded. Images are required for publication.';
    }
    return `${uniqueCount} image${uniqueCount !== 1 ? 's' : ''} uploaded (${score}/${ImageQualityPolicy.MAX_SCORE} points).`;
  }
}
