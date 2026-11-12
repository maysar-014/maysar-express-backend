/**
 * Bug Condition Exploration Tests — Seller Storefront Public Slug
 *
 * These tests encode the EXPECTED (correct) behavior.
 * They are run FIRST on the UNFIXED code to confirm the bug exists.
 *
 * EXPECTED OUTCOME on unfixed code: ALL THREE TESTS FAIL.
 * - Failure proves the bug is real and both controller paths are affected.
 * - After the fix is implemented (Tasks 3.1–3.3), all tests must PASS.
 *
 * Bug Condition:
 *   isBugCondition(X) = true when:
 *     (X.source = "storefront_controller" AND X.hasPersistedSlug = false)
 *     OR (X.source = "product_controller")
 *
 * Property 1 (Fix Checking):
 *   FOR ALL X WHERE isBugCondition(X):
 *     result.shareUrl does NOT contain "usr_"
 *     result.shareUrl does NOT contain the raw sellerId
 *     result.shareUrl MATCHES pattern {baseUrl}/seller/[a-z0-9][a-z0-9-]*
 */

import { Request, Response } from 'express';
import { SellerStorefrontController } from '../seller-storefront.controller';
import { ProductController } from '../product.controller';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function makeStorefrontDb(overrides: {
  slugRow?: { sellerId: string; slug: string } | null;
  businessName?: string;
  sellerId?: string;
} = {}) {
  const {
    slugRow = null,
    businessName = 'Pendo Crafts',
    sellerId = 'usr_01KRFZ1E5G6CWAQ4BXKVNPYG3Z'
  } = overrides;

  return {
    business: {
      findFirst: jest.fn(async ({ where }: any) => {
        if (!where?.status) return null;
        return {
          id: 'business-1',
          ownerId: sellerId,
          name: businessName,
          description: 'Test shop',
          attributes: {}
        };
      })
    },
    product: {
      count: jest.fn(async () => 5)
    },
    sellerStorefront: {
      // No row in table → slug is absent → bug condition triggers
      findUnique: jest.fn(async () => slugRow),
      upsert: jest.fn(async ({ where, create, update }: any) => ({
        sellerId: where.sellerId,
        slug: update.slug ?? create.slug
      }))
    }
  };
}

function makeStorefrontRes() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { response: { status, json } as unknown as Response, status, json };
}

function makeProductRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  };
}

// ---------------------------------------------------------------------------
// Test Case A — Storefront controller: no slug persisted
// isBugCondition(X) = true (source="storefront_controller", hasPersistedSlug=false)
//
// Unfixed behavior: slug: existingSlug ?? sellerId → slug = "usr_01KRFZ1E5G6CWAQ4BXKVNPYG3Z"
//   → shareUrl = "https://maysar.co.tz/seller/usr_01KRFZ1E5G6CWAQ4BXKVNPYG3Z"  ← BUG
//
// Expected (correct) behavior: slug auto-generated from business name "Pendo Crafts"
//   → shareUrl = "https://maysar.co.tz/seller/pendo-crafts"  (or similar human-readable slug)
// ---------------------------------------------------------------------------
describe('Bug Condition Exploration — Test Case A: Storefront controller, no slug persisted', () => {
  const RAW_SELLER_ID = 'usr_01KRFZ1E5G6CWAQ4BXKVNPYG3Z';

  it('shareUrl must not contain the raw sellerId when no slug is persisted', async () => {
    // Arrange: no slug row exists in sellerStorefront table
    const db = makeStorefrontDb({ slugRow: null, sellerId: RAW_SELLER_ID, businessName: 'Pendo Crafts' });
    const controller = new SellerStorefrontController(db as any, 'https://maysar.co.tz');
    const { response, json } = makeStorefrontRes();

    // Act
    await controller.getStorefront(
      { params: { sellerId: RAW_SELLER_ID } } as unknown as Request,
      response
    );

    // Assert — the response should be a 200
    const call = (json as jest.Mock).mock.calls[0]?.[0];
    expect(call).toBeDefined();
    expect(call.success).toBe(true);

    const shareUrl: string = call.data?.shareUrl ?? '';

    // Property 1: shareUrl must not expose the raw usr_... ID
    // ON UNFIXED CODE: shareUrl = "https://maysar.co.tz/seller/usr_01KRFZ1E5G6CWAQ4BXKVNPYG3Z" → FAILS here
    expect(shareUrl).not.toContain('usr_');
    expect(shareUrl).not.toBe(`https://maysar.co.tz/seller/${RAW_SELLER_ID}`);

    // Property 1: shareUrl must match human-readable slug pattern
    expect(shareUrl).toMatch(/^https:\/\/maysar\.co\.tz\/seller\/[a-z0-9][a-z0-9-]*$/);
  });

  it('shortUrl must not contain the raw sellerId when no slug is persisted', async () => {
    const db = makeStorefrontDb({ slugRow: null, sellerId: RAW_SELLER_ID, businessName: 'Pendo Crafts' });
    const controller = new SellerStorefrontController(db as any, 'https://maysar.co.tz');
    const { response, json } = makeStorefrontRes();

    await controller.getStorefront(
      { params: { sellerId: RAW_SELLER_ID } } as unknown as Request,
      response
    );

    const call = (json as jest.Mock).mock.calls[0]?.[0];
    const shortUrl: string = call?.data?.shortUrl ?? '';

    // ON UNFIXED CODE: shortUrl = "https://maysar.co.tz/s/usr_01KRFZ1E5G6CWAQ4BXKVNPYG3Z" → FAILS here
    expect(shortUrl).not.toContain('usr_');
    expect(shortUrl).toMatch(/^https:\/\/maysar\.co\.tz\/s\/[a-z0-9][a-z0-9-]*$/);
  });
});

// ---------------------------------------------------------------------------
// Test Case B — Product controller: slug EXISTS in table but is never consulted
// isBugCondition(X) = true (source="product_controller")
//
// Unfixed behavior: shareUrl always = `${baseUrl}/seller/${sellerId}` regardless of slug table
//   → shareUrl = "https://maysar.co.tz/seller/usr_ABCDEF"  ← BUG
//
// Expected (correct) behavior: look up slug "best-shop" → shareUrl = "https://maysar.co.tz/seller/best-shop"
// ---------------------------------------------------------------------------
describe('Bug Condition Exploration — Test Case B: Product controller, slug exists but is never consulted', () => {
  const RAW_SELLER_ID = 'usr_ABCDEF';
  const EXISTING_SLUG = 'best-shop';

  it('seller.shareUrl must use the stored slug, not the raw sellerId', async () => {
    // Arrange: a slug IS persisted for this seller
    const mockSlugDb = {
      sellerStorefront: {
        findUnique: jest.fn(async () => ({ sellerId: RAW_SELLER_ID, slug: EXISTING_SLUG })),
        upsert: jest.fn(async ({ where, create, update }: any) => ({
          sellerId: where.sellerId,
          slug: update.slug ?? create.slug
        }))
      },
      business: {
        findFirst: jest.fn(async () => ({ name: 'Best Shop' }))
      }
    };

    const mockGetProductsBySellerUseCase = {
      execute: jest.fn(async () => ({
        status: 'success',
        products: [],
        total: 0
      }))
    };

    // Build controller — inject mockSlugDb as the optional db parameter (post-fix)
    // On UNFIXED code ProductController does not accept a db param so shareUrl uses raw sellerId
    const controller = new ProductController(
      { execute: jest.fn() } as any,   // createProduct
      { execute: jest.fn() } as any,   // getProduct
      mockGetProductsBySellerUseCase as any,
      { execute: jest.fn() } as any,   // searchProducts
      {} as any,                        // productMapper
      { execute: jest.fn() } as any,   // loadCategoryAttributes
      { execute: jest.fn() } as any,   // previewDescription
      undefined,                        // config
      { execute: jest.fn() } as any,   // listCategories
      { execute: jest.fn() } as any,   // createCategory
      { execute: jest.fn() } as any,   // updateCategory
      { execute: jest.fn() } as any,   // deleteCategory
      mockSlugDb as any                 // db (slug repo) — added by fix Task 3.3
    );

    const req = {
      params: { sellerId: RAW_SELLER_ID },
      query: {},
      body: {},
      headers: { 'x-request-id': 'test-id' }
    };
    const res = makeProductRes();

    // Act
    await controller.getProductsBySeller(req as any, res as any);

    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
    const responseBody = (res.json as jest.Mock).mock.calls[0]?.[0];
    const shareUrl: string = responseBody?.seller?.shareUrl ?? '';

    // Property 1: shareUrl must use the stored slug
    // ON UNFIXED CODE: shareUrl = "https://maysar.co.tz/seller/usr_ABCDEF" → FAILS here
    expect(shareUrl).not.toContain('usr_');
    expect(shareUrl).toBe(`https://maysar.co.tz/seller/${EXISTING_SLUG}`);
  });
});

// ---------------------------------------------------------------------------
// Test Case C — Product controller: no slug persisted
// isBugCondition(X) = true (source="product_controller")
//
// Unfixed behavior: shareUrl = `${baseUrl}/seller/${sellerId}` (raw ID)
// Expected: slug auto-generated and used
// ---------------------------------------------------------------------------
describe('Bug Condition Exploration — Test Case C: Product controller, no slug persisted', () => {
  const RAW_SELLER_ID = 'usr_456';

  it('seller.shareUrl must not contain the raw sellerId when no slug is stored', async () => {
    // Arrange: no slug row exists
    const mockSlugDb = {
      sellerStorefront: {
        findUnique: jest.fn(async () => null),
        upsert: jest.fn(async ({ where, create, update }: any) => ({
          sellerId: where.sellerId,
          slug: update.slug ?? create.slug
        }))
      },
      business: {
        // Returning a business name so the slug is human-readable, not a sellerId excerpt
        findFirst: jest.fn(async () => ({ name: 'Test Shop' }))
      }
    };

    const mockGetProductsBySellerUseCase = {
      execute: jest.fn(async () => ({
        status: 'success',
        products: [],
        total: 0
      }))
    };

    const controller = new ProductController(
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      mockGetProductsBySellerUseCase as any,
      { execute: jest.fn() } as any,
      {} as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      undefined,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      mockSlugDb as any
    );

    const req = {
      params: { sellerId: RAW_SELLER_ID },
      query: {},
      body: {},
      headers: { 'x-request-id': 'test-id' }
    };
    const res = makeProductRes();

    // Act
    await controller.getProductsBySeller(req as any, res as any);

    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
    const responseBody = (res.json as jest.Mock).mock.calls[0]?.[0];
    const shareUrl: string = responseBody?.seller?.shareUrl ?? '';

    // Property 1: shareUrl must not expose the raw usr_... ID
    // ON UNFIXED CODE: shareUrl = "https://maysar.co.tz/seller/usr_456" → FAILS here
    expect(shareUrl).not.toContain(RAW_SELLER_ID);
    expect(shareUrl).not.toContain('usr_');
    // Should use the business name slug "test-shop", not the sellerId excerpt
    expect(shareUrl).toMatch(/^https?:\/\/.+\/seller\/test-shop$/);
  });
});
