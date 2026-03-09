import express from 'express';
import request from 'supertest';
import { createSellerStorefrontRoutes } from './seller-storefront.routes';

describe('createSellerStorefrontRoutes', () => {
  it('wires storefront and share-url handlers', async () => {
    const controller = {
      getStorefront: jest.fn((req, res) => res.status(200).json({ sellerId: req.params.sellerId })),
      generateShareUrl: jest.fn((req, res) => res.status(200).json({ shareUrl: `url-${req.params.sellerId}` }))
    };
    const app = express();
    app.use(express.json());
    app.use('/storefront', createSellerStorefrontRoutes(controller as never));

    const storefront = await request(app).get('/storefront/seller-1/storefront');
    const share = await request(app).post('/storefront/seller-1/share-url');

    expect(storefront.status).toBe(200);
    expect(storefront.body.sellerId).toBe('seller-1');
    expect(share.body.shareUrl).toBe('url-seller-1');
    expect(controller.getStorefront).toHaveBeenCalled();
    expect(controller.generateShareUrl).toHaveBeenCalled();
  });
});
