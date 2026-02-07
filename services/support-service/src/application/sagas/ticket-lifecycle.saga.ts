import { BaseSaga, SagaStep } from './saga-base';
import { TicketCreatedEvent, TicketAssignedEvent, TicketResolvedEvent, TicketClosedEvent } from '../../domain/events/ticket-events';
import { logger } from '../../infrastructure/services/logger.service';
import { AutoAssignTicketUseCase } from '../use-cases/auto-assign-ticket.use-case';
import { container } from '../../infrastructure/container';
import { TYPES } from '../../types';

export interface TicketLifecycleContext {
    ticketId: string;
    autoAssignedId?: string;
    notifiedAgents: boolean;
}

export class TicketLifecycleSaga extends BaseSaga<TicketLifecycleContext> {
    constructor(idempotencyKey: string, context: TicketLifecycleContext) {
        super(idempotencyKey, context);
    }

    public async handleTicketCreated(event: TicketCreatedEvent): Promise<void> {
        logger.info(`Handling TicketCreatedEvent for ticket ${event.ticketId}`);

        // Step 1: Auto-assign if possible
        this.addStep({
            name: 'AutoAssign',
            execute: async (ctx) => {
                const autoAssignUC = container.get<AutoAssignTicketUseCase>(TYPES.AutoAssignTicketUseCase);
                const result = await autoAssignUC.execute(ctx.ticketId);
                if (result) {
                    ctx.autoAssignedId = result.assignedAgentId;
                    logger.info(`Ticket ${ctx.ticketId} auto-assigned to ${result.assignedAgentId}`);
                }
            },
            compensate: async (ctx) => {
                // Rollback assignment if necessary
            }
        });

        // Step 2: Notify agents if not assigned
        this.addStep({
            name: 'NotifyAgents',
            execute: async (ctx) => {
                if (!ctx.autoAssignedId) {
                    logger.info(`Notifying agents about new ticket ${ctx.ticketId}`);
                    ctx.notifiedAgents = true;
                }
            },
            compensate: async (ctx) => {
                ctx.notifiedAgents = false;
            }
        });

        await this.execute();
    }

    public async handleTicketAssigned(event: TicketAssignedEvent): Promise<void> {
        logger.info(`Ticket ${event.ticketId} assigned to ${event.agentId}`);
        // Logic for notifying agent
    }

    public async handleTicketResolved(event: TicketResolvedEvent): Promise<void> {
        logger.info(`Ticket ${event.ticketId} resolved by ${event.agentId}`);
        // Logic for notifying user and scheduling auto-close
    }
}
