// @ts-nocheck
/**
 * Preview Generated Description Use Case
 * Generates and returns preview of product description without saving
 */

import { StructuredCreateProductDto, GeneratedDescriptionDto } from '../dto/product.dto';
import { StructuredProductAttributes } from '../../domain/value-objects/product-attributes.value-object';
import { DescriptionGeneratorEngine } from '../../domain/engines/description-generator.engine';
import { SeoTitleGeneratorEngine } from '../../domain/engines/seo-title-generator.engine';
import { SeoSlug } from '../../domain/value-objects/seo-slug.value-object';
import { ProductQualityPolicy } from '../../domain/policies/product-quality.policy';

export interface IPreviewRepository {
  findCategoryById(categoryId: string): Promise<any | null>;
  findCategoryAttributesByCategory(categoryId: string): Promise<any[]>;
}

export class PreviewGeneratedDescriptionUseCase {
  constructor(private readonly repository: IPreviewRepository) {}

  async execute(dto: Omit<StructuredCreateProductDto, 'mediaUrls' | 'price'>): Promise<GeneratedDescriptionDto> {
    // Load category
    const category = await this.repository.findCategoryById(dto.categoryId);
    if (!category) {
      throw new Error(`Category not found: ${dto.categoryId}`);
    }

    // Load category attributes schema
    const schemaData = await this.repository.findCategoryAttributesByCategory(dto.categoryId);
    const schema = schemaData.map(s => ({
      id: s.id,
      name: s.name,
      displayLabel: s.displayLabel,
      type: s.type,
      options: s.options ? (typeof s.options === 'string' ? JSON.parse(s.options) : s.options) : undefined,
      isRequired: s.isRequired,
      placeholder: s.placeholder,
    }));

    // Validate and create structured attributes
    const attributes = StructuredProductAttributes.create(dto.structuredAttributes, schema);

    // Generate description
    const generatedDesc = DescriptionGeneratorEngine.generate(
      attributes,
      category.slug,
      dto.productName,
      dto.brand
    );

    // Generate SEO title
    const keyAttribute = attributes.getKeyAttribute();
    const seoTitle = SeoTitleGeneratorEngine.generate({
      brand: dto.brand,
      productName: dto.productName,
      keyAttribute,
      categoryKeyword: category.name,
    });

    // Generate slug
    const slug = SeoSlug.fromAttributes({
      categorySlug: category.slug,
      brand: dto.brand,
      productName: dto.productName,
      keyAttribute,
    });

    // Compose full description
    const fullDescription = `${generatedDesc.overview} ${generatedDesc.keyFeatures.join(' ')} Specifications: ${Object.entries(generatedDesc.specifications)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')} ${generatedDesc.usage} ${generatedDesc.delivery}`;

    // Compute quality score
    const qualityScore = ProductQualityPolicy.computeScore({
      brand: dto.brand,
      productName: dto.productName,
      keyAttribute,
      requiredAttributesFilled: schema.filter(s => s.isRequired && dto.structuredAttributes[s.name]).length,
      totalRequiredAttributes: schema.filter(s => s.isRequired).length,
      imageCount: 0, // Not provided in preview
      descriptionLength: fullDescription.length,
      isLeafCategory: !category.children || category.children.length === 0,
    });

    return {
      seoTitle,
      shortSeoDescription: fullDescription.substring(0, 160),
      fullDescription: {
        overview: generatedDesc.overview,
        keyFeatures: generatedDesc.keyFeatures,
        specifications: generatedDesc.specifications,
        usage: generatedDesc.usage,
        delivery: generatedDesc.delivery,
        supplierInfo: generatedDesc.supplierInfo,
      },
      qualityScore: qualityScore.getValue(),
      scoreBreakdown: qualityScore.getScoreBreakdown(),
      slug: slug.getValue(),
    };
  }
}
