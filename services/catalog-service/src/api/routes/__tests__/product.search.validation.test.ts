import express from 'express';
import request from 'supertest';
import { createProductRoutes } from '../product.routes';

describe('Product search query validation', () => {
  it('rejects blank minPrice values', async () => {
    const productController = {
      searchProducts: jest.fn((_req, res) => {
        res.status(200).json({ success: true, data: [] });
      })
    } as any;

    const app = express();
    app.use(express.json());
    app.use(createProductRoutes(productController, { apiVersion: 'v1' }));

    const response = await request(app)
      .get('/v1/products/search?minPrice=')
      .set('Authorization', 'Bearer valid-token-123');

    expect(productController.searchProducts).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
