/**
 * Structured Product Content Value Object
 *
 * Stores the generated product description as named semantic sections
 * instead of one opaque text blob. This allows:
 *  - Frontends to render each section independently (product page,
 *    comparison tables, search cards, SEO pages)
 *  - Regeneration of individual sections without rewriting the whole description
 *  - Clean audit trail of what content was generated and from which source
 *
 * The sections map directly to the GeneratedProductDescription interface
 * from the DescriptionGeneratorEngine, but with richer metadata.
 */

export type ContentSectionType =
  | 'OVERVIEW'
  | 'KEY_FEATURES'
  | 'SPECIFICATIONS'
  | 'USAGE'
  | 'SELLER_OFFER_DELIVERY'
  | 'SELLER_OFFER_LOCATION';

export type ContentSectionSource = 'SELLER_ATTRIBUTE' | 'DERIVED' | 'CATEGORY_TEMPLATE';

export interface ContentSection {
  type: ContentSectionType;
  /** Rendered text content */
  content: string;
  /** Source of the content — for audit and evidence tracing */
  source: ContentSectionSource;
  /** Attribute keys that contributed to this section */
  contributingAttributes: string[];
  /** Whether this section contains seller-offer data (must not leak into canonical product) */
  isSellerOffer: boolean;
}

export interface StructuredProductContentData {
  sections: ContentSection[];
  generatedAt: Date;
  /** Schema version used — for detecting when regeneration is needed */
  schemaVersion: string;
  /** Content version number */
  version: number;
}

export class StructuredProductContent {
  private readonly data: StructuredProductContentData;

  private constructor(data: StructuredProductContentData) {
    this.data = data;
  }

  static create(
    sections: ContentSection[],
    schemaVersion: string,
    version = 1,
  ): StructuredProductContent {
    return new StructuredProductContent({
      sections,
      generatedAt: new Date(),
      schemaVersion,
      version,
    });
  }

  static fromGeneratedDescription(opts: {
    overview: string;
    keyFeatures: string[];
    specifications: Record<string, string>;
    usage: string;
    sellerOffer: { delivery: string; supplierInfo: string };
    schemaVersion: string;
    version?: number;
  }): StructuredProductContent {
    const sections: ContentSection[] = [];

    if (opts.overview) {
      sections.push({
        type: 'OVERVIEW',
        content: opts.overview,
        source: 'CATEGORY_TEMPLATE',
        contributingAttributes: [],
        isSellerOffer: false,
      });
    }

    if (opts.keyFeatures.length > 0) {
      sections.push({
        type: 'KEY_FEATURES',
        content: opts.keyFeatures.join('\n'),
        source: 'SELLER_ATTRIBUTE',
        contributingAttributes: opts.keyFeatures.map(f => f.split(':')[0].trim()),
        isSellerOffer: false,
      });
    }

    const specEntries = Object.entries(opts.specifications);
    if (specEntries.length > 0) {
      sections.push({
        type: 'SPECIFICATIONS',
        content: specEntries.map(([k, v]) => `${k}: ${v}`).join('\n'),
        source: 'SELLER_ATTRIBUTE',
        contributingAttributes: specEntries.map(([k]) => k),
        isSellerOffer: false,
      });
    }

    if (opts.usage) {
      sections.push({
        type: 'USAGE',
        content: opts.usage,
        source: 'SELLER_ATTRIBUTE',
        contributingAttributes: ['usage_context'],
        isSellerOffer: false,
      });
    }

    if (opts.sellerOffer.delivery) {
      sections.push({
        type: 'SELLER_OFFER_DELIVERY',
        content: opts.sellerOffer.delivery,
        source: 'SELLER_ATTRIBUTE',
        contributingAttributes: ['delivery'],
        isSellerOffer: true,
      });
    }

    if (opts.sellerOffer.supplierInfo) {
      sections.push({
        type: 'SELLER_OFFER_LOCATION',
        content: opts.sellerOffer.supplierInfo,
        source: 'SELLER_ATTRIBUTE',
        contributingAttributes: ['supplier_location'],
        isSellerOffer: true,
      });
    }

    return StructuredProductContent.create(sections, opts.schemaVersion, opts.version ?? 1);
  }

  /** Returns only canonical product sections (excludes seller-offer data) */
  getCanonicalSections(): ContentSection[] {
    return this.data.sections.filter(s => !s.isSellerOffer);
  }

  /** Returns only seller-offer sections */
  getSellerOfferSections(): ContentSection[] {
    return this.data.sections.filter(s => s.isSellerOffer);
  }

  /** Returns all sections */
  getAllSections(): ContentSection[] {
    return [...this.data.sections];
  }

  getSection(type: ContentSectionType): ContentSection | undefined {
    return this.data.sections.find(s => s.type === type);
  }

  /** Composes a single canonical description string from non-seller-offer sections */
  composeCanonicalDescription(): string {
    return this.getCanonicalSections()
      .map(s => {
        if (s.type === 'KEY_FEATURES') return `Features: ${s.content.replace(/\n/g, '. ')}.`;
        if (s.type === 'SPECIFICATIONS') return `Specifications: ${s.content.replace(/\n/g, ', ')}.`;
        return s.content;
      })
      .filter(Boolean)
      .join(' ');
  }

  getVersion(): number { return this.data.version; }
  getGeneratedAt(): Date { return this.data.generatedAt; }
  getSchemaVersion(): string { return this.data.schemaVersion; }

  toJSON(): StructuredProductContentData {
    return { ...this.data, sections: [...this.data.sections] };
  }

  static fromJSON(data: StructuredProductContentData): StructuredProductContent {
    return new StructuredProductContent(data);
  }
}
