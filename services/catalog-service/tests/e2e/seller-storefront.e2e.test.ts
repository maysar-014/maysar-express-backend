import request from 'supertest';
import { createApp } from '../../src/app';

jest.setTimeout(60000);

describe('Seller Storefront E2E Tests', () => {
  let app: any;
  const contractTestHeaders = {
    'x-contract-test': '1',
    'x-user-id': 'usr_catalog-e2e',
    'x-user-roles': 'seller'
  };

  beforeAll(async () => {
    app = createApp();
  });

  describe('Complete seller storefront workflow', () => {
    it('should complete full storefront URL generation flow', async () => {
      const sellerId = 'test-seller-' + Date.now();

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
      expect(shareUrl).toMatch(/^https:\/\/maysar\.co\.tz\/seller\//);
      expect(shortUrl).toMatch(/^https:\/\/maysar\.co\.tz\/s\//);
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
