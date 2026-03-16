import { injectable, inject } from 'inversify';
import { TYPES } from '../../types';
import { ITicketRepository, ISupportAgentRepository, ITicketStatusHistoryRepository } from '../../domain/repositories/interfaces';
import { getModelPrefix, makeId } from '@shared/ids/id';
import { TicketStatusHistory } from '../../domain/types';
import { AssignTicketDto, TicketResponseDto } from '../dto/ticket.dto';
import { TicketMapper } from '../mappers/ticket.mapper';
import { TicketAssignedEvent } from '../../domain/events/ticket-events';
import { TicketAssignmentPolicy } from '../../domain/policies/ticket-assignment.policy';

@injectable()
export class AssignTicketUseCase {
    constructor(
        @inject(TYPES.ITicketRepository) private ticketRepository: ITicketRepository,
        @inject(TYPES.ISupportAgentRepository) private agentRepository: ISupportAgentRepository,
        @inject(TYPES.ITicketStatusHistoryRepository) private historyRepository: ITicketStatusHistoryRepository,
        @inject(TYPES.TicketAssignmentPolicy) private assignmentPolicy: TicketAssignmentPolicy,
        @inject(TYPES.EventBus) private eventBus: any
    ) { }

    public async execute(dto: AssignTicketDto): Promise<TicketResponseDto> {
        const ticket = await this.ticketRepository.findById(dto.ticketId);
        if (!ticket) {
            throw new Error(`Ticket not found: ${dto.ticketId}`);
        }

        const agent = await this.agentRepository.findById(dto.agentId);
        if (!agent) {
            throw new Error(`Agent not found: ${dto.agentId}`);
        }

        const validation = this.assignmentPolicy.validateAssignment(ticket, agent);
        if (!validation.isValid) {
            throw new Error(`Assignment failed: ${validation.reason}`);
        }

        const fromStatus = ticket.status;
        ticket.assignAgent(agent.id);
        agent.assignTicket();

        await this.ticketRepository.update(ticket);
        await this.agentRepository.update(agent);

        // Record status history
        const statusHistory: TicketStatusHistory = {
            id: makeId(getModelPrefix('Support_TicketStatusHistory')),
            fromStatus,
            toStatus: ticket.status,
            changedBy: dto.assignedBy,
            reason: 'Agent Assigned',
            createdAt: new Date()
        };
        await this.historyRepository.create(statusHistory, ticket.id);

        const event = new TicketAssignedEvent(ticket.id, agent.id, dto.assignedBy);
        if (this.eventBus.publish) {
            await this.eventBus.publish('TicketAssigned', event);
        }

        return TicketMapper.toResponseDto(ticket);
    }
}
