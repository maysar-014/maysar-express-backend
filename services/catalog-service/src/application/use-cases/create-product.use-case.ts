/**
 * Create Product Use Case
 * Application layer orchestration for product creation
 * Coordinates domain objects to fulfill the create product business use case
 */

import {
  ProductRepository,
  CategoryRepository,
  SellerRepository,
  MediaRepository,
  DomainEventPublisher,
  IdGenerator,
  DateTimeService
} from '../../domain/interfaces';
import { ProductId, SellerId, CategoryId } from '../../domain/value-objects/ids.value-object';
import { Price } from '../../domain/value-objects/monetary.value-object';
import { ProductType } from '../../domain/value-objects/product-types.value-object';

export interface CreateProductRequest {
  sellerId: string;
  name: string;
  description: string;
  price: number;
  currency?: string;
  categoryId: string;
  type: ProductType;
  tags: string[];
  mediaUrls: string[];
  inventoryCount: number;
  attributes: Record<string, any>;
}

export interface CreateProductResponse {
  productId: string;
  status: 'success' | 'validation_error' | 'business_rule_violation';
  message: string;
  violations?: string[];
}

/**
 * Create Product Use Case
 * Orchestrates domain objects to create a new product
 * Validates business rules and coordinates persistence
 */
export class CreateProductUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly sellerRepository: SellerRepository,
    private readonly mediaRepository: MediaRepository,
    private readonly eventPublisher: DomainEventPublisher,
    private readonly idGenerator: IdGenerator,
    private readonly dateTimeService: DateTimeService
  ) {}

  async execute(request: CreateProductRequest): Promise<CreateProductResponse> {
    try {
      // Validate input
      const validation = await this.validateRequest(request);
      if (!validation.isValid) {
        return {
          productId: '',
          status: 'validation_error',
          message: 'Request validation failed',
          violations: validation.violations
        };
      }

      // Check business rules
      const businessRulesCheck = await this.checkBusinessRules(request);
      if (!businessRulesCheck.allowed) {
        return {
          productId: '',
          status: 'business_rule_violation',
          message: businessRulesCheck.reason,
          violations: [businessRulesCheck.reason]
        };
      }

      // Generate product ID
      const productId = ProductId.create(this.idGenerator);

      // Create product entity (would use domain factory in real implementation)
      const product = await this.createProductEntity(request, productId);

      // Save product
      await this.productRepository.save(product);

      // Create and save media if provided
      if (request.mediaUrls.length > 0) {
        await this.createProductMedia(productId, request.mediaUrls);
      }

      // Publish product created event (inventory service will listen and initialize stock)
      await this.eventPublisher.publish({
        eventId: this.idGenerator.generate(),
        eventType: 'ProductCreated',
        aggregateId: productId.toString(),
        version: 1,
        timestamp: this.dateTimeService.now(),
        payload: {
          productId: productId.toString(),
          sellerId: request.sellerId,
          name: request.name,
          price: request.price,
          categoryId: request.categoryId,
          initialInventoryCount: request.inventoryCount
        }
      });

      return {
        productId: productId.toString(),
        status: 'success',
        message: 'Product created successfully'
      };

    } catch (error) {
      // Log error (would use logging service in real implementation)
      console.error('CreateProductUseCase error:', error);

      return {
        productId: '',
        status: 'validation_error',
        message: 'Internal error occurred during product creation',
        violations: ['Internal system error']
      };
    }
  }

  private async validateRequest(request: CreateProductRequest): Promise<{
    isValid: boolean;
    violations: string[];
  }> {
    const violations: string[] = [];

    // Required fields validation
    if (!request.name || request.name.trim().length === 0) {
      violations.push('Product name is required');
    }

    if (!request.description || request.description.trim().length === 0) {
      violations.push('Product description is required');
    }

    if (!request.price || request.price <= 0) {
      violations.push('Valid product price is required');
    }

    if (!request.sellerId) {
      violations.push('Seller ID is required');
    }

    if (!request.categoryId) {
      violations.push('Category ID is required');
    }

    if (!request.type) {
      violations.push('Product type is required');
    }

    // Business rules validation
    if (request.name && request.name.length > 200) {
      violations.push('Product name must be less than 200 characters');
    }

    if (request.description && request.description.length > 5000) {
      violations.push('Product description must be less than 5000 characters');
    }

    if (request.price && request.price > 100000) {
      violations.push('Product price cannot exceed $100,000');
    }

    if (request.tags && request.tags.length > 20) {
      violations.push('Product cannot have more than 20 tags');
    }

    return {
      isValid: violations.length === 0,
      violations
    };
  }

  private async checkBusinessRules(request: CreateProductRequest): Promise<{
    allowed: boolean;
    reason: string;
  }> {
    try {
      // Check if seller exists and is active
      const seller = await this.sellerRepository.findById(request.sellerId);
      if (!seller) {
        return { allowed: false, reason: 'Seller not found' };
      }

      // Check if category exists
      const category = await this.categoryRepository.findById(request.categoryId);
      if (!category) {
        return { allowed: false, reason: 'Category not found' };
      }

      // Check seller product limits (simplified)
      const sellerProducts = await this.productRepository.findBySeller(request.sellerId);
      if (sellerProducts.length >= 1000) { // Example limit
        return { allowed: false, reason: 'Seller has reached maximum product limit' };
      }

      return { allowed: true, reason: '' };

    } catch (error) {
      return { allowed: false, reason: 'Business rule validation failed' };
    }
  }

  private async createProductEntity(request: CreateProductRequest, productId: ProductId): Promise<any> {
    // In a real implementation, this would use a domain factory
    // For now, creating a simplified product entity structure
    return {
      id: productId.toString(),
      sellerId: request.sellerId,
      name: request.name.trim(),
      description: request.description.trim(),
      price: new Price(request.price, request.currency || 'USD'),
      categoryId: request.categoryId,
      type: request.type,
      tags: request.tags || [],
      attributes: request.attributes || {},
      status: 'draft',
      createdAt: this.dateTimeService.now(),
      updatedAt: this.dateTimeService.now()
    };
  }

  private async createProductMedia(productId: ProductId, mediaUrls: string[]): Promise<void> {
    for (let i = 0; i < mediaUrls.length; i++) {
      const media = {
        id: this.idGenerator.generate(),
        productId: productId.toString(),
        url: mediaUrls[i],
        type: this.inferMediaType(mediaUrls[i]),
        order: i,
        createdAt: this.dateTimeService.now()
      };

      await this.mediaRepository.save(media);
    }
  }

  private inferMediaType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return 'image';
    }
    if (['mp4', 'avi', 'mov', 'wmv'].includes(extension || '')) {
      return 'video';
    }
    return 'unknown';
  }
}
