/**
 * Bug Condition Exploration Tests — Seeded Product Data Fix
 *
 * These tests MUST FAIL on unfixed code — failure confirms the bugs exist.
 * DO NOT fix the code when these tests fail.
 *
 * Tests encode the expected (correct) behavior. They will pass after the fix is applied.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { PrismaProductRepository } from '../prisma-product.repository';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Test 1 — Currency bug condition
// Bug: normalizeVariantRecord passes attributes object to resolveCurrency, which
//      returns the raw currency string (e.g. 'USD') instead of enforcing 'TZS'.
// Expected (correct): currency is always 'TZS' for this Tanzania-only marketplace.
// Actual (buggy): returns 'USD' when attributes.currency === 'USD'.
// ---------------------------------------------------------------------------
describe('Bug Condition — Currency USD Pass-Through', () => {
  it('should return TZS currency when variant attributes.currency is USD', () => {
    // Validates: Requirements 1.2, 2.2
    // isBugCondition_Currency: attributes is an object with currency !== 'TZS'
    const repo = new PrismaProductRepository(null as any);

    const result = (repo as any).normalizeVariantRecord({
      id: 'v1',
      sku: 'SKU1',
      name: 'Test Variant',
      price: 1000,
      attributes: { currency: 'USD' },
      status: 'active'
    });

    // WILL FAIL on unfixed code — returns 'USD' instead of 'TZS'
    expect(result.currency).toBe('TZS');
  });

  it('should return TZS currency when variant attributes.currency is any non-TZS value', () => {
    // Validates: Requirements 1.2, 2.2
    const repo = new PrismaProductRepository(null as any);

    const nonTzsCurrencies = ['USD', 'EUR', 'GBP', 'KES', 'UGX'];

    for (const currency of nonTzsCurrencies) {
      const result = (repo as any).normalizeVariantRecord({
        id: 'v1',
        sku: 'SKU1',
        name: 'Test Variant',
        price: 1000,
        attributes: { currency },
        status: 'active'
      });

      // WILL FAIL on unfixed code — returns the non-TZS currency as-is
      expect(result.currency).toBe('TZS');
    }
  });

  it('should return TZS in product price.currency when derived from a USD-attributed variant', () => {
    // Validates: Requirements 1.1, 2.1
    // normalizeProductRecord derives currencySource from defaultVariant.currency
    const repo = new PrismaProductRepository(null as any);

    const productData = {
      id: 'prod-1',
      sellerId: 'seller-1',
      title: 'Test Product',
      description: 'A test product',
      categoryId: 'cat-1',
      status: 'published',
      visibility: 'public',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      variants: [
        {
          id: 'v1',
          sku: 'SKU1',
          name: 'Test Variant',
          price: 1000,
          attributes: { currency: 'USD' },
          status: 'active'
        }
      ]
    };

    const result = (repo as any).normalizeProductRecord(productData);

    // WILL FAIL on unfixed code — returns 'USD' instead of 'TZS'
    expect(result.price.currency).toBe('TZS');
  });
});

// ---------------------------------------------------------------------------
// Test 2 — Images bug condition
// Bug: extractMediaUrls ignores productData.mediaRef entirely.
// Expected (correct): returns URLs from mediaRef array.
// Actual (buggy): returns [] when only mediaRef is populated.
// ---------------------------------------------------------------------------
describe('Bug Condition — Missing MediaRef Images', () => {
  it('should return URLs from mediaRef array', () => {
    // Validates: Requirements 1.5, 2.5
    // isBugCondition_Images: always true for search — mediaRef is never loaded
    const repo = new PrismaProductRepository(null as any);

    const result = (repo as any).extractMediaUrls({
      mediaRef: [
        { url: 'https://example.com/img1.jpg', displayOrder: 0 },
        { url: 'https://example.com/img2.jpg', displayOrder: 1 }
      ]
    });

    // WILL FAIL on unfixed code — returns [] because mediaRef is not read
    expect(result).toContain('https://example.com/img1.jpg');
    expect(result).toContain('https://example.com/img2.jpg');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should return non-empty mediaUrls when product has only mediaRef rows', () => {
    // Validates: Requirements 1.3, 2.3
    // Simulates a seeded product that stores images exclusively in MediaRef
    const repo = new PrismaProductRepository(null as any);

    const result = (repo as any).extractMediaUrls({
      // No mediaUrls, no seoMetadata.mediaUrls, no variant images
      mediaRef: [
        { url: 'https://cdn.example.com/product-photo.jpg', displayOrder: 0 }
      ]
    });

    // WILL FAIL on unfixed code — returns []
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toBe('https://cdn.example.com/product-photo.jpg');
  });

  it('should include all mediaRef URLs in the result', () => {
    // Validates: Requirements 2.5
    const repo = new PrismaProductRepository(null as any);

    const result = (repo as any).extractMediaUrls({
      mediaRef: [
        { url: 'https://example.com/first.jpg', displayOrder: 0 },
        { url: 'https://example.com/second.jpg', displayOrder: 1 }
      ]
    });

    // WILL FAIL on unfixed code — returns []
    expect(result.length).toBe(2);
    expect(result).toContain('https://example.com/first.jpg');
    expect(result).toContain('https://example.com/second.jpg');
  });
});

// ---------------------------------------------------------------------------
// Test 3 — DTO compilation bug condition
// Bug: ProductSummaryDto has duplicate declarations of averageRating and reviewCount
//      with incompatible types, causing TypeScript compilation errors.
// Expected (correct): The DTO source file has no duplicate property declarations.
// Actual (buggy): averageRating and reviewCount appear twice in the interface.
//
// We detect this by reading the source file and counting property occurrences
// within the ProductSummaryDto interface block. We extract the block by finding
// the interface start and counting braces to handle nested types correctly.
// ---------------------------------------------------------------------------
describe('Bug Condition — ProductSummaryDto Duplicate Properties', () => {
  /**
   * Extract the body of a named TypeScript interface from source text.
   * Handles nested braces (e.g. price: { amount: number; currency: string; }).
   */
  function extractInterfaceBody(source: string, interfaceName: string): string | null {
    const startPattern = new RegExp(`interface\\s+${interfaceName}\\s*\\{`);
    const match = startPattern.exec(source);
    if (!match) return null;

    let depth = 0;
    let start = -1;
    let end = -1;

    for (let i = match.index; i < source.length; i++) {
      if (source[i] === '{') {
        if (depth === 0) start = i + 1;
        depth++;
      } else if (source[i] === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }

    if (start === -1 || end === -1) return null;
    return source.slice(start, end);
  }

  it('ProductSummaryDto should not have duplicate averageRating property', () => {
    // Validates: DTO must compile for the fix to be deployable
    // Read the DTO source file and count occurrences of 'averageRating'
    const dtoFilePath = path.resolve(
      __dirname,
      '../../../application/dto/product.dto.ts'
    );

    const dtoSource = fs.readFileSync(dtoFilePath, 'utf8');
    const interfaceBody = extractInterfaceBody(dtoSource, 'ProductSummaryDto');
    expect(interfaceBody).not.toBeNull();

    // Count how many times 'averageRating' appears as a property declaration
    const averageRatingMatches = interfaceBody!.match(/averageRating\s*\??\s*:/g);
    const averageRatingCount = averageRatingMatches ? averageRatingMatches.length : 0;

    // WILL FAIL on unfixed code — averageRating appears twice (count is 2, not 1)
    expect(averageRatingCount).toBe(1);
  });

  it('ProductSummaryDto should not have duplicate reviewCount property', () => {
    // Validates: DTO must compile for the fix to be deployable
    const dtoFilePath = path.resolve(
      __dirname,
      '../../../application/dto/product.dto.ts'
    );

    const dtoSource = fs.readFileSync(dtoFilePath, 'utf8');
    const interfaceBody = extractInterfaceBody(dtoSource, 'ProductSummaryDto');
    expect(interfaceBody).not.toBeNull();

    // Count how many times 'reviewCount' appears as a property declaration
    const reviewCountMatches = interfaceBody!.match(/reviewCount\s*\??\s*:/g);
    const reviewCountCount = reviewCountMatches ? reviewCountMatches.length : 0;

    // WILL FAIL on unfixed code — reviewCount appears twice (count is 2, not 1)
    expect(reviewCountCount).toBe(1);
  });
});
