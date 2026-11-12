import request from 'supertest';
import express from 'express';
import { createSellerStorefrontRoutes } from '../../src/api/routes/seller-storefront.routes';
import { SellerStorefrontController } from '../../src/api/controllers/seller-storefront.controller';

describe('Seller storefront routes', () => {
  const sellerId = 'usr_storefront-test';
  const slugs = new Map<string, string>();
  let app: express.Application;

  beforeAll(() => {
    const db = {
      business: {
        findFirst: jest.fn(async ({ where }: any) => !where.status || where.ownerId === 'usr_missing'
          ? null
          : ({ id: `business-${where.ownerId}`, ownerId: where.ownerId, name: `Shop ${where.ownerId}`, description: null }))
      },
      product: { count: jest.fn(async () => 3) },
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

    app = express();
    app.use(express.json());
    app.use('/api/catalog/api/v1/sellers', createSellerStorefrontRoutes(
      new SellerStorefrontController(db as any, 'https://maysar.co.tz')
    ));
  });

  const auth = (userId: string) => ({
    'x-contract-test': '1',
    'x-user-id': userId,
    'x-user-roles': 'seller'
  });

  it('returns public verified storefront details by seller ID', async () => {
    const response = await request(app)
      .get(`/api/catalog/api/v1/sellers/${sellerId}/storefront`)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        id: sellerId,
        name: `Shop ${sellerId}`,
        shareUrl: `https://maysar.co.tz/seller/${sellerId}`,
        shortUrl: `https://maysar.co.tz/s/${sellerId}`,
        stats: { totalProducts: 3, rating: 0 }
      }
    });
  });

  it('returns 404 when the seller has no public business', async () => {
    await request(app)
      .get('/api/catalog/api/v1/sellers/usr_missing/storefront')
      .expect(404);
  });

  it('requires authentication and seller ownership to generate links', async () => {
    await request(app)
      .post(`/api/catalog/api/v1/sellers/${sellerId}/share-url`)
      .send({})
      .expect(401);

    await request(app)
      .post(`/api/catalog/api/v1/sellers/${sellerId}/share-url`)
      .set(auth('usr_other-seller'))
      .send({})
      .expect(403);
  });

  it('saves a custom slug, returns links, and resolves the slug for public storefront reads', async () => {
    const shareResponse = await request(app)
      .post(`/api/catalog/api/v1/sellers/${sellerId}/share-url`)
      .set(auth(sellerId))
      .send({ customSlug: 'my-shop', includeQR: false })
      .expect(200);

    expect(shareResponse.body.data).toEqual({
      shareUrl: 'https://maysar.co.tz/seller/my-shop',
      shortUrl: 'https://maysar.co.tz/s/my-shop'
    });

    const storefront = await request(app)
      .get('/api/catalog/api/v1/sellers/my-shop/storefront')
      .expect(200);
    expect(storefront.body.data).toMatchObject({ id: sellerId, shareUrl: 'https://maysar.co.tz/seller/my-shop' });
  });

  it('rejects invalid and conflicting slugs', async () => {
    await request(app)
      .post(`/api/catalog/api/v1/sellers/${sellerId}/share-url`)
      .set(auth(sellerId))
      .send({ customSlug: 'bad slug' })
      .expect(400);

    await request(app)
      .post('/api/catalog/api/v1/sellers/usr_other-owner/share-url')
      .set(auth('usr_other-owner'))
      .send({ customSlug: 'my-shop' })
      .expect(409);
  });
});
