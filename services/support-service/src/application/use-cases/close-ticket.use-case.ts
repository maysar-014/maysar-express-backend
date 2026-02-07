import { injectable, inject } from 'inversify';
import { TYPES } from '../../types';
import { ITicketRepository } from '../../domain/repositories/interfaces';
import { CloseTicketDto, TicketResponseDto } from '../dto/ticket.dto';
import { TicketMapper } from '../mappers/ticket.mapper';
import { TicketClosedEvent } from '../../domain/events/ticket-events';

@injectable()
export class CloseTicketUseCase {
    constructor(
        @inject(TYPES.ITicketRepository) private ticketRepository: ITicketRepository,
        @inject(TYPES.EventBus) private eventBus: any
    ) { }

    public async execute(dto: CloseTicketDto): Promise<TicketResponseDto> {
        const ticket = await this.ticketRepository.findById(dto.ticketId);
        if (!ticket) {
            throw new Error(`Ticket not found: ${dto.ticketId}`);
        }

        ticket.close();
        await this.ticketRepository.update(ticket);

        const event = new TicketClosedEvent(ticket.id, dto.closedBy, dto.reason);
        if (this.eventBus.publish) {
            await this.eventBus.publish('TicketClosed', event);
        }

        return TicketMapper.toResponseDto(ticket);
    }
}
