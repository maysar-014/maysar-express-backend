import { Router } from 'express';
import { requireAuth } from '@shared/middleware/auth-context.middleware';
import { ProductListingController } from '../controllers/product-listing.controller';
import { BrowseEnablerHubUseCase } from '../../application/use-cases/browse-enabler-hub.use-case';
import Joi from 'joi';
import { asyncHandler } from '@shared/middleware/async-handler';
import { validateJoiRequest } from '@shared/middleware/joi-request-validation';
import { PromotedCatalogController } from '../controllers/promoted-catalog.controller';
import { PromotedCatalogService } from '../../application/services/promoted-catalog.service';

const router = Router();
const publicCatalogController = new PromotedCatalogController(new PromotedCatalogService());
const publicCatalogParamsSchema = Joi.object({
  publicCode: Joi.string().trim().min(6).max(32).pattern(/^[A-Za-z0-9_-]+$/).required(),
}).unknown(false);

// Public entry point for an enabler's persistent catalog. Product visibility is
// re-derived from current seller authorizations on every request.
router.get(
  '/catalog/:publicCode',
  validateJoiRequest({ params: publicCatalogParamsSchema }),
  asyncHandler((req, res) => publicCatalogController.getPublicCatalog(req, res))
);

router.use(requireAuth);

const browseHubUseCase = new BrowseEnablerHubUseCase();
const controller = new ProductListingController(undefined, undefined, browseHubUseCase);

router.get('/products', (req, res) => controller.getHubProducts(req, res));

export default router;
