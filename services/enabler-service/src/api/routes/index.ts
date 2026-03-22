import { Router } from 'express';
import enablerRoutes from './enabler.routes';
import hubRoutes from './hub.routes';
import { createMaintenanceRoutes } from './maintenance.routes';
import { requireRoleOrService } from '@shared/middleware/auth-context.middleware';

const router = Router();

router.use('/enablers', enablerRoutes);
router.use('/hub', hubRoutes);
router.use('/system/maintenance', requireRoleOrService(['admin', 'system']), createMaintenanceRoutes());

export default router;


