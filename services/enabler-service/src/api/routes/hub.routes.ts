import { Router } from 'express';
import { requireAuth } from '@shared/middleware/auth-context.middleware';
// import { BrowseEnablerHubUseCase } from '../../application/use-cases/browse-enabler-hub.use-case';

const router = Router();
router.use(requireAuth);

// Placeholder for Hub routes (public browsing of enabler-eligible products)
router.get('/products', (req, res) => {
    res.status(200).json({ message: 'Browse Enabler Hub - To Be Implemented' });
});

export default router;
