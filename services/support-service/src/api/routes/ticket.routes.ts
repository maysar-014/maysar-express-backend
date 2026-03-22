import { Router } from 'express';
import { container } from '../../infrastructure/container';
import { TicketController } from '../controllers/ticket.controller';
import { TYPES } from '../../types';
import { validate, validateQuery } from '../middleware/validate.middleware';
import * as schemas from '../validators/ticket.validator';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
const controller = container.get<TicketController>(TYPES.TicketController);

// Ticket Lifecycle
router.post('/', authenticate, validate(schemas.createTicketSchema), controller.createTicket.bind(controller));
router.get('/', authenticate, validateQuery(schemas.listTicketsSchema), controller.listTickets.bind(controller));
router.get('/:id', authenticate, controller.getTicket.bind(controller));

// Assignment & Resolution
router.post('/:id/assign', authenticate, authorize(['agent', 'admin']), validate(schemas.assignTicketSchema), controller.assignTicket.bind(controller));
router.post('/:id/resolve', authenticate, authorize(['agent', 'admin']), validate(schemas.resolveTicketSchema), controller.resolveTicket.bind(controller));
router.post('/:id/close', authenticate, validate(schemas.closeTicketSchema), controller.closeTicket.bind(controller));

// Messaging
router.post('/:id/messages', authenticate, validate(schemas.addMessageSchema), controller.addMessage.bind(controller));

export { router as ticketRouter };
