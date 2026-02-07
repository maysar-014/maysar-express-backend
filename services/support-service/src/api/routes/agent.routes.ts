import { Router } from 'express';
import { container } from '../../infrastructure/container';
import { AgentController } from '../controllers/agent.controller';
import { TYPES } from '../../types';
import { validate } from '../middleware/validate.middleware';
import * as schemas from '../validators/agent.validator';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
const controller = container.get<AgentController>(TYPES.AgentController);

router.post('/', authenticate, authorize(['admin']), validate(schemas.createAgentSchema), controller.createAgent.bind(controller));
router.put('/:id', authenticate, authorize(['admin']), validate(schemas.updateAgentSchema), controller.updateAgent.bind(controller));

export { router as agentRouter };
