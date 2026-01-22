/**
 * Product Entity Tests
 * Tests for domain entities with business rules validation and invariants
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { Product, ProductVariant } from '../../entities/product.entity';
import { ProductId, SellerId, CategoryId } from '../../value-objects/ids.value-object';
import { Price } from '../../value-objects/monetary.value-object';
import { ProductType, ProductVisibility, ProductStatus, ProductStatusValue } from '../../value-objects/product-types.value-object';

describe('Product Entity', () => {
  let validProductData: any;

  beforeEach(() => {
    validProductData = {
      id: 'prod-123',
      name: 'Test Product',
      description: 'A comprehensive test product description',
      price: 99.99,
      category: 'electronics',
      sku: 'TEST-001',
      inventory: 100,
      ownerId: 'user-123'
    };
  });

  describe('Creation', () => {
    it('should create valid product', () => {
      const product = new Product(
        validProductData.id,
        validProductData.name,
        validProductData.description,
        validProductData.price,
        validProductData.category,
        validProductData.sku,
        validProductData.inventory,
        'draft',
        'public',
        validProductData.ownerId
      );

      expect(product.id).toBe(validProductData.id);
      expect(product.name).toBe(validProductData.name);
      expect(product.price).toBe(validProductData.price);
      expect(product.status).toBe('draft');
      expect(product.isPublished()).toBe(false);
    });

    it('should create product with default values', () => {
      const product = new Product(
        validProductData.id,
        validProductData.name,
        validProductData.description,
        validProductData.price,
        validProductData.category,
        validProductData.sku,
        validProductData.inventory,
        undefined, // status
        undefined, // visibility
        validProductData.ownerId
      );

      expect(product.status).toBe('draft');
      expect(product.visibility).toBe('public');
    });

    it('should reject empty name', () => {
      expect(() => new Product(
        validProductData.id,
        '', // empty name
        validProductData.description,
        validProductData.price,
        validProductData.category,
        validProductData.sku,
        validProductData.inventory,
        'draft',
        'public',
        validProductData.ownerId
      )).toThrow('Product name is required');
    });

    it('should reject name exceeding maximum length', () => {
      const longName = 'a'.repeat(101);
      expect(() => new Product(
        validProductData.id,
        longName,
        validProductData.description,
        validProductData.price,
        validProductData.category,
        validProductData.sku,
        validProductData.inventory,
        'draft',
        'public',
        validProductData.ownerId
      )).toThrow('Product name cannot exceed 100 characters');
    });

    it('should reject negative price', () => {
      expect(() => new Product(
        validProductData.id,
        validProductData.name,
        validProductData.description,
        -10, // negative price
        validProductData.category,
        validProductData.sku,
        validProductData.inventory,
        'draft',
        'public',
        validProductData.ownerId
      )).toThrow('Product price cannot be negative');
    });

    it('should reject price exceeding maximum', () => {
      expect(() => new Product(
        validProductData.id,
        validProductData.name,
        validProductData.description,
        2000000, // price too high
        validProductData.category,
        validProductData.sku,
        validProductData.inventory,
        'draft',
        'public',
        validProductData.ownerId
      )).toThrow('Product price cannot exceed maximum allowed');
    });

    it('should reject empty category', () => {
      expect(() => new Product(
        validProductData.id,
        validProductData.name,
        validProductData.description,
        validProductData.price,
        '', // empty category
        validProductData.sku,
        validProductData.inventory,
        'draft',
        'public',
        validProductData.ownerId
      )).toThrow('Product category is required');
    });

    it('should reject empty SKU', () => {
      expect(() => new Product(
        validProductData.id,
        validProductData.name,
        validProductData.description,
        validProductData.price,
        validProductData.category,
        '', // empty SKU
        validProductData.inventory,
        'draft',
        'public',
        validProductData.ownerId
      )).toThrow('Product SKU is required');
    });

    it('should reject negative inventory', () => {
      expect(() => new Product(
        validProductData.id,
        validProductData.name,
        validProductData.description,
        validProductData.price,
        validProductData.category,
        validProductData.sku,
        -5, // negative inventory
        'draft',
        'public',
        validProductData.ownerId
      )).toThrow('Product inventory cannot be negative');
    });

    it('should reject empty owner', () => {
      expect(() => new Product(
        validProductData.id,
        validProductData.name,
        validProductData.description,
        validProductData.price,
        validProductData.category,
        validProductData.sku,
        validProductData.inventory,
        'draft',
        'public',
        '' // empty owner
      )).toThrow('Product owner is required');
    });
  });

  describe('Publishing', () => {
    let draftProduct: Product;

    beforeEach(() => {
      draftProduct = new Product(
        validProductData.id,
        validProductData.name,
        validProductData.description,
        validProductData.price,
        validProductData.category,
        validProductData.sku,
        validProductData.inventory,
        'draft',
        'public',
        validProductData.ownerId
      );
    });

    it('should publish valid draft product', () => {
      const publishedProduct = draftProduct.publish();

      expect(publishedProduct.status).toBe('published');
      expect(publishedProduct.isPublished()).toBe(true);
      expect(publishedProduct.publishedAt).toBeDefined();
      expect(publishedProduct.updatedAt.getTime()).toBeGreaterThanOrEqual(draftProduct.updatedAt.getTime());
    });

    it('should reject publishing already published product', () => {
      const publishedProduct = draftProduct.publish();

      expect(() => publishedProduct.publish()).toThrow('Only draft products can be published');
    });

    it('should reject publishing incomplete product', () => {
      const incompleteProduct = new Product(
        validProductData.id,
        'Hi', // too short name
        'Short', // too short description
        0, // invalid price
        validProductData.category,
        validProductData.sku,
        validProductData.inventory,
        'draft',
        'public',
        validProductData.ownerId
      );

      expect(() => incompleteProduct.publish()).toThrow('Product is not ready for publishing');
    });

    it('should set publishedAt timestamp', () => {
      const beforePublish = new Date();
      const publishedProduct = draftProduct.publish();
      const afterPublish = new Date();

      expect(publishedProduct.publishedAt!.getTime()).toBeGreaterThanOrEqual(beforePublish.getTime());
      expect(publishedProduct.publishedAt!.getTime()).toBeLessThanOrEqual(afterPublish.getTime());
    });
  });

  describe('Archiving', () => {
    let product: Product;

    beforeEach(() => {
      product = new Product(
        validProductData.id,
        validProductData.name,
        validProductData.description,
        validProductData.price,
        validProductData.category,
        validProductData.sku,
        validProductData.inventory,
        'published',
        'public',
        validProductData.ownerId
      );
    });

    it('should archive product', () => {
      const archivedProduct = product.archive();

      expect(archivedProduct.status).toBe('archived');
      expect(archivedProduct.isArchived()).toBe(true);
      expect(archivedProduct.updatedAt.getTime()).toBeGreaterThanOrEqual(product.updatedAt.getTime());
    });

    it('should preserve publishedAt when archiving', () => {
      const archivedProduct = product.archive();

      expect(archivedProduct.publishedAt).toEqual(product.publishedAt);
    });

    it('should allow archiving draft products', () => {
      const draftProduct = new Product(
        validProductData.id,
        validProductData.name,
        validProductData.description,
        validProductData.price,
        validProductData.category,
        validProductData.sku,
        validProductData.inventory,
        'draft',
        'public',
        validProductData.ownerId
      );

      const archivedProduct = draftProduct.archive();
      expect(archivedProduct.status).toBe('archived');
    });
  });

  describe('Updates', () => {
    let product: Product;

    beforeEach(() => {
      product = new Product(
        validProductData.id,
        validProductData.name,
        validProductData.description,
        validProductData.price,
        validProductData.category,
        validProductData.sku,
        validProductData.inventory,
        'draft',
        'public',
        validProductData.ownerId
      );
    });

    it('should update product name', () => {
      const updatedProduct = product.update({ name: 'Updated Product Name' });

      expect(updatedProduct.name).toBe('Updated Product Name');
      expect(updatedProduct.updatedAt.getTime()).toBeGreaterThanOrEqual(product.updatedAt.getTime());
      expect(updatedProduct.id).toBe(product.id); // immutable properties
    });

    it('should update multiple properties', () => {
      const updatedProduct = product.update({
        name: 'Updated Name',
        price: 149.99,
        inventory: 50,
        visibility: 'private'
      });

      expect(updatedProduct.name).toBe('Updated Name');
      expect(updatedProduct.price).toBe(149.99);
      expect(updatedProduct.inventory).toBe(50);
      expect(updatedProduct.visibility).toBe('private');
    });

    it('should preserve unchanged properties', () => {
      const updatedProduct = product.update({ price: 199.99 });

      expect(updatedProduct.name).toBe(product.name);
      expect(updatedProduct.description).toBe(product.description);
      expect(updatedProduct.category).toBe(product.category);
      expect(updatedProduct.sku).toBe(product.sku); // SKU should not change
    });

    it('should validate updated data', () => {
      expect(() => product.update({ name: '' })).toThrow('Product name is required');
      expect(() => product.update({ price: -10 })).toThrow('Product price cannot be negative');
      expect(() => product.update({ inventory: -5 })).toThrow('Product inventory cannot be negative');
    });

    it('should create new instance for updates', () => {
      const updatedProduct = product.update({ name: 'New Name' });

      expect(updatedProduct).not.toBe(product);
      expect(updatedProduct.name).not.toBe(product.name);
    });
  });

  describe('Business Logic', () => {
    let product: Product;

    beforeEach(() => {
      product = new Product(
        validProductData.id,
        validProductData.name,
        validProductData.description,
        validProductData.price,
        validProductData.category,
        validProductData.sku,
        validProductData.inventory,
        'published',
        'public',
        validProductData.ownerId
      );
    });

    it('should check ownership correctly', () => {
      expect(product.isOwnedBy(validProductData.ownerId)).toBe(true);
      expect(product.isOwnedBy('different-user')).toBe(false);
    });

    it('should identify published products', () => {
      expect(product.isPublished()).toBe(true);
      expect(product.isArchived()).toBe(false);
      expect(product.isPublic()).toBe(true);
    });

    it('should identify archived products', () => {
      const archivedProduct = product.archive();

      expect(archivedProduct.isPublished()).toBe(false);
      expect(archivedProduct.isArchived()).toBe(true);
      expect(archivedProduct.isPublic()).toBe(false); // archived products are not public
    });

    it('should identify draft products', () => {
      const draftProduct = new Product(
        validProductData.id,
        validProductData.name,
        validProductData.description,
        validProductData.price,
        validProductData.category,
        validProductData.sku,
        validProductData.inventory,
        'draft',
        'public',
        validProductData.ownerId
      );

      expect(draftProduct.isPublished()).toBe(false);
      expect(draftProduct.isArchived()).toBe(false);
      expect(draftProduct.isPublic()).toBe(false); // draft products are not public
    });

    it('should calculate age correctly', () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000));

      const oldProduct = new Product(
        validProductData.id,
        validProductData.name,
        validProductData.description,
        validProductData.price,
        validProductData.category,
        validProductData.sku,
        validProductData.inventory,
        'published',
        'public',
        validProductData.ownerId,
        twoDaysAgo
      );

      expect(oldProduct.getAgeInDays()).toBe(2);
    });

    it('should identify products needing restocking', () => {
      expect(product.needsRestocking(10)).toBe(false); // inventory is 100
      expect(product.needsRestocking(150)).toBe(true); // inventory below threshold

      const lowStockProduct = product.update({ inventory: 5 });
      expect(lowStockProduct.needsRestocking(10)).toBe(true);
    });

    it('should not flag draft products for restocking', () => {
      const draftProduct = new Product(
        validProductData.id,
        validProductData.name,
        validProductData.description,
        validProductData.price,
        validProductData.category,
        validProductData.sku,
        5, // low inventory
        'draft',
        'public',
        validProductData.ownerId
      );

      expect(draftProduct.needsRestocking(10)).toBe(false); // draft products don't need restocking
    });
  });

  describe('Invariants and Immutability', () => {
    it('should maintain immutable identity', () => {
      const product1 = new Product(
        validProductData.id,
        validProductData.name,
        validProductData.description,
        validProductData.price,
        validProductData.category,
        validProductData.sku,
        validProductData.inventory,
        'draft',
        'public',
        validProductData.ownerId
      );

      const product2 = product1.update({ name: 'New Name' });
      const product3 = product2.publish();

      expect(product1.id).toBe(product2.id);
      expect(product2.id).toBe(product3.id);
      expect(product1.ownerId).toBe(product2.ownerId);
      expect(product2.ownerId).toBe(product3.ownerId);
      expect(product1.createdAt).toEqual(product2.createdAt);
      expect(product2.createdAt).toEqual(product3.createdAt);
    });

    it('should preserve business rules across state changes', () => {
      const draftProduct = new Product(
        validProductData.id,
        validProductData.name,
        validProductData.description,
        validProductData.price,
        validProductData.category,
        validProductData.sku,
        validProductData.inventory,
        'draft',
        'public',
        validProductData.ownerId
      );

      // Update should preserve validity
      const updatedProduct = draftProduct.update({ price: 199.99 });
      expect(updatedProduct.price).toBe(199.99);

      // Publishing should preserve validity
      const publishedProduct = updatedProduct.publish();
      expect(publishedProduct.isPublished()).toBe(true);
      expect(publishedProduct.price).toBe(199.99);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero values appropriately', () => {
      const freeProduct = new Product(
        validProductData.id,
        validProductData.name,
        validProductData.description,
        0, // free product
        validProductData.category,
        validProductData.sku,
        0, // no inventory
        'draft',
        'public',
        validProductData.ownerId
      );

      expect(freeProduct.price).toBe(0);
      expect(freeProduct.inventory).toBe(0);
      expect(freeProduct.needsRestocking(10)).toBe(false); // draft product
    });

    it('should handle boundary values', () => {
      const boundaryProduct = new Product(
        validProductData.id,
        'a'.repeat(100), // max name length
        validProductData.description,
        999999.99, // max price
        validProductData.category,
        validProductData.sku,
        validProductData.inventory,
        'draft',
        'public',
        validProductData.ownerId
      );

      expect(boundaryProduct.name.length).toBe(100);
      expect(boundaryProduct.price).toBe(999999.99);
    });

    it('should handle unicode characters', () => {
      const unicodeProduct = new Product(
        validProductData.id,
        '产品名称', // Chinese characters
        '📱 Smartphone with amazing features',
        validProductData.price,
        'electronics',
        'UNI-001',
        validProductData.inventory,
        'draft',
        'public',
        validProductData.ownerId
      );

      expect(unicodeProduct.name).toBe('产品名称');
      expect(unicodeProduct.description).toContain('📱');
    });
  });
});
