import { Router } from 'express';
import { requireAuth } from '@shared/middleware/auth-context.middleware';
import { ProductListingController } from '../controllers/product-listing.controller';
import { BrowseEnablerHubUseCase } from '../../application/use-cases/browse-enabler-hub.use-case';

const router = Router();
router.use(requireAuth);

const browseHubUseCase = new BrowseEnablerHubUseCase();
const controller = new ProductListingController(undefined, undefined, browseHubUseCase);

router.get('/products', (req, res) => controller.getHubProducts(req, res));

export default router;