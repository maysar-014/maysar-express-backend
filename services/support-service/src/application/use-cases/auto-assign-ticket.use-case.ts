import { injectable, inject } from 'inversify';
import { TYPES } from '../../types';
import { ITicketRepository, ISupportAgentRepository } from '../../domain/repositories/interfaces';
import { TicketResponseDto } from '../dto/ticket.dto';
import { TicketMapper } from '../mappers/ticket.mapper';
import { TicketAssignedEvent } from '../../domain/events/ticket-events';
import { TicketAssignmentPolicy } from '../../domain/policies/ticket-assignment.policy';

@injectable()
export class AutoAssignTicketUseCase {
    constructor(
        @inject(TYPES.ITicketRepository) private ticketRepository: ITicketRepository,
        @inject(TYPES.ISupportAgentRepository) private agentRepository: ISupportAgentRepository,
        @inject(TYPES.TicketAssignmentPolicy) private assignmentPolicy: TicketAssignmentPolicy,
        @inject(TYPES.EventBus) private eventBus: any
    ) { }

    public async execute(ticketId: string): Promise<TicketResponseDto | null> {
        const ticket = await this.ticketRepository.findById(ticketId);
        if (!ticket || ticket.isAssigned() || ticket.isClosed()) {
            return null;
        }

        const availableAgents = await this.agentRepository.findAvailable();
        const bestAgent = this.assignmentPolicy.findBestAgent(ticket, availableAgents);

        if (!bestAgent) {
            return null;
        }

        ticket.assignAgent(bestAgent.id);
        bestAgent.assignTicket();

        await this.ticketRepository.update(ticket);
        await this.agentRepository.update(bestAgent);

        const event = new TicketAssignedEvent(ticket.id, bestAgent.id, 'SYSTEM');
        if (this.eventBus.publish) {
            await this.eventBus.publish('TicketAssigned', event);
        }

        return TicketMapper.toResponseDto(ticket);
    }
}
