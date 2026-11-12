import { Request, Response } from 'express';
import { SellerStorefrontController } from '../seller-storefront.controller';

const business = {
  id: 'business-1',
  ownerId: 'seller123',
  name: 'Maysar Shop',
  description: 'Verified shop',
  attributes: { logoUrl: 'https://cdn.example/logo.png' }
};

function createDb() {
  const slugs = new Map<string, string>();
  return {
    business: { findFirst: jest.fn(async ({ where }: any) => where.status ? business : null) },
    product: { count: jest.fn(async () => 12) },
    sellerStorefront: {
      findUnique: jest.fn(async ({ where }: any) => {
        if (where.slug) {
          const ownerId = slugs.get(where.slug);
          return ownerId ? { sellerId: ownerId, slug: where.slug } : null;
        }
        const slug = [...slugs.entries()].find(([, ownerId]) => ownerId === where.sellerId)?.[0];
        return slug ? { sellerId: where.sellerId, slug } : null;
      }),
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const slug = update.slug || create.slug;
        if ([...slugs.entries()].some(([existingSlug, ownerId]) => existingSlug === slug && ownerId !== where.sellerId)) {
          throw Object.assign(new Error('unique constraint'), { code: 'P2002' });
        }
        for (const [existingSlug, ownerId] of slugs.entries()) {
          if (ownerId === where.sellerId) slugs.delete(existingSlug);
        }
        slugs.set(slug, where.sellerId);
        return { sellerId: where.sellerId, slug };
      })
    }
  };
}

function createResponse() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { response: { status, json } as unknown as Response, status, json };
}

describe('SellerStorefrontController', () => {
  it('returns verified seller details and counts public published products', async () => {
    const db = createDb();
    const controller = new SellerStorefrontController(db as any, 'https://shop.example/');
    const { response, status, json } = createResponse();

    await controller.getStorefront({ params: { sellerId: 'seller123' } } as unknown as Request, response);

    expect(status).toHaveBeenCalledWith(200);
    expect(db.business.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ ownerId: 'seller123', status: 'ACTIVE', verificationStatus: 'VERIFIED' })
    }));
    expect(db.product.count).toHaveBeenCalledWith({
      where: { sellerId: 'seller123', status: 'published', visibility: 'public' }
    });
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        id: 'seller123',
        name: 'Maysar Shop',
        logo: 'https://cdn.example/logo.png',
        shareUrl: 'https://shop.example/seller/maysar-shop',
        shortUrl: 'https://shop.example/s/maysar-shop',
        qrCode: expect.stringMatching(/^data:image\/png;base64,/),
        stats: { totalProducts: 12, rating: 0 }
      })
    }));
  });

  it('returns 404 for sellers without a public verified business', async () => {
    const db = createDb();
    db.business.findFirst.mockResolvedValue(null as any);
    const controller = new SellerStorefrontController(db as any);
    const { response, status, json } = createResponse();

    await controller.getStorefront({ params: { sellerId: 'missing' } } as unknown as Request, response);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('rejects link generation by a different seller', async () => {
    const db = createDb();
    const controller = new SellerStorefrontController(db as any);
    const { response, status } = createResponse();

    await controller.generateShareUrl({
      params: { sellerId: 'seller123' }, body: {}, user: { userId: 'someone-else', roles: ['seller'] }
    } as unknown as Request, response);

    expect(status).toHaveBeenCalledWith(403);
    expect(db.business.findFirst).not.toHaveBeenCalled();
  });

  it('allows the seller to save a unique custom slug and omits QR when requested', async () => {
    const db = createDb();
    const controller = new SellerStorefrontController(db as any, 'https://shop.example');
    const { response, status, json } = createResponse();

    await controller.generateShareUrl({
      params: { sellerId: 'seller123' },
      body: { customSlug: 'my-custom-shop', includeQR: false },
      user: { userId: 'seller123', roles: ['seller'] }
    } as unknown as Request, response);

    expect(status).toHaveBeenCalledWith(200);
    expect(db.sellerStorefront.upsert).toHaveBeenCalledWith({
      where: { sellerId: 'seller123' },
      create: { sellerId: 'seller123', slug: 'my-custom-shop' },
      update: { slug: 'my-custom-shop' }
    });
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      data: {
        shareUrl: 'https://shop.example/seller/my-custom-shop',
        shortUrl: 'https://shop.example/s/my-custom-shop'
      }
    }));

    const publicResponse = createResponse();
    await controller.getStorefront({ params: { sellerId: 'my-custom-shop' } } as unknown as Request, publicResponse.response);
    expect(publicResponse.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        id: 'seller123',
        shareUrl: 'https://shop.example/seller/my-custom-shop'
      })
    }));
  });

  it('returns 409 when a custom slug is already used', async () => {
    const db = createDb();
    await db.sellerStorefront.upsert({ where: { sellerId: 'seller456' }, create: { sellerId: 'seller456', slug: 'already-used' }, update: { slug: 'already-used' } });
    const controller = new SellerStorefrontController(db as any);
    const { response, status, json } = createResponse();

    await controller.generateShareUrl({
      params: { sellerId: 'seller123' },
      body: { customSlug: 'already-used' },
      user: { userId: 'seller123', roles: ['seller'] }
    } as unknown as Request, response);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'SLUG_UNAVAILABLE' })
    }));
  });
});
