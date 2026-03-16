import { injectable, inject } from 'inversify';
import { TYPES } from '../../types';
import { ITicketRepository, ITicketStatusHistoryRepository } from '../../domain/repositories/interfaces';
import { getModelPrefix, makeId } from '@shared/ids/id';
import { TicketStatusHistory } from '../../domain/types';
import { UpdateTicketStatusDto, TicketResponseDto } from '../dto/ticket.dto';
import { TicketMapper } from '../mappers/ticket.mapper';
import { TicketStatusChangedEvent } from '../../domain/events/ticket-events';

@injectable()
export class UpdateTicketStatusUseCase {
    constructor(
        @inject(TYPES.ITicketRepository) private ticketRepository: ITicketRepository,
        @inject(TYPES.ITicketStatusHistoryRepository) private historyRepository: ITicketStatusHistoryRepository,
        @inject(TYPES.EventBus) private eventBus: any
    ) { }

    public async execute(dto: UpdateTicketStatusDto): Promise<TicketResponseDto> {
        const ticket = await this.ticketRepository.findById(dto.ticketId);
        if (!ticket) {
            throw new Error(`Ticket not found: ${dto.ticketId}`);
        }

        const fromStatus = ticket.status;
        ticket.updateStatus(dto.newStatus);

        await this.ticketRepository.update(ticket);

        // Record status history
        const statusHistory: TicketStatusHistory = {
            id: makeId(getModelPrefix('Support_TicketStatusHistory')),
            fromStatus,
            toStatus: dto.newStatus,
            changedBy: dto.updatedBy,
            reason: dto.reason || 'Status Updated',
            createdAt: new Date()
        };
        await this.historyRepository.create(statusHistory, ticket.id);

        const event = new TicketStatusChangedEvent(
            ticket.id,
            fromStatus,
            dto.newStatus,
            dto.updatedBy
        );

        if (this.eventBus.publish) {
            await this.eventBus.publish('TicketStatusChanged', event);
        }

        return TicketMapper.toResponseDto(ticket);
    }
}
