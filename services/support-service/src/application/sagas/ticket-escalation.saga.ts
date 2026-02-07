import { BaseSaga } from './saga-base';
import { logger } from '../../infrastructure/services/logger.service';
import { TicketEscalationPolicy } from '../../domain/policies/ticket-escalation.policy';
import { ITicketRepository } from '../../domain/repositories/interfaces';
import { TYPES } from '../../types';
import { container } from '../../infrastructure/container';
import { TicketStatus } from '../../domain/types';

export class TicketEscalationSaga extends BaseSaga {
    private escalationPolicy: TicketEscalationPolicy;
    private ticketRepository: ITicketRepository;

    constructor(idempotencyKey: string) {
        super(idempotencyKey, {});
        this.escalationPolicy = container.get<TicketEscalationPolicy>(TYPES.TicketEscalationPolicy);
        this.ticketRepository = container.get<ITicketRepository>(TYPES.ITicketRepository);
    }

    public async monitorTickets(): Promise<void> {
        logger.info('Running ticket escalation monitor');

        // In a real system, this would be triggered by a cron job or a periodic event
        // Fetch all active tickets that might need escalation
        const activeTickets = await this.ticketRepository.findByStatuses([
            TicketStatus.OPEN,
            TicketStatus.IN_PROGRESS
        ]);

        for (const ticket of activeTickets) {
            if (this.escalationPolicy.shouldEscalate(ticket)) {
                logger.warn(`Escalating ticket ${ticket.id}`, {
                    reason: this.escalationPolicy.getEscalationReason(ticket),
                    oldPriority: ticket.priority,
                    newPriority: this.escalationPolicy.getEscalationPriority(ticket)
                });

                ticket.priority = this.escalationPolicy.getEscalationPriority(ticket);
                await this.ticketRepository.update(ticket);

                // Notify supervisors, etc.
            }
        }
    }
}
