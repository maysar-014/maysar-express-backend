/**
 * Preservation Tests — Seller Storefront Public Slug
 *
 * These tests verify that sellers who ALREADY have a persisted slug are completely
 * unaffected by the fix. They are written BEFORE the fix is implemented and should
 * PASS on both the unfixed AND fixed code.
 *
 * Property 2 (Preservation):
 *   FOR ALL X WHERE NOT isBugCondition(X):
 *     buildSellerUrl_original(X) = buildSellerUrl_fixed(X)
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { Request, Response } from 'express';
import { SellerStorefrontController } from '../seller-storefront.controller';
import { ProductController } from '../product.controller';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const BASE_URL = 'https://shop.example';
const SELLER_ID = 'seller123';
const EXISTING_SLUG = 'maysar-shop';

function makeStorefrontDb(options: {
  slug?: string;
  slugBySellerId?: string;
} = {}) {
  const slug = options.slug ?? EXISTING_SLUG;
  const slugBySellerId = options.slugBySellerId ?? slug;
  return {
    business: {
      findFirst: jest.fn(async ({ where }: any) => {
        if (!where?.status) return null;
        return {
          id: 'business-1',
          ownerId: SELLER_ID,
          name: 'Maysar Shop',
          description: 'Verified shop',
          attributes: { logoUrl: 'https://cdn.example/logo.png' }
        };
      })
    },
    product: {
      count: jest.fn(async () => 12)
    },
    sellerStorefront: {
      // Existing slug is already stored — slug lookup returns a row
      findUnique: jest.fn(async ({ where }: any) => {
        if (where.slug) {
          // Slug-based lookup (e.g. getStorefront by slug)
          if (where.slug === slug) {
            return { sellerId: SELLER_ID, slug };
          }
          return null;
        }
        if (where.sellerId === SELLER_ID) {
          // sellerId-based lookup — returns the existing slug
          return { sellerId: SELLER_ID, slug: slugBySellerId };
        }
        return null;
      }),
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
// Preservation Test 1 — getStorefront for a seller with existing slug
// Property 2: isBugCondition = false (storefront_controller, hasPersistedSlug = true)
// Expected: shareUrl uses the existing slug, unchanged by fix
// ---------------------------------------------------------------------------
describe('Preservation — getStorefront with existing slug', () => {
  it('shareUrl uses the existing persisted slug, not the raw sellerId', async () => {
    const db = makeStorefrontDb({ slug: EXISTING_SLUG });
    const controller = new SellerStorefrontController(db as any, BASE_URL);
    const { response, json } = makeStorefrontRes();

    await controller.getStorefront(
      { params: { sellerId: SELLER_ID } } as unknown as Request,
      response
    );

    const call = (json as jest.Mock).mock.calls[0]?.[0];
    expect(call?.success).toBe(true);
    expect(call?.data?.shareUrl).toBe(`${BASE_URL}/seller/${EXISTING_SLUG}`);
    expect(call?.data?.shortUrl).toBe(`${BASE_URL}/s/${EXISTING_SLUG}`);
  });

  it('shareUrl does not change when called multiple times with the same persisted slug', async () => {
    const db = makeStorefrontDb({ slug: EXISTING_SLUG });
    const controller = new SellerStorefrontController(db as any, BASE_URL);

    const results: string[] = [];
    for (let i = 0; i < 3; i++) {
      const { response, json } = makeStorefrontRes();
      await controller.getStorefront(
        { params: { sellerId: SELLER_ID } } as unknown as Request,
        response
      );
      const call = (json as jest.Mock).mock.calls[0]?.[0];
      results.push(call?.data?.shareUrl ?? '');
    }

    // All calls produce the same URL
    expect(results[0]).toBe(results[1]);
    expect(results[1]).toBe(results[2]);
    expect(results[0]).toBe(`${BASE_URL}/seller/${EXISTING_SLUG}`);
  });

  it('existing slug does not get overwritten with a generated default', async () => {
    const db = makeStorefrontDb({ slug: 'custom-slug-already-set' });
    const controller = new SellerStorefrontController(db as any, BASE_URL);
    const { response, json } = makeStorefrontRes();

    await controller.getStorefront(
      { params: { sellerId: SELLER_ID } } as unknown as Request,
      response
    );

    const call = (json as jest.Mock).mock.calls[0]?.[0];
    expect(call?.data?.shareUrl).toBe(`${BASE_URL}/seller/custom-slug-already-set`);
    // upsert must NOT be called for sellers who already have a slug
    expect(db.sellerStorefront.upsert).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Preservation Test 2 — generateShareUrl with customSlug
// Property 2: customSlug write flow must persist and return correctly
// Validates: Requirement 3.2
// ---------------------------------------------------------------------------
describe('Preservation — generateShareUrl with customSlug', () => {
  it('persists the customSlug and returns the correct shareUrl', async () => {
    const db = makeStorefrontDb({ slug: EXISTING_SLUG });
    const controller = new SellerStorefrontController(db as any, BASE_URL);
    const { response, json } = makeStorefrontRes();

    await controller.generateShareUrl(
      {
        params: { sellerId: SELLER_ID },
        body: { customSlug: 'my-custom-shop', includeQR: false },
        user: { userId: SELLER_ID, roles: ['seller'] }
      } as unknown as Request,
      response
    );

    const call = (json as jest.Mock).mock.calls[0]?.[0];
    expect(call?.success).toBe(true);
    expect(call?.data?.shareUrl).toBe(`${BASE_URL}/seller/my-custom-shop`);
    expect(call?.data?.shortUrl).toBe(`${BASE_URL}/s/my-custom-shop`);
    // The upsert must have been called with the customSlug
    expect(db.sellerStorefront.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sellerId: SELLER_ID },
        create: expect.objectContaining({ slug: 'my-custom-shop' }),
        update: expect.objectContaining({ slug: 'my-custom-shop' })
      })
    );
  });

  it('returns 403 when a different user attempts to generate a shareUrl', async () => {
    const db = makeStorefrontDb({ slug: EXISTING_SLUG });
    const controller = new SellerStorefrontController(db as any, BASE_URL);
    const { response, status } = makeStorefrontRes();

    await controller.generateShareUrl(
      {
        params: { sellerId: SELLER_ID },
        body: { customSlug: 'my-custom-shop' },
        user: { userId: 'different-user', roles: ['seller'] }
      } as unknown as Request,
      response
    );

    expect(status).toHaveBeenCalledWith(403);
  });
});

// ---------------------------------------------------------------------------
// Preservation Test 3 — Slug-based storefront lookup
// Property 2: GET /storefront/:slug must continue resolving correctly
// Validates: Requirement 3.3
// ---------------------------------------------------------------------------
describe('Preservation — slug-based storefront lookup', () => {
  it('resolves the correct seller when accessed via the stored slug', async () => {
    const db = makeStorefrontDb({ slug: EXISTING_SLUG });
    const controller = new SellerStorefrontController(db as any, BASE_URL);
    const { response, json } = makeStorefrontRes();

    // Access via slug (not sellerId)
    await controller.getStorefront(
      { params: { sellerId: EXISTING_SLUG } } as unknown as Request,
      response
    );

    const call = (json as jest.Mock).mock.calls[0]?.[0];
    expect(call?.success).toBe(true);
    expect(call?.data?.id).toBe(SELLER_ID);
    expect(call?.data?.shareUrl).toBe(`${BASE_URL}/seller/${EXISTING_SLUG}`);
  });
});

// ---------------------------------------------------------------------------
// Preservation Test 4 — getProductsBySeller graceful degradation
// Property 2: use-case error branch still returns 200 with empty list
// Validates: Requirement 3.4
// ---------------------------------------------------------------------------
describe('Preservation — getProductsBySeller graceful degradation', () => {
  it('returns 200 with empty data array when use case returns an error', async () => {
    const mockSlugDb = {
      sellerStorefront: {
        findUnique: jest.fn(async () => ({ sellerId: 'seller-graceful', slug: 'graceful-seller' })),
        upsert: jest.fn(async ({ where, create, update }: any) => ({
          sellerId: where.sellerId,
          slug: update.slug ?? create.slug
        }))
      },
      business: {
        findFirst: jest.fn(async () => ({ name: 'Graceful Seller' }))
      }
    };

    const mockGetProductsBySellerUseCase = {
      execute: jest.fn(async () => ({
        status: 'error',
        message: 'Database connection failed',
        products: [],
        total: 0
      }))
    };

    const controller = new ProductController(
      { execute: jest.fn() } as any,   // createProduct
      { execute: jest.fn() } as any,   // getProduct
      mockGetProductsBySellerUseCase as any,
      { execute: jest.fn() } as any,   // searchProducts
      {} as any,                        // productMapper
      { execute: jest.fn() } as any,   // loadCategoryAttributes
      { execute: jest.fn() } as any,   // previewDescription
      undefined,                        // config (createProductWithMatchingUseCase)
      { execute: jest.fn() } as any,   // listCategories
      { execute: jest.fn() } as any,   // createCategory
      { execute: jest.fn() } as any,   // updateCategory
      { execute: jest.fn() } as any,   // deleteCategory
      mockSlugDb as any                 // db (slug repo)
    );

    const req = {
      params: { sellerId: 'seller-graceful' },
      query: {},
      body: {},
      headers: { 'x-request-id': 'test-id' }
    };
    const res = makeProductRes();

    await controller.getProductsBySeller(req as any, res as any);

    // Must still return 200
    expect(res.status).toHaveBeenCalledWith(200);
    const responseBody = (res.json as jest.Mock).mock.calls[0]?.[0];
    expect(responseBody?.success).toBe(true);
    expect(responseBody?.data).toEqual([]);
    expect(responseBody?.meta?.pagination?.total).toBe(0);
  });
});
