import { DistributedSagaOrchestrator, SagaStep } from '@shared/saga/saga.orchestrator';
import { sagaLogRepository } from '../../infrastructure/repositories/saga.repository';
import { TicketCreatedEvent, TicketAssignedEvent, TicketResolvedEvent } from '../../domain/events/ticket-events';
import { logger } from '../../infrastructure/services/logger.service';
import { AutoAssignTicketUseCase } from '../use-cases/auto-assign-ticket.use-case';
import { container } from '../../infrastructure/container';
import { TYPES } from '../../types';

export interface TicketLifecycleContext {
    ticketId: string;
    autoAssignedId?: string;
    notifiedAgents: boolean;
    metadata?: { correlationId: string };
}

export class TicketLifecycleSaga extends DistributedSagaOrchestrator<TicketLifecycleContext> {
    protected sagaType = 'TicketLifecycleSaga';

    constructor() {
        super(sagaLogRepository, 'support-service');
    }

    protected async onStart(sagaId: string, payload: TicketLifecycleContext, correlationId?: string): Promise<void> {
        logger.info(`Starting TicketLifecycleSaga for ticket ${payload.ticketId}`, { sagaId, correlationId });
    }

    protected async onCompensate(sagaId: string, failedStepName: string): Promise<void> {
        logger.info(`Compensating TicketLifecycleSaga failed at ${failedStepName}`, { sagaId });
    }

    protected defineSteps(): SagaStep<TicketLifecycleContext>[] {
        return [
            {
                name: 'AutoAssign',
                execute: async (ctx, sagaId) => {
                    const autoAssignUC = container.get<AutoAssignTicketUseCase>(TYPES.AutoAssignTicketUseCase);
                    const result = await autoAssignUC.execute(ctx.ticketId);
                    if (result) {
                        ctx.autoAssignedId = result.assignedAgentId;
                        logger.info(`Ticket ${ctx.ticketId} auto-assigned to ${result.assignedAgentId}`);
                    }
                },
                compensate: async (ctx, sagaId) => {
                    // Rollback assignment if necessary
                }
            },
            {
                name: 'NotifyAgents',
                execute: async (ctx, sagaId) => {
                    if (!ctx.autoAssignedId) {
                        logger.info(`Notifying agents about new ticket ${ctx.ticketId}`);
                        ctx.notifiedAgents = true;
                    }
                },
                compensate: async (ctx, sagaId) => {
                    ctx.notifiedAgents = false;
                }
            }
        ];
    }

    // Public entry point to start the saga from the handler
    public async handleTicketCreated(event: TicketCreatedEvent, correlationId: string): Promise<void> {
        const context: TicketLifecycleContext = {
            ticketId: event.ticketId,
            notifiedAgents: false,
            metadata: { correlationId }
        };
        await this.start(context, correlationId);
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
