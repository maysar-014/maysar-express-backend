/**
 * SEO Slug Value Object
 * Generates and validates URL-safe slugs for products
 */

export interface SeoSlugInput {
  categorySlug: string;
  brand: string;
  productName: string;
  keyAttribute: string;
}

export class SeoSlug {
  private readonly slug: string;
  private readonly MAX_LENGTH = 300;

  private constructor(slug: string) {
    if (slug.length > this.MAX_LENGTH) {
      throw new Error(`Slug must be ${this.MAX_LENGTH} characters or less`);
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
    }
    if (slug.startsWith('-') || slug.endsWith('-')) {
      throw new Error('Slug cannot start or end with a hyphen');
    }
    this.slug = slug;
  }

  static fromAttributes(input: SeoSlugInput): SeoSlug {
    const parts = [
      input.categorySlug,
      SeoSlug.normalize(input.brand),
      SeoSlug.normalize(input.productName),
      SeoSlug.normalize(input.keyAttribute),
    ].filter(p => p.length > 0);

    const slug = parts.join('-');
    return new SeoSlug(slug);
  }

  static fromString(slug: string): SeoSlug {
    return new SeoSlug(slug);
  }

  private static normalize(text: string): string {
    if (!text) return '';

    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  getValue(): string {
    return this.slug;
  }

  getLength(): number {
    return this.slug.length;
  }

  getSegments(): string[] {
    return this.slug.split('-');
  }

  isValid(): boolean {
    return (
      this.slug.length > 0 &&
      this.slug.length <= this.MAX_LENGTH &&
      /^[a-z0-9-]+$/.test(this.slug) &&
      !this.slug.startsWith('-') &&
      !this.slug.endsWith('-')
    );
  }

  toString(): string {
    return this.slug;
  }

  equals(other: SeoSlug): boolean {
    return this.slug === other.slug;
  }
}
