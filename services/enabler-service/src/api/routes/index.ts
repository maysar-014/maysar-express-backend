import { Router } from 'express';
import enablerRoutes from './enabler.routes';
import hubRoutes from './hub.routes';

const router = Router();

router.use('/enablers', enablerRoutes);
router.use('/hub', hubRoutes);

export default router;
