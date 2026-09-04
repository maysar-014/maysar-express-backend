import { StructuredCreateProductDto } from '../dto/product.dto';
import { CategoryAttributeSchema, StructuredProductAttributes } from '../../domain/value-objects/product-attributes.value-object';
import { DescriptionGeneratorEngine } from '../../domain/engines/description-generator.engine';
import { SeoTitleGeneratorEngine } from '../../domain/engines/seo-title-generator.engine';
import { SeoSlug } from '../../domain/value-objects/seo-slug.value-object';
import { ProductQualityPolicy } from '../../domain/policies/product-quality.policy';
import { DescriptionValidationPolicy } from '../../domain/policies/description-validation.policy';
import { ConsistencyValidationPolicy } from '../../domain/policies/consistency-validation.policy';
import { ProductContentVersion } from '../../domain/value-objects/product-content-version.value-object';
import { AttributeAliasResolver } from '../../domain/engines/attribute-alias-resolver';
import { NormalizationAlgorithm } from '../../domain/algorithms/normalization.algorithm';
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
  supplierLocationId?: string;
  supplierLocation: string;
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
  seoMetadata?: Record<string, unknown>;
  mediaUrls?: string[];
  basePrice?: number;
  currency?: string;
  enablerEnabled?: boolean;
  enablerCommissionRate?: number;
  codAccepted?: boolean;
  freeDelivery?: boolean;
  condition?: string;
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

interface CatalogSearchIndexerLike {
  syncProductById(productId: string): Promise<'indexed' | 'removed' | 'skipped'>;
}

interface SavedSellerLocationRecord {
  id: string;
  sellerId: string;
  businessId: string;
  city: string;
  region: string;
  country: string;
  displayName: string;
  isPrimary: boolean;
}

interface SellerLocationRepositoryLike {
  findByIdForSeller(locationId: string, sellerId: string): Promise<SavedSellerLocationRecord | null>;
}

export class CreateProductUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly categoryRepository: CategoryRepositoryLike,
    private readonly categoryAttributeRepository: CategoryAttributeRepositoryLike,
    private readonly productAttributeRepository: unknown,
    private readonly sellerLocationRepository: SellerLocationRepositoryLike,
    private readonly eventPublisher: EventPublisherLike,
    private readonly idGenerator: IdGeneratorLike,
    private readonly dateTimeService: DateTimeServiceLike,
    private readonly catalogSearchIndexer?: CatalogSearchIndexerLike
  ) {}

  async execute(dto: StructuredCreateProductDto): Promise<CreateProductResponse> {
    try {
      const supplierLocationId = dto.supplierLocationId?.trim();
      const typedSupplierLocation = dto.supplierLocation?.trim();
      if (!supplierLocationId && !typedSupplierLocation) {
        return {
          productId: '',
          status: 'validation_error',
          message: 'Supplier location is required',
          violations: ['Supplier location is required'],
        };
      }

      // ── Resolve supplier location ──────────────────────────────────────────
      // New seller locations use sloc_ prefix (Catalog_SellerLocation table).
      // Legacy locations use BusinessAddress IDs from the business registry.
      let savedLocation: SavedSellerLocationRecord | null = null;
      if (supplierLocationId) {
        if (supplierLocationId.startsWith('sloc_')) {
          // Look up from new Catalog_SellerLocation table
          try {
            const prisma = (globalThis as any).prisma;
            const row = await prisma?.catalog_SellerLocation?.findFirst?.({
              where: { id: supplierLocationId, sellerId: dto.sellerId, isActive: true },
              select: { id: true, sellerId: true, name: true, street: true, ward: true, district: true, region: true, country: true, isPrimary: true },
            });
            if (!row) {
              return {
                productId: '',
                status: 'validation_error',
                message: 'Seller location not found',
                violations: ['Seller location not found'],
              };
            }
            savedLocation = {
              id: row.id,
              sellerId: row.sellerId,
              businessId: row.sellerId,
              city: row.district ?? row.region ?? '',
              region: row.region ?? '',
              country: row.country ?? 'Tanzania',
              displayName: [row.street, row.ward, row.district, row.region].filter(Boolean).join(', '),
              isPrimary: row.isPrimary,
            };
          } catch (locErr: any) {
            console.warn('[CreateProductUseCase] Seller location lookup failed:', locErr?.message);
            return {
              productId: '',
              status: 'validation_error',
              message: 'Seller location lookup failed',
              violations: ['Seller location lookup failed'],
            };
          }
        } else {
          // Legacy: look up from BusinessAddress via old repository
          savedLocation = await this.sellerLocationRepository.findByIdForSeller(supplierLocationId, dto.sellerId);
          if (!savedLocation) {
            return {
              productId: '',
              status: 'validation_error',
              message: 'Saved supplier location not found for seller',
              violations: ['Saved supplier location not found for seller'],
            };
          }
        }
      }

      const supplierLocation = savedLocation?.displayName ?? typedSupplierLocation!;

      const category = await this.categoryRepository.findById(dto.categoryId);
      if (!category) {
        return { productId: '', status: 'validation_error', message: 'Category not found', violations: ['Category not found'] };
      }

      const schemaData = await this.categoryAttributeRepository.findByCategory(dto.categoryId);
      const schemaByName = new Map<string, CategoryAttributeSchema>();
      for (const s of schemaData) {
        const name = s.name.trim();
        if (!name || schemaByName.has(name)) continue;
        schemaByName.set(name, {
          id: s.id,
          name,
          displayLabel: s.displayLabel,
          type: s.type as CategoryAttributeSchema['type'],
          options: Array.isArray(s.options) ? s.options.filter((option): option is string => typeof option === 'string') : undefined,
          isRequired: Boolean(s.isRequired),
          placeholder: s.placeholder,
        });
      }
      const schema = Array.from(schemaByName.values());

      const attributes = StructuredProductAttributes.create(dto.structuredAttributes, schema);

      // ── Normalise + alias-resolve raw seller attributes before generation ──
      const resolvedAttributes = AttributeAliasResolver.resolveAll(dto.structuredAttributes);
      const normalisedAttributes: Record<string, string> = {};
      for (const [key, value] of Object.entries(resolvedAttributes)) {
        normalisedAttributes[key] = NormalizationAlgorithm.normalizeByAttributeKey(key, value);
      }

      // ── Consistency validation — check for contradictions before publishing ──
      const consistencyResult = ConsistencyValidationPolicy.validate(
        dto.productName,
        normalisedAttributes,
        category.name,
      );
      if (consistencyResult.hasBlockingConflicts) {
        return {
          productId: '',
          status: 'validation_error',
          message: 'Product data contains conflicting information',
          violations: consistencyResult.conflicts
            .filter(c => c.severity === 'CRITICAL')
            .map(c => c.message),
        };
      }

      const generatedDesc = DescriptionGeneratorEngine.generate(
        attributes,
        category.slug,
        dto.productName,
        dto.brand,
        schema,
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

      const specificationText = Object.entries(generatedDesc.specifications).map(([key, value]) => `${key}: ${value}`).join(', ');
      const featureText = generatedDesc.keyFeatures.length > 0 ? 'Features: ' + generatedDesc.keyFeatures.join('. ') + '.' : '';
      // Canonical description: product facts only — seller-offer data (delivery, location)
      // is intentionally excluded to maintain Product / SellerOffer separation.
      const composedDescription = [
        generatedDesc.overview,
        featureText,
        specificationText ? `Specifications: ${specificationText}.` : '',
        generatedDesc.usage,
      ].filter(Boolean).join(' ');

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

      // ── Content version tracking ───────────────────────────────────────────
      const contentVersion = ProductContentVersion.createInitial({
        brand: dto.brand,
        productName: dto.productName,
        categorySlug: category.slug,
        attributes: normalisedAttributes,
        schemaVersion: `schema-${schema.length}`,
      });

      const persistenceDto: ProductPersistenceDto = {
        id: productId,
        sellerId: dto.sellerId,
        title: dto.productName,
        description: composedDescription,
        // Only write supplierLocationId if it references a BusinessAddress (legacy).
        // New Catalog_SellerLocation IDs (sloc_ prefix) must NOT be written here —
        // they don't exist in businessregistry_business_addresses and would violate the FK.
        // Inventory for sloc_ locations is managed via Catalog_ProductLocation instead.
        supplierLocationId: savedLocation?.id?.startsWith('sloc_') ? undefined : savedLocation?.id,
        supplierLocation,
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
        seoMetadata: {
          currency: dto.currency || 'TZS',
          // Store sloc_ IDs in seoMetadata for reference only (not a DB FK)
          supplierLocationId: savedLocation?.id,
          supplierLocation,
          minimumOrderQuantity: dto.minimumOrderQuantity,
          mediaUrls: dto.mediaUrls || [],
          // Content version metadata — enables deterministic regeneration
          contentVersion: contentVersion.toJSON(),
          // Non-blocking consistency warnings surfaced to operations teams
          consistencyWarnings: consistencyResult.conflicts
            .filter(c => c.severity === 'WARNING')
            .map(c => c.message),
          // Seller-offer data stored separately — never bleeds into canonical description
          sellerOffer: generatedDesc.sellerOffer,
        },
        mediaUrls: dto.mediaUrls || [],
        basePrice: dto.price,
        currency: dto.currency || 'TZS',
        enablerEnabled: dto.enablerEnabled ?? false,
        enablerCommissionRate: dto.enablerCommissionRate,
        codAccepted: dto.codAccepted ?? false,
        freeDelivery: dto.freeDelivery ?? false,
        condition: dto.condition ?? 'new',
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

      // ── Auto-attach product to Catalog_SellerLocation inventory ─────────────
      // If supplierLocationId is a sloc_ prefixed ID (Catalog_SellerLocation),
      // automatically create the Catalog_ProductLocation record so the seller
      // does not need a separate API call.
      const isNewSellerLocation = savedLocation?.id?.startsWith('sloc_') ||
        (supplierLocationId?.startsWith('sloc_'));
      if (isNewSellerLocation && supplierLocationId && (dto.inventoryCount ?? 0) >= 0) {
        try {
          const prisma = (globalThis as any).prisma;
          if (prisma?.catalog_ProductLocation) {
            await prisma.catalog_ProductLocation.upsert({
              where: { productId_locationId: { productId, locationId: supplierLocationId } },
              create: {
                id: makeId('ploc'),
                productId,
                locationId: supplierLocationId,
                sellerId: dto.sellerId,
                quantityAvailable: dto.inventoryCount ?? 0,
                quantityReserved: 0,
                isAvailable: (dto.inventoryCount ?? 0) > 0,
                createdAt: now,
                updatedAt: now,
              },
              update: {
                quantityAvailable: dto.inventoryCount ?? 0,
                isAvailable: (dto.inventoryCount ?? 0) > 0,
                updatedAt: now,
              },
            });
          }
        } catch (inventoryErr: any) {
          // Non-fatal — seller can attach inventory manually
          console.warn('[CreateProductUseCase] Auto-attach inventory failed (non-fatal):', inventoryErr?.message);
        }
      }

      // The default variant ID is deterministic — matches what saveWithAttributesTransaction creates
      const defaultVariantId = `${productId}-default-variant`;

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
          price: dto.price ?? 0,
          // Variant and inventory info for inventory service to initialize stock
          variantId: defaultVariantId,
          sku: `${slug.getValue()}-default`,
          initialInventoryCount: dto.inventoryCount ?? 0,
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
          supplierLocationId: savedLocation?.id,
          supplierLocation,
          brand: dto.brand,
          seoTitle,
          qualityScore: qualityScore.getValue(),
        },
      });

      if (this.catalogSearchIndexer && persistenceDto.status === 'published' && persistenceDto.visibility === 'public') {
        await this.catalogSearchIndexer.syncProductById(productId);
      }

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

      if (message.includes('Unique constraint failed') && (message.includes('slug') || message.includes('catalog_products_sellerId_slug_key'))) {
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
