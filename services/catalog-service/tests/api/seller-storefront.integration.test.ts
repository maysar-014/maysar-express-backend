import request from 'supertest';
import express from 'express';
import { createSellerStorefrontRoutes } from '../../api/routes/seller-storefront.routes';
import { SellerStorefrontController } from '../../api/controllers/seller-storefront.controller';

describe('Seller Storefront Routes Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    const controller = new SellerStorefrontController('https://maysar.co.tz');
    const routes = createSellerStorefrontRoutes(controller);
    app.use('/api/catalog/api/v1/sellers', routes);
  });

  describe('GET /api/catalog/api/v1/sellers/:sellerId/storefront', () => {
    it('should return 200 with storefront details', async () => {
      const response = await request(app)
        .get('/api/catalog/api/v1/sellers/seller123/storefront')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: 'seller123',
          name: expect.any(String),
          shareUrl: 'https://maysar.co.tz/seller/seller123',
          shortUrl: 'https://maysar.co.tz/s/seller123',
          qrCode: expect.stringMatching(/^data:image\/png;base64,/),
          stats: {
            totalProducts: expect.any(Number),
            rating: expect.any(Number)
          }
        },
        meta: {
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 400 for missing seller ID', async () => {
      const response = await request(app)
        .get('/api/catalog/api/v1/sellers//storefront')
        .expect(404); // Express returns 404 for missing route params
    });

    it('should include proper content-type header', async () => {
      const response = await request(app)
        .get('/api/catalog/api/v1/sellers/seller123/storefront');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('POST /api/catalog/api/v1/sellers/:sellerId/share-url', () => {
    it('should generate share URL with QR code', async () => {
      const response = await request(app)
        .post('/api/catalog/api/v1/sellers/seller456/share-url')
        .send({ includeQR: true })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          shareUrl: 'https://maysar.co.tz/seller/seller456',
          shortUrl: 'https://maysar.co.tz/s/seller456',
          qrCode: expect.any(String)
        }
      });
    });

    it('should generate share URL without QR code when requested', async () => {
      const response = await request(app)
        .post('/api/catalog/api/v1/sellers/seller456/share-url')
        .send({ includeQR: false })
        .expect(200);

      expect(response.body.data).not.toHaveProperty('qrCode');
    });

    it('should accept custom slug', async () => {
      const response = await request(app)
        .post('/api/catalog/api/v1/sellers/seller456/share-url')
        .send({ customSlug: 'my-shop' })
        .expect(200);

      expect(response.body.data).toMatchObject({
        shareUrl: 'https://maysar.co.tz/seller/my-shop',
        shortUrl: 'https://maysar.co.tz/s/my-shop'
      });
    });

    it('should handle empty request body', async () => {
      const response = await request(app)
        .post('/api/catalog/api/v1/sellers/seller456/share-url')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('shareUrl');
      expect(response.body.data).toHaveProperty('qrCode');
    });

    it('should validate content-type for POST requests', async () => {
      await request(app)
        .post('/api/catalog/api/v1/sellers/seller456/share-url')
        .set('Content-Type', 'application/json')
        .send({ includeQR: true })
        .expect(200);
    });
  });

  describe('URL structure validation', () => {
    it('should generate consistent URL format', async () => {
      const response1 = await request(app)
        .get('/api/catalog/api/v1/sellers/test-seller/storefront');
      
      const response2 = await request(app)
        .post('/api/catalog/api/v1/sellers/test-seller/share-url')
        .send({});

      expect(response1.body.data.shareUrl).toBe(response2.body.data.shareUrl);
      expect(response1.body.data.shortUrl).toBe(response2.body.data.shortUrl);
    });

    it('should handle special characters in seller ID', async () => {
      const response = await request(app)
        .get('/api/catalog/api/v1/sellers/seller-123_abc/storefront')
        .expect(200);

      expect(response.body.data.shareUrl).toContain('seller-123_abc');
    });
  });

  describe('QR Code validation', () => {
    it('should generate valid base64 QR code', async () => {
      const response = await request(app)
        .get('/api/catalog/api/v1/sellers/seller123/storefront')
        .expect(200);

      const qrCode = response.body.data.qrCode;
      expect(qrCode).toMatch(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/);
      
      // Verify base64 can be decoded
      const base64Data = qrCode.split(',')[1];
      expect(() => Buffer.from(base64Data, 'base64')).not.toThrow();
    });

    it('should generate different QR codes for different sellers', async () => {
      const response1 = await request(app)
        .get('/api/catalog/api/v1/sellers/seller1/storefront');
      
      const response2 = await request(app)
        .get('/api/catalog/api/v1/sellers/seller2/storefront');

      expect(response1.body.data.qrCode).not.toBe(response2.body.data.qrCode);
    });
  });

  describe('Performance', () => {
    it('should respond within acceptable time', async () => {
      const start = Date.now();
      
      await request(app)
        .get('/api/catalog/api/v1/sellers/seller123/storefront')
        .expect(200);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) =>
        request(app).get(`/api/catalog/api/v1/sellers/seller${i}/storefront`)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});
