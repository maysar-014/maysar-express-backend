import express from 'express';
import { SellerStorefrontController } from './api/controllers/seller-storefront.controller';
import { createSellerStorefrontRoutes } from './api/routes/seller-storefront.routes';

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use('/api/catalog/api/v1/sellers', createSellerStorefrontRoutes(new SellerStorefrontController()));

  return app;
}

export default createApp;
