/**
 * Product Types Value Objects Tests
 * 
 * Purpose: Validates product type value objects for catalog domain
 * Scope: Domain layer testing with zero external dependencies
 * Coverage Target: 98% (critical business logic)
 * 
 * Test Categories:
 * - Product status validation and transitions
 * - Dimensions and weight calculations
 * - SEO data validation
 * - Shipping information handling
 * - Edge cases and error conditions
 */

import { 
  ProductStatus, 
  ProductVisibility, 
  ProductCondition, 
  ProductType,
  ProductStatusValue,
  Dimensions,
  Weight,
  SEOData,
  ShippingInfo
} from '../product-types.value-object';

describe('ProductStatusValue', () => {
  describe('Creation and Validation', () => {
    it('should create valid product status', () => {
      // Given: Valid status
      const status = ProductStatusValue.fromString('draft');

      // Then: Should be created successfully
      expect(status.toString()).toBe(ProductStatus.DRAFT);
    });

    it('should reject invalid product status', () => {
      // When/Then: Creating invalid status should throw error
      expect(() => ProductStatusValue.fromString('invalid')).toThrow('Invalid product status: invalid');
    });

    it('should handle all valid status values', () => {
      // Given: All valid status values
      const validStatuses = [
        'draft',
        'pending_review', 
        'published',
        'archived',
        'suspended'
      ];

      // When: Creating status values
      const statuses = validStatuses.map(status => ProductStatusValue.fromString(status));

      // Then: All should be created successfully
      expect(statuses).toHaveLength(5);
      expect(statuses[0].toString()).toBe(ProductStatus.DRAFT);
      expect(statuses[1].toString()).toBe(ProductStatus.PENDING_REVIEW);
      expect(statuses[2].toString()).toBe(ProductStatus.PUBLISHED);
      expect(statuses[3].toString()).toBe(ProductStatus.ARCHIVED);
      expect(statuses[4].toString()).toBe(ProductStatus.SUSPENDED);
    });
  });

  describe('Status Transitions', () => {
    it('should allow valid status transitions', () => {
      // Given: Status with valid transitions
      const draftStatus = ProductStatusValue.fromString('draft');
      const pendingStatus = ProductStatusValue.fromString('pending_review');
      const publishedStatus = ProductStatusValue.fromString('published');

      // When: Checking valid transitions
      const canTransitionToPending = draftStatus.canTransitionTo(ProductStatus.PENDING_REVIEW);
      const canTransitionToPublished = pendingStatus.canTransitionTo(ProductStatus.PUBLISHED);
      const canTransitionToSuspended = publishedStatus.canTransitionTo(ProductStatus.SUSPENDED);

      // Then: Should allow valid transitions
      expect(canTransitionToPending).toBe(true);
      expect(canTransitionToPublished).toBe(true);
      expect(canTransitionToSuspended).toBe(true);
    });

    it('should reject invalid status transitions', () => {
      // Given: Status with invalid transitions
      const draftStatus = ProductStatusValue.fromString('draft');
      const publishedStatus = ProductStatusValue.fromString('published');
      const archivedStatus = ProductStatusValue.fromString('archived');

      // When: Checking invalid transitions
      const canTransitionToPublished = draftStatus.canTransitionTo(ProductStatus.PUBLISHED);
      const canTransitionToDraft = publishedStatus.canTransitionTo(ProductStatus.DRAFT);
      const canTransitionFromArchived = archivedStatus.canTransitionTo(ProductStatus.PUBLISHED);

      // Then: Should reject invalid transitions
      expect(canTransitionToPublished).toBe(false);
      expect(canTransitionToDraft).toBe(false);
      expect(canTransitionFromArchived).toBe(false);
    });

    it('should handle terminal state (archived)', () => {
      // Given: Archived status
      const archivedStatus = ProductStatusValue.fromString('archived');

      // When: Checking all possible transitions
      const transitions = Object.values(ProductStatus).map(status => 
        archivedStatus.canTransitionTo(status)
      );

      // Then: Should not allow any transitions
      expect(transitions.every(canTransition => canTransition === false)).toBe(true);
    });
  });

  describe('Status Properties', () => {
    it('should determine if status is published', () => {
      // Given: Different status values
      const publishedStatus = ProductStatusValue.fromString('published');
      const draftStatus = ProductStatusValue.fromString('draft');
      const suspendedStatus = ProductStatusValue.fromString('suspended');

      // When: Checking if published
      const isPublished = publishedStatus.isPublished();
      const isDraftPublished = draftStatus.isPublished();
      const isSuspendedPublished = suspendedStatus.isPublished();

      // Then: Should determine correctly
      expect(isPublished).toBe(true);
      expect(isDraftPublished).toBe(false);
      expect(isSuspendedPublished).toBe(false);
    });

    it('should determine if status is active', () => {
      // Given: Different status values
      const publishedStatus = ProductStatusValue.fromString('published');
      const pendingStatus = ProductStatusValue.fromString('pending_review');
      const draftStatus = ProductStatusValue.fromString('draft');
      const archivedStatus = ProductStatusValue.fromString('archived');

      // When: Checking if active
      const isPublishedActive = publishedStatus.isActive();
      const isPendingActive = pendingStatus.isActive();
      const isDraftActive = draftStatus.isActive();
      const isArchivedActive = archivedStatus.isActive();

      // Then: Should determine correctly
      expect(isPublishedActive).toBe(true);
      expect(isPendingActive).toBe(true);
      expect(isDraftActive).toBe(false);
      expect(isArchivedActive).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle case sensitivity', () => {
      // When: Creating status with different case
      const status1 = ProductStatusValue.fromString('DRAFT');
      const status2 = ProductStatusValue.fromString('draft');

      // Then: Should handle case sensitivity (depends on implementation)
      expect(status1.toString()).toBe(ProductStatus.DRAFT);
      expect(status2.toString()).toBe(ProductStatus.DRAFT);
    });
  });
});

describe('Dimensions', () => {
  describe('Creation and Validation', () => {
    it('should create valid dimensions', () => {
      // Given: Valid dimension data
      const dimensions = new Dimensions(10, 5, 3, 'cm');

      // Then: Should be created successfully
      expect(dimensions.getLength()).toBe(10);
      expect(dimensions.getWidth()).toBe(5);
      expect(dimensions.getHeight()).toBe(3);
      expect(dimensions.getUnit()).toBe('cm');
    });

    it('should reject negative dimensions', () => {
      // When/Then: Creating negative dimensions should throw error
      expect(() => new Dimensions(-1, 5, 3, 'cm')).toThrow('Dimensions must be positive values');
      expect(() => new Dimensions(10, 0, 3, 'cm')).toThrow('Dimensions must be positive values');
    });

    it('should reject invalid units', () => {
      // When/Then: Creating dimensions with invalid unit should throw error
      expect(() => new Dimensions(10, 5, 3, 'm')).toThrow('Unit must be cm, in, or mm');
    });

    it('should default to cm unit', () => {
      // Given: Dimensions without unit
      const dimensions = new Dimensions(10, 5, 3);

      // Then: Should default to cm
      expect(dimensions.getUnit()).toBe('cm');
    });
  });

  describe('Volume Calculation', () => {
    it('should calculate volume correctly', () => {
      // Given: Dimensions
      const dimensions = new Dimensions(10, 5, 3, 'cm');

      // When: Calculating volume
      const volume = dimensions.getVolume();

      // Then: Should calculate correctly
      expect(volume).toBe(150); // 10 * 5 * 3 = 150
    });

    it('should handle unit conversions', () => {
      // Given: Dimensions in different units
      const cmDimensions = new Dimensions(10, 5, 3, 'cm');
      const inDimensions = new Dimensions(3.93701, 1.9685, 1.1811, 'in');

      // When: Converting units
      const convertedToIn = cmDimensions.convertTo('in');
      const convertedToCm = inDimensions.convertTo('cm');

      // Then: Should convert correctly (approximately)
      expect(convertedToIn.getUnit()).toBe('in');
      expect(convertedToCm.getUnit()).toBe('cm');
    });

    it('should reject invalid unit conversions', () => {
      // Given: Dimensions
      const dimensions = new Dimensions(10, 5, 3, 'cm');

      // When/Then: Converting to invalid unit should throw error
      expect(() => dimensions.convertTo('m')).toThrow('Cannot convert from cm to m');
    });
  });

  describe('String Representation', () => {
    it('should format dimensions correctly', () => {
      // Given: Dimensions
      const dimensions = new Dimensions(10, 5, 3, 'cm');

      // When: Getting string representation
      const formatted = dimensions.toString();

      // Then: Should format correctly
      expect(formatted).toBe('10x5x3 cm');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small dimensions', () => {
      // Given: Very small dimensions
      const dimensions = new Dimensions(0.1, 0.1, 0.1, 'cm');

      // Then: Should be valid
      expect(dimensions.getLength()).toBe(0.1);
      expect(dimensions.getVolume()).toBe(0.001);
    });

    it('should handle very large dimensions', () => {
      // Given: Very large dimensions
      const dimensions = new Dimensions(1000, 1000, 1000, 'cm');

      // Then: Should be valid
      expect(dimensions.getLength()).toBe(1000);
      expect(dimensions.getVolume()).toBe(1000000000);
    });
  });
});

describe('Weight', () => {
  describe('Creation and Validation', () => {
    it('should create valid weight', () => {
      // Given: Valid weight data
      const weight = new Weight(10, 'kg');

      // Then: Should be created successfully
      expect(weight.getValue()).toBe(10);
      expect(weight.getUnit()).toBe('kg');
    });

    it('should reject negative weight', () => {
      // When/Then: Creating negative weight should throw error
      expect(() => new Weight(-1, 'kg')).toThrow('Weight must be positive');
    });

    it('should reject zero weight', () => {
      // When/Then: Creating zero weight should throw error
      expect(() => new Weight(0, 'kg')).toThrow('Weight must be positive');
    });

    it('should reject invalid units', () => {
      // When/Then: Creating weight with invalid unit should throw error
      expect(() => new Weight(10, 'ton')).toThrow('Unit must be kg, g, lb, or oz');
    });

    it('should default to kg unit', () => {
      // Given: Weight without unit
      const weight = new Weight(10);

      // Then: Should default to kg
      expect(weight.getUnit()).toBe('kg');
    });
  });

  describe('Unit Conversions', () => {
    it('should convert between units correctly', () => {
      // Given: Weight in different units
      const kgWeight = new Weight(1, 'kg');
      const gWeight = new Weight(1000, 'g');
      const lbWeight = new Weight(2.20462, 'lb');
      const ozWeight = new Weight(35.274, 'oz');

      // When: Converting units
      const kgToG = kgWeight.convertTo('g');
      const gToKg = gWeight.convertTo('kg');
      const lbToKg = lbWeight.convertTo('kg');
      const ozToKg = ozWeight.convertTo('kg');

      // Then: Should convert correctly (approximately)
      expect(kgToG.getValue()).toBe(1000);
      expect(gToKg.getValue()).toBe(1);
      expect(Math.round(lbToKg.getValue() * 100000) / 100000).toBe(1);
      expect(Math.round(ozToKg.getValue() * 100000) / 100000).toBe(1);
    });

    it('should handle same unit conversion', () => {
      // Given: Weight
      const weight = new Weight(10, 'kg');

      // When: Converting to same unit
      const sameUnit = weight.convertTo('kg');

      // Then: Should return same weight
      expect(sameUnit).toBe(weight);
    });

    it('should reject invalid unit conversions', () => {
      // Given: Weight
      const weight = new Weight(10, 'kg');

      // When/Then: Converting to invalid unit should throw error
      expect(() => weight.convertTo('ton')).toThrow('Unit must be kg, g, lb, or oz');
    });
  });

  describe('Weight Comparisons', () => {
    it('should compare weights with same unit', () => {
      // Given: Weights with same unit
      const weight1 = new Weight(10, 'kg');
      const weight2 = new Weight(5, 'kg');

      // When: Comparing weights
      const isLess = weight2.isLessThan(weight1);

      // Then: Should compare correctly
      expect(isLess).toBe(true);
    });

    it('should compare weights with different units', () => {
      // Given: Weights with different units
      const kgWeight = new Weight(1, 'kg');
      const gWeight = new Weight(500, 'g');

      // When: Comparing weights
      const isLess = gWeight.isLessThan(kgWeight);

      // Then: Should convert and compare correctly
      expect(isLess).toBe(true);
    });
  });

  describe('String Representation', () => {
    it('should format weight correctly', () => {
      // Given: Weight
      const weight = new Weight(10.5, 'kg');

      // When: Getting string representation
      const formatted = weight.toString();

      // Then: Should format correctly
      expect(formatted).toBe('10.5 kg');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small weights', () => {
      // Given: Very small weight
      const weight = new Weight(0.001, 'kg');

      // Then: Should be valid
      expect(weight.getValue()).toBe(0.001);
    });

    it('should handle very large weights', () => {
      // Given: Very large weight
      const weight = new Weight(1000000, 'kg');

      // Then: Should be valid
      expect(weight.getValue()).toBe(1000000);
    });
  });
});

describe('SEOData', () => {
  describe('Creation and Validation', () => {
    it('should create valid SEO data', () => {
      // Given: Valid SEO data
      const seoData = new SEOData(
        'Product Title',
        'Product description',
        ['keyword1', 'keyword2'],
        'product-slug',
        { 'meta-key': 'meta-value' }
      );

      // Then: Should be created successfully
      expect(seoData.getTitle()).toBe('Product Title');
      expect(seoData.getDescription()).toBe('Product description');
      expect(seoData.getKeywords()).toEqual(['keyword1', 'keyword2']);
      expect(seoData.getSlug()).toBe('product-slug');
      expect(seoData.getMetaTags()).toEqual({ 'meta-key': 'meta-value' });
    });

    it('should reject title over 60 characters', () => {
      // Given: Title over 60 characters
      const longTitle = 'A'.repeat(61);

      // When/Then: Creating SEO data should throw error
      expect(() => new SEOData(longTitle, 'description', [], 'slug')).toThrow('SEO title must be 60 characters or less');
    });

    it('should reject description over 160 characters', () => {
      // Given: Description over 160 characters
      const longDescription = 'A'.repeat(161);

      // When/Then: Creating SEO data should throw error
      expect(() => new SEOData('title', longDescription, [], 'slug')).toThrow('SEO description must be 160 characters or less');
    });

    it('should reject invalid slug format', () => {
      // Given: Invalid slug
      const invalidSlug = 'Invalid Slug With Spaces';

      // When/Then: Creating SEO data should throw error
      expect(() => new SEOData('title', 'description', [], invalidSlug)).toThrow('SEO slug must contain only lowercase letters, numbers, hyphens, and underscores');
    });

    it('should accept valid slug format', () => {
      // Given: Valid slug formats
      const validSlugs = [
        'product-slug',
        'product123',
        'product-slug-123',
        'product_slug'
      ];

      // When: Creating SEO data with valid slugs
      const seoData = validSlugs.map(slug => new SEOData('title', 'description', [], slug));

      // Then: All should be created successfully
      expect(seoData).toHaveLength(4);
    });

    it('should handle optional fields', () => {
      // Given: SEO data with only required fields
      const seoData = new SEOData('title', 'description');

      // Then: Should be created with undefined optional fields
      expect(seoData.getTitle()).toBe('title');
      expect(seoData.getDescription()).toBe('description');
      expect(seoData.getKeywords()).toBeUndefined();
      expect(seoData.getSlug()).toBeUndefined();
      expect(seoData.getMetaTags()).toBeUndefined();
    });
  });

  describe('Completeness Check', () => {
    it('should determine if SEO data is complete', () => {
      // Given: Complete and incomplete SEO data
      const completeSEO = new SEOData('title', 'description', [], 'slug');
      const incompleteSEO = new SEOData('title', 'description'); // Missing slug

      // When: Checking completeness
      const isComplete = completeSEO.isComplete();
      const isIncomplete = incompleteSEO.isComplete();

      // Then: Should determine correctly
      expect(isComplete).toBe(true);
      expect(isIncomplete).toBe(false);
    });
  });

  describe('Immutability', () => {
    it('should return immutable copies of arrays and objects', () => {
      // Given: SEO data with arrays and objects
      const keywords = ['keyword1', 'keyword2'];
      const metaTags = { 'meta-key': 'meta-value' };
      const seoData = new SEOData('title', 'description', keywords, 'slug', metaTags);

      // When: Getting arrays and objects
      const returnedKeywords = seoData.getKeywords()!;
      const returnedMetaTags = seoData.getMetaTags()!;

      // Then: Should return different instances
      expect(returnedKeywords).not.toBe(keywords);
      expect(returnedMetaTags).not.toBe(metaTags);
      expect(returnedKeywords).toEqual(keywords);
      expect(returnedMetaTags).toEqual(metaTags);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty keywords array', () => {
      // Given: Empty keywords
      const seoData = new SEOData('title', 'description', [], 'slug');

      // Then: Should be valid
      expect(seoData.getKeywords()).toEqual([]);
    });

    it('should handle empty meta tags object', () => {
      // Given: Empty meta tags
      const seoData = new SEOData('title', 'description', [], 'slug', {});

      // Then: Should be valid
      expect(seoData.getMetaTags()).toEqual({});
    });
  });
});

describe('ShippingInfo', () => {
  describe('Creation and Validation', () => {
    it('should create valid shipping info', () => {
      // Given: Valid shipping info data
      const weight = new Weight(10, 'kg');
      const dimensions = new Dimensions(10, 5, 3, 'cm');
      const shippingInfo = new ShippingInfo(weight, dimensions);

      // Then: Should be created successfully
      expect(shippingInfo.getWeight()).toBe(weight);
      expect(shippingInfo.getDimensions()).toBe(dimensions);
      expect(shippingInfo.requiresSpecialHandling()).toBe(false);
      expect(shippingInfo.isHazardous()).toBe(false);
      expect(shippingInfo.isFragile()).toBe(false);
    });

    it('should handle special handling flags', () => {
      // Given: Shipping info with special flags
      const weight = new Weight(10, 'kg');
      const dimensions = new Dimensions(10, 5, 3, 'cm');
      const shippingInfo = new ShippingInfo(
        weight, 
        dimensions, 
        true, // requires special handling
        true, // hazardous
        true  // fragile
      );

      // Then: Should handle flags correctly
      expect(shippingInfo.requiresSpecialHandling()).toBe(true);
      expect(shippingInfo.isHazardous()).toBe(true);
      expect(shippingInfo.isFragile()).toBe(true);
    });
  });

  describe('Special Shipping Requirements', () => {
    it('should determine if special shipping is needed', () => {
      // Given: Shipping info with different requirements
      const normalShipping = new ShippingInfo(
        new Weight(10, 'kg'),
        new Dimensions(10, 5, 3, 'cm')
      );
      
      const specialHandlingShipping = new ShippingInfo(
        new Weight(10, 'kg'),
        new Dimensions(10, 5, 3, 'cm'),
        true
      );
      
      const hazardousShipping = new ShippingInfo(
        new Weight(10, 'kg'),
        new Dimensions(10, 5, 3, 'cm'),
        false,
        true
      );

      // When: Checking special shipping requirements
      const needsNormalShipping = normalShipping.needsSpecialShipping();
      const needsSpecialHandling = specialHandlingShipping.needsSpecialShipping();
      const needsHazardousShipping = hazardousShipping.needsSpecialShipping();

      // Then: Should determine correctly
      expect(needsNormalShipping).toBe(false);
      expect(needsSpecialHandling).toBe(true);
      expect(needsHazardousShipping).toBe(true);
    });
  });

  describe('Weight Calculations', () => {
    it('should calculate volumetric weight', () => {
      // Given: Shipping info with specific dimensions
      const dimensions = new Dimensions(100, 50, 30, 'cm'); // 150000 cubic cm
      const weight = new Weight(10, 'kg');
      const shippingInfo = new ShippingInfo(weight, dimensions);

      // When: Calculating volumetric weight
      const volumetricWeight = shippingInfo.getVolumeWeight();

      // Then: Should calculate correctly (150000 / 5000 = 30kg)
      expect(volumetricWeight.getValue()).toBe(30);
      expect(volumetricWeight.getUnit()).toBe('kg');
    });

    it('should calculate billable weight', () => {
      // Given: Shipping info where volumetric weight is higher
      const dimensions = new Dimensions(100, 50, 30, 'cm'); // 150000 cubic cm = 30kg volumetric
      const actualWeight = new Weight(10, 'kg');
      const shippingInfo = new ShippingInfo(actualWeight, dimensions);

      // When: Calculating billable weight
      const billableWeight = shippingInfo.getBillableWeight();

      // Then: Should use higher of actual vs volumetric weight
      expect(billableWeight.getValue()).toBe(30); // Volumetric weight is higher
      expect(billableWeight.getUnit()).toBe('kg');
    });

    it('should use actual weight when higher than volumetric', () => {
      // Given: Shipping info where actual weight is higher
      const dimensions = new Dimensions(10, 5, 3, 'cm'); // 150 cubic cm = 0.03kg volumetric
      const actualWeight = new Weight(10, 'kg');
      const shippingInfo = new ShippingInfo(actualWeight, dimensions);

      // When: Calculating billable weight
      const billableWeight = shippingInfo.getBillableWeight();

      // Then: Should use actual weight
      expect(billableWeight.getValue()).toBe(10); // Actual weight is higher
      expect(billableWeight.getUnit()).toBe('kg');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large dimensions', () => {
      // Given: Very large dimensions
      const dimensions = new Dimensions(1000, 1000, 1000, 'cm');
      const weight = new Weight(100, 'kg');
      const shippingInfo = new ShippingInfo(weight, dimensions);

      // When: Calculating weights
      const volumetricWeight = shippingInfo.getVolumeWeight();
      const billableWeight = shippingInfo.getBillableWeight();

      // Then: Should handle large numbers correctly
      expect(volumetricWeight.getValue()).toBe(200000); // 1000000000 / 5000 = 200000kg
      expect(billableWeight.getValue()).toBe(200000); // Volumetric weight is higher
    });

    it('should handle very small dimensions', () => {
      // Given: Very small dimensions
      const dimensions = new Dimensions(1, 1, 1, 'cm');
      const weight = new Weight(1, 'kg');
      const shippingInfo = new ShippingInfo(weight, dimensions);

      // When: Calculating weights
      const volumetricWeight = shippingInfo.getVolumeWeight();
      const billableWeight = shippingInfo.getBillableWeight();

      // Then: Should handle small numbers correctly
      expect(volumetricWeight.getValue()).toBe(0.0002); // 1 / 5000 = 0.0002kg
      expect(billableWeight.getValue()).toBe(1); // Actual weight is higher
    });
  });
});
