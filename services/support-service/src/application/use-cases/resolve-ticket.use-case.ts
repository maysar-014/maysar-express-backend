import { injectable, inject } from 'inversify';
import { TYPES } from '../../types';
import { TicketStatus, TicketStatusHistory } from '../../domain/types';
import { getModelPrefix, makeId } from '@shared/ids/id';
import { ITicketRepository, ISupportAgentRepository, ITicketStatusHistoryRepository } from '../../domain/repositories/interfaces';
import { ResolveTicketDto, TicketResponseDto } from '../dto/ticket.dto';
import { TicketMapper } from '../mappers/ticket.mapper';
import { TicketResolvedEvent } from '../../domain/events/ticket-events';

@injectable()
export class ResolveTicketUseCase {
    constructor(
        @inject(TYPES.ITicketRepository) private ticketRepository: ITicketRepository,
        @inject(TYPES.ITicketStatusHistoryRepository) private historyRepository: ITicketStatusHistoryRepository,
        @inject(TYPES.ISupportAgentRepository) private agentRepository: ISupportAgentRepository,
        @inject(TYPES.EventBus) private eventBus: any
    ) { }

    public async execute(dto: ResolveTicketDto): Promise<TicketResponseDto> {
        const ticket = await this.ticketRepository.findById(dto.ticketId);
        if (!ticket) {
            throw new Error(`Ticket not found: ${dto.ticketId}`);
        }

        const agent = await this.agentRepository.findById(dto.agentId);
        if (!agent) {
            throw new Error(`Agent not found: ${dto.agentId}`);
        }

        const fromStatus = ticket.status;
        const startTime = ticket.updatedAt.getTime();
        ticket.resolve(dto.resolution);

        const resolutionTimeMinutes = Math.floor((new Date().getTime() - startTime) / (1000 * 60));
        agent.recordResolution(resolutionTimeMinutes);

        await this.ticketRepository.update(ticket);
        await this.agentRepository.update(agent);

        const history: TicketStatusHistory = {
            id: makeId(getModelPrefix('Support_TicketStatusHistory')),
            fromStatus,
            toStatus: ticket.status,
            changedBy: agent.id,
            reason: dto.resolution,
            createdAt: new Date()
        };
        await this.historyRepository.create(history, ticket.id);

        const event = new TicketResolvedEvent(ticket.id, agent.id, resolutionTimeMinutes, dto.resolution);
        if (this.eventBus.publish) {
            await this.eventBus.publish('TicketResolved', event);
        }

        return TicketMapper.toResponseDto(ticket);
    }
}
