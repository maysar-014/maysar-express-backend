import { Router } from 'express';
import { container } from '../../infrastructure/container';
import { DisputeController } from '../controllers/dispute.controller';
import { TYPES } from '../../types';
import { validate, validateQuery } from '../middleware/validate.middleware';
import * as schemas from '../validators/dispute.validator';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
const controller = container.get<DisputeController>(TYPES.DisputeController);

router.post('/', authenticate, validate(schemas.createDisputeSchema), controller.createDispute.bind(controller));
router.get('/', authenticate, validateQuery(schemas.listDisputesSchema), controller.listDisputes.bind(controller));
router.get('/:id', authenticate, controller.getDispute.bind(controller));
router.post('/:id/escalate', authenticate, authorize(['seller', 'admin', 'agent']), validate(schemas.escalateDisputeSchema), controller.escalateDispute.bind(controller));
router.post('/:id/evidence', authenticate, validate(schemas.addDisputeEvidenceSchema), controller.addEvidence.bind(controller));

export { router as disputeRouter };
