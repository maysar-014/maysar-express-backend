/**
 * Visibility Policies Tests
 * Tests for domain business policies with rule validation and edge cases
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock domain policies (since they don't exist yet, we'll create test stubs)
interface UserContext {
  userId: string;
  roles: string[];
  permissions: string[];
  isAuthenticated: boolean;
  subscriptionTier?: string;
  region?: string;
}

interface ProductContext {
  id: string;
  category: string;
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'private' | 'restricted';
  ownerId: string;
  tags: string[];
  price: number;
  inventory: number;
  createdAt: Date;
  publishedAt?: Date;
  description?: string;
}

class VisibilityPolicies {
  /**
   * Check if user can view a product
   */
  canViewProduct(user: UserContext, product: ProductContext): boolean {
    // Public products are visible to everyone
    if (product.visibility === 'public' && product.status === 'published') {
      return true;
    }

    // Private products only visible to owner
    if (product.visibility === 'private') {
      return user.isAuthenticated && user.userId === product.ownerId;
    }

    // Restricted products require specific permissions or roles
    if (product.visibility === 'restricted') {
      return this.hasRestrictedAccess(user, product);
    }

    // Draft products only visible to owner or admins
    if (product.status === 'draft') {
      return user.isAuthenticated &&
             (user.userId === product.ownerId || user.roles.includes('admin'));
    }

    // Archived products only visible to admins
    if (product.status === 'archived') {
      return user.roles.includes('admin');
    }

    return false;
  }

  /**
   * Check if user can edit a product
   */
  canEditProduct(user: UserContext, product: ProductContext): boolean {
    // Must be authenticated
    if (!user.isAuthenticated) {
      return false;
    }

    // Owner can always edit their products
    if (user.userId === product.ownerId) {
      return true;
    }

    // Admins can edit any product
    if (user.roles.includes('admin')) {
      return true;
    }

    // Moderators can edit published products
    if (user.roles.includes('moderator') && product.status === 'published') {
      return true;
    }

    // Premium users can edit their published products
    if (user.subscriptionTier === 'premium' &&
        user.userId === product.ownerId &&
        product.status === 'published') {
      return true;
    }

    return false;
  }

  /**
   * Check if user can delete a product
   */
  canDeleteProduct(user: UserContext, product: ProductContext): boolean {
    // Must be authenticated
    if (!user.isAuthenticated) {
      return false;
    }

    // Owner can delete their own products (except if published and has orders)
    if (user.userId === product.ownerId) {
      // Simulate: can't delete published products with inventory
      return !(product.status === 'published' && product.inventory > 0);
    }

    // Admins can delete any product
    if (user.roles.includes('admin')) {
      return true;
    }

    // Moderators can delete products with issues
    if (user.roles.includes('moderator') && this.hasProductIssues(product)) {
      return true;
    }

    return false;
  }

  /**
   * Check if user can publish a product
   */
  canPublishProduct(user: UserContext, product: ProductContext): boolean {
    // Must be authenticated
    if (!user.isAuthenticated) {
      return false;
    }

    // Owner can publish their draft products
    if (user.userId === product.ownerId && product.status === 'draft') {
      return this.isProductReadyForPublishing(product);
    }

    // Admins can publish any draft product
    if (user.roles.includes('admin') && product.status === 'draft') {
      return true;
    }

    // Moderators can publish products that meet quality standards
    if (user.roles.includes('moderator') &&
        product.status === 'draft' &&
        this.meetsQualityStandards(product)) {
      return true;
    }

    return false;
  }

  /**
   * Check if user can bulk operate on products
   */
  canBulkOperate(user: UserContext, products: ProductContext[], operation: string): boolean {
    // Must be authenticated
    if (!user.isAuthenticated) {
      return false;
    }

    // Admins can perform any bulk operation
    if (user.roles.includes('admin')) {
      return true;
    }

    // Check operation-specific permissions
    switch (operation) {
      case 'publish':
        return user.roles.includes('moderator') &&
               products.every(p => p.ownerId === user.userId && p.status === 'draft');

      case 'archive':
        return user.roles.includes('moderator') ||
               products.every(p => p.ownerId === user.userId);

      case 'delete':
        return user.roles.includes('admin') ||
               (user.roles.includes('moderator') &&
                products.every(p => this.hasProductIssues(p)));

      default:
        return false;
    }
  }

  /**
   * Get visible products for user
   */
  getVisibleProducts(user: UserContext, products: ProductContext[]): ProductContext[] {
    return products.filter(product => this.canViewProduct(user, product));
  }

  /**
   * Get editable products for user
   */
  getEditableProducts(user: UserContext, products: ProductContext[]): ProductContext[] {
    return products.filter(product => this.canEditProduct(user, product));
  }

  /**
   * Filter products by user permissions
   */
  filterProductsByPermissions(
    user: UserContext,
    products: ProductContext[],
    permission: 'view' | 'edit' | 'delete' | 'publish'
  ): ProductContext[] {
    switch (permission) {
      case 'view':
        return this.getVisibleProducts(user, products);
      case 'edit':
        return this.getEditableProducts(user, products);
      case 'delete':
        return products.filter(product => this.canDeleteProduct(user, product));
      case 'publish':
        return products.filter(product => this.canPublishProduct(user, product));
      default:
        return [];
    }
  }

  // Private helper methods
  private hasRestrictedAccess(user: UserContext, product: ProductContext): boolean {
    // Region-based access
    if (product.tags.includes('regional') && user.region) {
      return product.tags.some(tag => tag.includes(user.region!));
    }

    // Premium subscription required
    if (product.tags.includes('premium-only')) {
      return user.subscriptionTier === 'premium';
    }

    // Specific role required
    if (product.tags.some(tag => tag.startsWith('role:'))) {
      const requiredRole = product.tags.find(tag => tag.startsWith('role:'))?.split(':')[1];
      return requiredRole ? user.roles.includes(requiredRole) : false;
    }

    return false;
  }

  private hasProductIssues(product: ProductContext): boolean {
    return product.inventory < 0 ||
           product.price <= 0 ||
           !product.category ||
           product.tags.length === 0;
  }

  private isProductReadyForPublishing(product: ProductContext): boolean {
    return product.price > 0 &&
           product.inventory >= 0 &&
           !!product.category &&
           product.tags.length > 0 &&
           product.createdAt.getTime() > Date.now() - (24 * 60 * 60 * 1000); // Created within last 24 hours
  }

  private meetsQualityStandards(product: ProductContext): boolean {
    return product.price > 0 &&
           product.inventory >= 0 &&
           !!product.category &&
           product.tags.length >= 2 &&
           (product.description?.length ?? 0) >= 10;
  }
}

describe('VisibilityPolicies', () => {
  let policies: VisibilityPolicies;
  let mockUser: UserContext;
  let mockProduct: ProductContext;

  beforeEach(() => {
    policies = new VisibilityPolicies();

    mockUser = {
      userId: 'user-123',
      roles: ['user'],
      permissions: ['read:products'],
      isAuthenticated: true,
      subscriptionTier: 'basic',
      region: 'us-east'
    };

    mockProduct = {
      id: 'product-123',
      category: 'electronics',
      status: 'published' as const,
      visibility: 'public' as const,
      ownerId: 'user-123',
      tags: ['electronics', 'gadgets'],
      price: 99.99,
      inventory: 100,
      createdAt: new Date(),
      publishedAt: new Date()
    };
  });

  describe('Product Viewing Permissions', () => {
    it('should allow viewing public published products', () => {
      const product = { ...mockProduct, visibility: 'public' as const, status: 'published' as const };
      const user = { ...mockUser, isAuthenticated: false };

      expect(policies.canViewProduct(user, product)).toBe(true);
    });

    it('should allow owner to view private products', () => {
      const product = { ...mockProduct, visibility: 'private' as const };
      const user = { ...mockUser, userId: product.ownerId };

      expect(policies.canViewProduct(user, product)).toBe(true);
    });

    it('should deny non-owner access to private products', () => {
      const product = { ...mockProduct, visibility: 'private' as const };
      const user = { ...mockUser, userId: 'different-user' };

      expect(policies.canViewProduct(user, product)).toBe(false);
    });

    it('should handle restricted products with region access', () => {
      const product = {
        ...mockProduct,
        visibility: 'restricted' as const,
        tags: ['regional', 'us-east']
      };
      const user = { ...mockUser, region: 'us-east' };

      expect(policies.canViewProduct(user, product)).toBe(true);
    });

    it('should handle restricted products with premium access', () => {
      const product = {
        ...mockProduct,
        visibility: 'restricted' as const,
        tags: ['premium-only']
      };
      const user = { ...mockUser, subscriptionTier: 'premium' };

      expect(policies.canViewProduct(user, product)).toBe(true);
    });

    it('should deny premium access to basic users', () => {
      const product = {
        ...mockProduct,
        visibility: 'restricted' as const,
        tags: ['premium-only']
      };
      const user = { ...mockUser, subscriptionTier: 'basic' };

      expect(policies.canViewProduct(user, product)).toBe(false);
    });

    it('should allow owner to view draft products', () => {
      const product = { ...mockProduct, status: 'draft' as const };
      const user = { ...mockUser, userId: product.ownerId };

      expect(policies.canViewProduct(user, product)).toBe(true);
    });

    it('should allow admins to view draft products', () => {
      const product = { ...mockProduct, status: 'draft' as const };
      const user = { ...mockUser, roles: ['admin'] };

      expect(policies.canViewProduct(user, product)).toBe(true);
    });

    it('should deny non-owner access to draft products', () => {
      const product = { ...mockProduct, status: 'draft' as const };
      const user = { ...mockUser, userId: 'different-user' };

      expect(policies.canViewProduct(user, product)).toBe(false);
    });

    it('should only allow admins to view archived products', () => {
      const product: ProductContext = { ...mockProduct, status: 'archived' };
      const adminUser = { ...mockUser, roles: ['admin'] };
      const regularUser = { ...mockUser, roles: ['user'] };

      expect(policies.canViewProduct(adminUser, product)).toBe(true);
      expect(policies.canViewProduct(regularUser, product)).toBe(false);
    });

    it('should deny access to unauthenticated users for non-public content', () => {
      const product = { ...mockProduct, visibility: 'private' as const };
      const user = { ...mockUser, isAuthenticated: false };

      expect(policies.canViewProduct(user, product)).toBe(false);
    });
  });

  describe('Product Editing Permissions', () => {
    it('should allow owner to edit their products', () => {
      const product = { ...mockProduct };
      const user = { ...mockUser, userId: product.ownerId };

      expect(policies.canEditProduct(user, product)).toBe(true);
    });

    it('should allow admins to edit any product', () => {
      const product = { ...mockProduct };
      const user = { ...mockUser, roles: ['admin'], userId: 'different-user' };

      expect(policies.canEditProduct(user, product)).toBe(true);
    });

    it('should allow moderators to edit published products', () => {
      const product: ProductContext = { ...mockProduct, status: 'published' };
      const user = { ...mockUser, roles: ['moderator'], userId: 'different-user' };

      expect(policies.canEditProduct(user, product)).toBe(true);
    });

    it('should deny moderators from editing draft products they do not own', () => {
      const product: ProductContext = { ...mockProduct, status: 'draft' };
      const user = { ...mockUser, roles: ['moderator'], userId: 'different-user' };

      expect(policies.canEditProduct(user, product)).toBe(false);
    });

    it('should allow premium users to edit their published products', () => {
      const product: ProductContext = { ...mockProduct, status: 'published' };
      const user = {
        ...mockUser,
        userId: product.ownerId,
        subscriptionTier: 'premium'
      };

      expect(policies.canEditProduct(user, product)).toBe(true);
    });

    it('should allow basic users to edit their products', () => {
      const product: ProductContext = { ...mockProduct, status: 'published' };
      const user = {
        ...mockUser,
        userId: product.ownerId,
        subscriptionTier: 'basic'
      };

      expect(policies.canEditProduct(user, product)).toBe(true);
    });

    it('should deny editing to unauthenticated users', () => {
      const product = { ...mockProduct };
      const user = { ...mockUser, isAuthenticated: false };

      expect(policies.canEditProduct(user, product)).toBe(false);
    });
  });

  describe('Product Deletion Permissions', () => {
    it('should allow owner to delete their draft products', () => {
      const product = { ...mockProduct, status: 'draft' as const, inventory: 0 };
      const user = { ...mockUser, userId: product.ownerId };

      expect(policies.canDeleteProduct(user, product)).toBe(true);
    });

    it('should deny owner from deleting published products with inventory', () => {
      const product = { ...mockProduct, status: 'published' as const, inventory: 10 };
      const user = { ...mockUser, userId: product.ownerId };

      expect(policies.canDeleteProduct(user, product)).toBe(false);
    });

    it('should allow owner to delete published products with no inventory', () => {
      const product = { ...mockProduct, status: 'published' as const, inventory: 0 };
      const user = { ...mockUser, userId: product.ownerId };

      expect(policies.canDeleteProduct(user, product)).toBe(true);
    });

    it('should allow admins to delete any product', () => {
      const product = { ...mockProduct, status: 'published' as const, inventory: 100 };
      const user = { ...mockUser, roles: ['admin'], userId: 'different-user' };

      expect(policies.canDeleteProduct(user, product)).toBe(true);
    });

    it('should allow moderators to delete products with issues', () => {
      const product = { ...mockProduct, price: 0, inventory: -1 }; // Has issues
      const user = { ...mockUser, roles: ['moderator'], userId: 'different-user' };

      expect(policies.canDeleteProduct(user, product)).toBe(true);
    });

    it('should deny moderators from deleting healthy products they do not own', () => {
      const product = { ...mockProduct, price: 100, inventory: 10 };
      const user = { ...mockUser, roles: ['moderator'], userId: 'different-user' };

      expect(policies.canDeleteProduct(user, product)).toBe(false);
    });

    it('should deny deletion to unauthenticated users', () => {
      const product = { ...mockProduct };
      const user = { ...mockUser, isAuthenticated: false };

      expect(policies.canDeleteProduct(user, product)).toBe(false);
    });
  });

  describe('Product Publishing Permissions', () => {
    it('should allow owner to publish ready draft products', () => {
      const product = {
        ...mockProduct,
        status: 'draft' as const,
        price: 99.99,
        inventory: 10,
        category: 'electronics',
        tags: ['electronics'],
        createdAt: new Date()
      };
      const user = { ...mockUser, userId: product.ownerId };

      expect(policies.canPublishProduct(user, product)).toBe(true);
    });

    it('should deny owner from publishing incomplete draft products', () => {
      const product = {
        ...mockProduct,
        status: 'draft' as const,
        price: 0, // Invalid price
        inventory: 10,
        category: 'electronics',
        tags: ['electronics'],
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000) // Too old
      };
      const user = { ...mockUser, userId: product.ownerId };

      expect(policies.canPublishProduct(user, product)).toBe(false);
    });

    it('should allow admins to publish any draft product', () => {
      const product = {
        ...mockProduct,
        status: 'draft' as const,
        price: 0, // Even with issues
        userId: 'different-user'
      };
      const user = { ...mockUser, roles: ['admin'], userId: 'different-user' };

      expect(policies.canPublishProduct(user, product)).toBe(true);
    });

    it('should allow moderators to publish quality draft products', () => {
      const product = {
        ...mockProduct,
        status: 'draft' as const,
        price: 99.99,
        inventory: 10,
        category: 'electronics',
        tags: ['electronics', 'gadgets'], // Multiple tags = quality
        description: 'A great product with detailed description' // Long description
      };
      const user = { ...mockUser, roles: ['moderator'], userId: 'different-user' };

      expect(policies.canPublishProduct(user, product)).toBe(true);
    });

    it('should deny moderators from publishing low-quality products', () => {
      const product = {
        ...mockProduct,
        status: 'draft' as const,
        price: 99.99,
        inventory: 10,
        category: 'electronics',
        tags: ['electronics'], // Only one tag = low quality
        description: 'Short' // Too short description
      };
      const user = { ...mockUser, roles: ['moderator'], userId: 'different-user' };

      expect(policies.canPublishProduct(user, product)).toBe(false);
    });

    it('should deny publishing to unauthenticated users', () => {
      const product = { ...mockProduct, status: 'draft' as const };
      const user = { ...mockUser, isAuthenticated: false };

      expect(policies.canPublishProduct(user, product)).toBe(false);
    });

    it('should deny publishing already published products', () => {
      const product = { ...mockProduct, status: 'published' as const };
      const user = { ...mockUser, userId: product.ownerId };

      expect(policies.canPublishProduct(user, product)).toBe(false);
    });
  });

  describe('Bulk Operations Permissions', () => {
    it('should allow admins to perform any bulk operation', () => {
      const products = [
        { ...mockProduct, id: '1', ownerId: 'user-123', status: 'draft' as const },
        { ...mockProduct, id: '2', ownerId: 'user-123', status: 'draft' as const }
      ];
      const user = { ...mockUser, roles: ['admin'] };

      expect(policies.canBulkOperate(user, products, 'publish')).toBe(true);
      expect(policies.canBulkOperate(user, products, 'archive')).toBe(true);
      expect(policies.canBulkOperate(user, products, 'delete')).toBe(true);
    });

    it('should allow moderators to bulk publish owned draft products', () => {
      const products = [
        { ...mockProduct, id: '1', ownerId: 'user-123', status: 'draft' as const },
        { ...mockProduct, id: '2', ownerId: 'user-123', status: 'draft' as const }
      ];
      const user = { ...mockUser, roles: ['moderator'], userId: products[0].ownerId };
      const draftProducts = products.map(p => ({ ...p, status: 'draft' as const }));

      expect(policies.canBulkOperate(user, draftProducts, 'publish')).toBe(true);
    });

    it('should deny moderators from bulk publishing others draft products', () => {
      const products = [
        { ...mockProduct, id: '1', ownerId: 'user-123', status: 'draft' as const },
        { ...mockProduct, id: '2', ownerId: 'user-123', status: 'draft' as const }
      ];
      const user = { ...mockUser, roles: ['moderator'], userId: 'different-user' };
      const draftProducts = products.map(p => ({ ...p, status: 'draft' as const }));

      expect(policies.canBulkOperate(user, draftProducts, 'publish')).toBe(false);
    });

    it('should allow bulk archiving of owned products', () => {
      const products = [
        { ...mockProduct, id: '1', ownerId: 'user-123', status: 'draft' as const },
        { ...mockProduct, id: '2', ownerId: 'user-123', status: 'draft' as const }
      ];
      const user = { ...mockUser, roles: ['user'], userId: products[0].ownerId };

      expect(policies.canBulkOperate(user, products, 'archive')).toBe(true);
    });

    it('should allow moderators to bulk delete problematic products', () => {
      const products = [
        { ...mockProduct, id: '1', ownerId: 'user-123', status: 'draft' as const },
        { ...mockProduct, id: '2', ownerId: 'user-123', status: 'draft' as const }
      ];
      const user = { ...mockUser, roles: ['moderator'], userId: 'different-user' };
      const problematicProducts = products.map(p => ({ ...p, price: 0, inventory: -1 }));

      expect(policies.canBulkOperate(user, problematicProducts, 'delete')).toBe(true);
    });

    it('should deny bulk operations to unauthenticated users', () => {
      const products = [
        { ...mockProduct, id: '1', ownerId: 'user-123', status: 'draft' as const },
        { ...mockProduct, id: '2', ownerId: 'user-123', status: 'draft' as const }
      ];
      const user = { ...mockUser, isAuthenticated: false };

      expect(policies.canBulkOperate(user, products, 'publish')).toBe(false);
    });

    it('should deny unsupported bulk operations', () => {
      const products = [
        { ...mockProduct, id: '1', ownerId: 'user-123', status: 'draft' as const },
        { ...mockProduct, id: '2', ownerId: 'user-123', status: 'draft' as const }
      ];
      const user = { ...mockUser, roles: ['admin'] };

      expect(policies.canBulkOperate(user, products, 'unsupported')).toBe(false);
    });
  });

  describe('Product Filtering', () => {
    it('should filter visible products correctly', () => {
      const products: ProductContext[] = [
        { ...mockProduct, id: '1', visibility: 'public' as const, status: 'published' as const },
        { ...mockProduct, id: '2', visibility: 'private' as const, ownerId: 'user-123' },
        { ...mockProduct, id: '3', visibility: 'private' as const, ownerId: 'other-user' },
        { ...mockProduct, id: '4', status: 'draft' as const, ownerId: 'user-123' },
        { ...mockProduct, id: '5', status: 'archived' as const }
      ];
      const user = { ...mockUser };
      const visibleProducts = policies.getVisibleProducts(user, products);

      expect(visibleProducts).toHaveLength(3); // public, owned private, owned draft
      expect(visibleProducts.map(p => p.id)).toEqual(['1', '2', '4']);
    });

    it('should filter editable products correctly', () => {
      const products: ProductContext[] = [
        { ...mockProduct, id: '1', visibility: 'public' as const, status: 'published' as const },
        { ...mockProduct, id: '2', visibility: 'private' as const, ownerId: 'user-123' },
        { ...mockProduct, id: '3', visibility: 'private' as const, ownerId: 'other-user' },
        { ...mockProduct, id: '4', status: 'draft' as const, ownerId: 'user-123' },
        { ...mockProduct, id: '5', status: 'archived' as const }
      ];
      const user = { ...mockUser, userId: products[0].ownerId };
      const editableProducts = policies.getEditableProducts(user, products);

      expect(editableProducts).toHaveLength(3); // owned products
      expect(editableProducts.map(p => p.id)).toEqual(['1', '2', '4']);
    });

    it('should filter by specific permissions', () => {
      const products: ProductContext[] = [
        { ...mockProduct, id: '1', visibility: 'public' as const, status: 'published' as const },
        { ...mockProduct, id: '2', visibility: 'private' as const, ownerId: 'user-123' },
        { ...mockProduct, id: '3', visibility: 'private' as const, ownerId: 'other-user' },
        { ...mockProduct, id: '4', status: 'draft' as const, ownerId: 'user-123' },
        { ...mockProduct, id: '5', status: 'archived' as const }
      ];
      const user = { ...mockUser, roles: ['admin'] };

      const viewable = policies.filterProductsByPermissions(user, products, 'view');
      const editable = policies.filterProductsByPermissions(user, products, 'edit');
      const deletable = policies.filterProductsByPermissions(user, products, 'delete');
      const publishable = policies.filterProductsByPermissions(user, products, 'publish');

      expect(viewable).toHaveLength(5); // Admin can view all
      expect(editable).toHaveLength(5); // Admin can edit all
      expect(deletable).toHaveLength(5); // Admin can delete all
      expect(publishable).toHaveLength(1); // Only the draft product
    });

    it('should handle empty product lists', () => {
      const user = { ...mockUser };

      expect(policies.getVisibleProducts(user, [])).toHaveLength(0);
      expect(policies.getEditableProducts(user, [])).toHaveLength(0);
      expect(policies.filterProductsByPermissions(user, [], 'view')).toHaveLength(0);
    });
  });

  describe('Policy Consistency', () => {
    it('should maintain consistent permissions across operations', () => {
      const user = { ...mockUser };
      const product = { ...mockProduct };

      // If user can view, they might not necessarily edit
      const canView = policies.canViewProduct(user, product);
      const canEdit = policies.canEditProduct(user, product);

      // Owner should be able to both view and edit
      if (user.userId === product.ownerId) {
        expect(canView && canEdit).toBe(true);
      }
    });

    it('should handle role hierarchy correctly', () => {
      const adminUser = { ...mockUser, roles: ['admin'] };
      const modUser = { ...mockUser, roles: ['moderator'] };
      const basicUser = { ...mockUser, roles: ['user'] };
      const product = { ...mockProduct };

      // Admins should have all permissions
      expect(policies.canViewProduct(adminUser, product)).toBe(true);
      expect(policies.canEditProduct(adminUser, product)).toBe(true);
      expect(policies.canDeleteProduct(adminUser, product)).toBe(true);

      // Moderators should have fewer permissions than admins
      expect(policies.canViewProduct(modUser, product)).toBe(true);
      expect(policies.canEditProduct(modUser, product)).toBe(true);
      // Moderators might not be able to delete healthy products
    });

    it('should be idempotent', () => {
      const user = { ...mockUser };
      const product = { ...mockProduct };

      // Multiple calls should return same result
      const result1 = policies.canViewProduct(user, product);
      const result2 = policies.canViewProduct(user, product);
      const result3 = policies.canViewProduct(user, product);

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle products with missing properties', () => {
      const incompleteProduct = {
        ...mockProduct,
        price: undefined as any,
        category: undefined as any
      };
      const user = { ...mockUser };

      // Should not crash, should return reasonable defaults
      expect(() => policies.canViewProduct(user, incompleteProduct)).not.toThrow();
      expect(() => policies.canEditProduct(user, incompleteProduct)).not.toThrow();
    });

    it('should handle users with missing properties', () => {
      const incompleteUser = {
        ...mockUser,
        roles: undefined as any,
        isAuthenticated: undefined as any
      };
      const product = { ...mockProduct };

      // Should not crash, should return reasonable defaults
      expect(() => policies.canViewProduct(incompleteUser, product)).not.toThrow();
    });

    it('should handle empty arrays and collections', () => {
      const user = { ...mockUser };
      const productWithEmptyTags = { ...mockProduct, tags: [] };

      expect(policies.canViewProduct(user, productWithEmptyTags)).toBe(true);
      expect(policies.canBulkOperate(user, [], 'publish')).toBe(true); // Empty array is allowed
    });

    it('should handle special characters and unicode', () => {
      const user = { ...mockUser, userId: 'user-🚀-test' };
      const product = { ...mockProduct, ownerId: 'user-🚀-test', tags: ['🏷️', '测试'] };

      expect(policies.canViewProduct(user, product)).toBe(true);
      expect(policies.canEditProduct(user, product)).toBe(true);
    });
  });
});
