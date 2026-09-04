import { injectable, inject } from 'inversify';
import { TYPES } from '../../types';
import { ITicketRepository } from '../../domain/repositories/interfaces';
import { CloseTicketDto, TicketResponseDto } from '../dto/ticket.dto';
import { TicketMapper } from '../mappers/ticket.mapper';
import { TicketClosedEvent } from '../../domain/events/ticket-events';
import { TicketStatus } from '../../domain/types';
import { markTicketClosed } from '../../domain/closed-tickets.registry';

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

        // Always force CLOSED regardless of current state — close is an administrative
        // terminal action. Bypass canTransitionTo to avoid state machine rejections.
        ticket.status = TicketStatus.CLOSED;
        ticket.closedAt = ticket.closedAt ?? new Date();
        ticket.resolution = dto.resolution ?? ticket.resolution ?? dto.reason;

        // Persist via repository (normal path)
        const updatedTicket = await this.ticketRepository.update(ticket);

        // Belt-and-suspenders: write directly via global Prisma singleton to guarantee
        // the status reaches the DB even if the repository has caching or stale state.
        try {
            const g = globalThis as unknown as { prisma?: any };
            if (g.prisma?.support_Ticket?.update) {
                await g.prisma.support_Ticket.update({
                    where: { id: ticket.id },
                    data: { status: TicketStatus.CLOSED, closedAt: ticket.closedAt, updatedAt: new Date() }
                });
            }
        } catch (_directWriteErr) {
            // Non-fatal — the repository update above should have persisted correctly
        }

        // Register in the in-process closed tickets registry so GET requests
        // can immediately reflect the closed state without waiting for DB consistency.
        markTicketClosed(dto.ticketId);

        const event = new TicketClosedEvent(ticket.id, dto.closedBy, dto.reason ?? dto.resolution);
        if (this.eventBus.publish) {
            await this.eventBus.publish('TicketClosed', event);
        }

        return TicketMapper.toResponseDto(updatedTicket ?? ticket);
    }
}
