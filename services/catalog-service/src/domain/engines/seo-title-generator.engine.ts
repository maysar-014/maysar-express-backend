/**
 * SEO Title Generator Engine
 * Pure, stateless engine for generating SEO-optimized product titles
 */

export interface SeoTitleInput {
  brand: string;
  productName: string;
  keyAttribute: string;
  categoryKeyword: string;
}

export class SeoTitleGeneratorEngine {
  private static readonly MAX_LENGTH = 70;
  private static readonly MIN_LENGTH = 30;

  static generate(input: SeoTitleInput): string {
    // Pattern: {Brand} {ProductName} {KeyAttribute} – {CategoryKeyword}
    const parts = [
      input.brand,
      input.productName,
      input.keyAttribute,
      input.categoryKeyword,
    ].filter(p => p && p.trim().length > 0);

    let title = parts.join(' ');

    // Truncate if too long
    if (title.length > this.MAX_LENGTH) {
      title = this.truncateSmartly(title, this.MAX_LENGTH);
    }

    // Ensure minimum length
    if (title.length < this.MIN_LENGTH) {
      title = this.expandTitle(input);
    }

    return title;
  }

  private static truncateSmartly(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }

    // Try to truncate at word boundary
    let truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');

    if (lastSpace > maxLength * 0.7) {
      truncated = truncated.substring(0, lastSpace);
    }

    return truncated.trim();
  }

  private static expandTitle(input: SeoTitleInput): string {
    // If title is too short, add more descriptive words
    const descriptors = ['Premium', 'Quality', 'Professional', 'Authentic'];
    const descriptor = descriptors[Math.floor(Math.random() * descriptors.length)];

    return `${descriptor} ${input.brand} ${input.productName}`;
  }

  static validate(title: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (title.length < this.MIN_LENGTH) {
      errors.push(`Title must be at least ${this.MIN_LENGTH} characters`);
    }

    if (title.length > this.MAX_LENGTH) {
      errors.push(`Title must be at most ${this.MAX_LENGTH} characters`);
    }

    if (!/^[a-zA-Z0-9\s\-–—&.,()]+$/.test(title)) {
      errors.push('Title contains invalid characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static getOptimalLength(): number {
    return this.MAX_LENGTH;
  }

  static getRecommendedLength(): number {
    return Math.floor((this.MAX_LENGTH + this.MIN_LENGTH) / 2);
  }
}
