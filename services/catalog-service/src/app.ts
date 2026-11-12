import express from 'express';
import { SellerStorefrontController } from './api/controllers/seller-storefront.controller';
import { createSellerStorefrontRoutes } from './api/routes/seller-storefront.routes';

export function createApp(controller = new SellerStorefrontController()) {
  const app = express();

  app.use(express.json());
  app.use('/api/catalog/api/v1/sellers', createSellerStorefrontRoutes(controller));

  return app;
}

export default createApp;
