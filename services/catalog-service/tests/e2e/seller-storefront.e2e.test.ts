import request from 'supertest';
import { createApp } from '../../src/app';
import { SellerStorefrontController } from '../../src/api/controllers/seller-storefront.controller';

jest.setTimeout(60000);

describe('Seller Storefront E2E Tests', () => {
  let app: any;
  const contractTestHeaders = {
    'x-contract-test': '1',
    'x-user-id': 'usr_catalog-e2e',
    'x-user-roles': 'seller'
  };

  beforeAll(async () => {
    const slugs = new Map<string, string>();
    const db = {
      business: {
        findFirst: jest.fn(async ({ where }: any) => where.status ? ({
          id: `business-${where.ownerId}`,
          ownerId: where.ownerId,
          name: `Seller ${where.ownerId}`,
          description: 'Verified test seller',
          attributes: null
        }) : null)
      },
      product: { count: jest.fn(async () => 0) },
      sellerStorefront: {
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.slug) {
            const sellerId = slugs.get(where.slug);
            return sellerId ? { sellerId, slug: where.slug } : null;
          }
          const slug = [...slugs.entries()].find(([, sellerId]) => sellerId === where.sellerId)?.[0];
          return slug ? { sellerId: where.sellerId, slug } : null;
        }),
        upsert: jest.fn(async ({ where, create, update }: any) => {
          const slug = update.slug || create.slug;
          slugs.set(slug, where.sellerId);
          return { sellerId: where.sellerId, slug };
        })
      }
    };
    const controller = new SellerStorefrontController(db as any);
    jest.spyOn(controller as any, 'generateQRCode').mockImplementation(async (...args: unknown[]) =>
      `data:image/png;base64,${Buffer.from(String(args[0])).toString('base64')}`
    );
    app = createApp(controller);
  });

  describe('Complete seller storefront workflow', () => {
    it('should complete full storefront URL generation flow', async () => {
      const sellerId = 'usr_catalog-e2e';

      const storefrontResponse = await request(app)
        .get(`/api/catalog/api/v1/sellers/${sellerId}/storefront`)
        .set(contractTestHeaders)
        .expect(200);

      expect(storefrontResponse.body).toMatchObject({
        success: true,
        data: {
          id: sellerId,
          shareUrl: expect.stringContaining(sellerId),
          shortUrl: expect.stringContaining(sellerId),
          qrCode: expect.stringMatching(/^data:image\/png;base64,/)
        }
      });

      const customSlug = 'my-custom-shop';
      const shareUrlResponse = await request(app)
        .post(`/api/catalog/api/v1/sellers/${sellerId}/share-url`)
        .set(contractTestHeaders)
        .send({ customSlug, includeQR: true })
        .expect(200);

      expect(shareUrlResponse.body.data).toMatchObject({
        shareUrl: expect.stringContaining(customSlug),
        shortUrl: expect.stringContaining(customSlug),
        qrCode: expect.any(String)
      });

      const { shareUrl, shortUrl } = shareUrlResponse.body.data;
      // Public storefront links use the storefront host, separate from the API host.
      const storefrontBaseUrl = process.env.STOREFRONT_BASE_URL || 'https://maysar.co.tz';
      expect(shareUrl).toBe(`${storefrontBaseUrl}/seller/${customSlug}`);
      expect(shortUrl).toBe(`${storefrontBaseUrl}/s/${customSlug}`);
    });

    it('should generate unique QR codes for different sellers', async () => {
      const seller1 = 'seller-qr-1';
      const seller2 = 'seller-qr-2';

      const response1 = await request(app)
        .get(`/api/catalog/api/v1/sellers/${seller1}/storefront`)
        .set(contractTestHeaders);
      
      const response2 = await request(app)
        .get(`/api/catalog/api/v1/sellers/${seller2}/storefront`)
        .set(contractTestHeaders);

      expect(response1.body.data.qrCode).not.toBe(response2.body.data.qrCode);
    });
  });

  describe('Performance and scalability', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 20 }, (_, i) =>
        request(app)
          .get(`/api/catalog/api/v1/sellers/concurrent-${i}/storefront`)
          .set(contractTestHeaders)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});
