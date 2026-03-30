import { StructuredCreateProductDto } from '../dto/product.dto';
import { CategoryAttributeSchema, StructuredProductAttributes } from '../../domain/value-objects/product-attributes.value-object';
import { DescriptionGeneratorEngine } from '../../domain/engines/description-generator.engine';
import { SeoTitleGeneratorEngine } from '../../domain/engines/seo-title-generator.engine';
import { SeoSlug } from '../../domain/value-objects/seo-slug.value-object';
import { ProductQualityPolicy } from '../../domain/policies/product-quality.policy';
import { DescriptionValidationPolicy } from '../../domain/policies/description-validation.policy';
import { DomainError } from '../../domain/errors/domain.error';
import { getModelPrefix, makeId } from '@shared/ids/id';

export interface CreateProductResponse {
  productId: string;
  status: 'success' | 'validation_error' | 'business_rule_violation';
  message: string;
  violations?: string[];
}

export interface ProductPersistenceDto {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  categoryId: string;
  brand: string;
  slug: string;
  seoTitle: string;
  shortSeoDescription: string;
  generatedDescription: string;
  qualityScore: number;
  status: string;
  visibility: string;
  tags: string[];
  enablerEnabled?: boolean;
  enablerCommissionRate?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProductRepository {
  saveWithAttributesTransaction(
    persistenceDto: ProductPersistenceDto,
    productId: string,
    attributes: Array<{ attributeId: string; value: string }>
  ): Promise<void>;
}

type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
  [key: string]: unknown;
};

type CategoryAttributeRecord = {
  id: string;
  name: string;
  displayLabel: string;
  type: string;
  options?: unknown;
  isRequired?: boolean;
  placeholder?: string;
};

interface CategoryRepositoryLike {
  findById(id: string): Promise<CategoryRecord | null>;
}

interface CategoryAttributeRepositoryLike {
  findByCategory(categoryId: string): Promise<CategoryAttributeRecord[]>;
}

interface EventPublisherLike {
  publish(event: unknown): Promise<void>;
}

interface IdGeneratorLike {
  generate(): string;
}

interface DateTimeServiceLike {
  now(): Date;
}

export class CreateProductUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly categoryRepository: CategoryRepositoryLike,
    private readonly categoryAttributeRepository: CategoryAttributeRepositoryLike,
    private readonly productAttributeRepository: unknown,
    private readonly eventPublisher: EventPublisherLike,
    private readonly idGenerator: IdGeneratorLike,
    private readonly dateTimeService: DateTimeServiceLike
  ) {}

  async execute(dto: StructuredCreateProductDto): Promise<CreateProductResponse> {
    try {
      const category = await this.categoryRepository.findById(dto.categoryId);
      if (!category) {
        return { productId: '', status: 'validation_error', message: 'Category not found', violations: ['Category not found'] };
      }

      const schemaData = await this.categoryAttributeRepository.findByCategory(dto.categoryId);
      const schema: CategoryAttributeSchema[] = schemaData.map((s) => ({
        id: s.id,
        name: s.name,
        displayLabel: s.displayLabel,
        type: s.type as CategoryAttributeSchema['type'],
        options: Array.isArray(s.options) ? s.options.filter((option): option is string => typeof option === 'string') : undefined,
        isRequired: Boolean(s.isRequired),
        placeholder: s.placeholder,
      }));

      const attributes = StructuredProductAttributes.create(dto.structuredAttributes, schema);

      const generatedDesc = DescriptionGeneratorEngine.generate(
        attributes,
        category.slug,
        dto.productName,
        dto.brand
      );

      const keyAttribute = attributes.getKeyAttribute();
      const seoTitle = SeoTitleGeneratorEngine.generate({
        brand: dto.brand,
        productName: dto.productName,
        keyAttribute,
        categoryKeyword: category.name,
      });

      const slug = SeoSlug.fromAttributes({
        categorySlug: category.slug,
        brand: dto.brand,
        productName: dto.productName,
        keyAttribute,
      });

      const composedDescription = `${generatedDesc.overview} ${generatedDesc.keyFeatures.join(' ')} Specifications: ${Object.entries(generatedDesc.specifications).map(([k, v]) => `${k}: ${v}`).join(', ')} ${generatedDesc.usage} ${generatedDesc.delivery}`;
      
      const validationResult = DescriptionValidationPolicy.validate(
        composedDescription,
        dto.productName,
        [category.name, category.slug]
      );

      if (!validationResult.isValid) {
        return {
          productId: '',
          status: 'validation_error',
          message: 'Description validation failed',
          violations: validationResult.violatedRules,
        };
      }

      const qualityScore = ProductQualityPolicy.computeScore({
        brand: dto.brand,
        productName: dto.productName,
        keyAttribute,
        requiredAttributesFilled: schema.filter((s) => s.isRequired && dto.structuredAttributes[s.name]).length,
        totalRequiredAttributes: schema.filter((s) => s.isRequired).length,
        imageCount: dto.mediaUrls?.length || 0,
        descriptionLength: composedDescription.length,
        isLeafCategory: true,
      });

      if (!qualityScore.isPublishable()) {
        throw new DomainError(
          `Quality score ${qualityScore.getValue()} is below publish threshold of 60`,
          'QUALITY_SCORE_TOO_LOW'
        );
      }

      const productId = makeId(getModelPrefix('Catalog_Product'));
      const now = this.dateTimeService.now();

      const persistenceDto: ProductPersistenceDto = {
        id: productId,
        sellerId: dto.sellerId,
        title: dto.productName,
        description: composedDescription,
        categoryId: dto.categoryId,
        brand: dto.brand,
        slug: slug.getValue(),
        seoTitle,
        shortSeoDescription: composedDescription.substring(0, 160),
        generatedDescription: JSON.stringify(generatedDesc),
        qualityScore: qualityScore.getValue(),
        status: 'published',
        visibility: 'public',
        tags: [],
        enablerEnabled: dto.enablerEnabled ?? false,
        enablerCommissionRate: dto.enablerCommissionRate,
        createdAt: now,
        updatedAt: now,
      };

      const attributesToSave = schema
        .filter((s) => dto.structuredAttributes[s.name])
        .map((s) => ({
          attributeId: s.id,
          value: dto.structuredAttributes[s.name],
        }));

      await this.productRepository.saveWithAttributesTransaction(persistenceDto, productId, attributesToSave);

      await this.eventPublisher.publish({
        eventId: this.idGenerator.generate(),
        eventType: 'ProductCreated',
        aggregateId: productId,
        version: 1,
        timestamp: now,
        payload: {
          productId,
          sellerId: dto.sellerId,
          name: dto.productName,
          categoryId: dto.categoryId,
          brand: dto.brand,
          slug: slug.getValue(),
          price: 0,
        },
      });

      await this.eventPublisher.publish({
        eventId: this.idGenerator.generate(),
        eventType: 'ProductCreatedWithStructuredData',
        aggregateId: productId,
        version: 1,
        timestamp: now,
        payload: {
          productId,
          sellerId: dto.sellerId,
          slug: slug.getValue(),
          categorySlug: category.slug,
          supplierLocation: dto.supplierLocation,
          brand: dto.brand,
          seoTitle,
          qualityScore: qualityScore.getValue(),
        },
      });

      return {
        productId,
        status: 'success',
        message: 'Product created successfully',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (error instanceof DomainError) {
        return {
          productId: '',
          status: 'business_rule_violation',
          message,
          violations: [message],
        };
      }

      if (message.includes('Unique constraint failed') && message.includes('slug')) {
        return {
          productId: '',
          status: 'business_rule_violation',
          message: 'Product slug already exists',
          violations: [message],
        };
      }

      console.error('CreateProductUseCase error:', error);
      return {
        productId: '',
        status: 'validation_error',
        message: 'Internal error occurred',
        violations: [message],
      };
    }
  }
}
