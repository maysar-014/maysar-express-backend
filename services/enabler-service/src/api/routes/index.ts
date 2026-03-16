import { Router } from 'express';
import enablerRoutes from './enabler.routes';
import hubRoutes from './hub.routes';
import { createMaintenanceRoutes } from './maintenance.routes';

const router = Router();

router.use('/enablers', enablerRoutes);
router.use('/hub', hubRoutes);
router.use('/system/maintenance', createMaintenanceRoutes());

export default router;
