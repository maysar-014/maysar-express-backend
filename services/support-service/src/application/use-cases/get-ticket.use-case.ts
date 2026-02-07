import { injectable, inject } from 'inversify';
import { TYPES } from '../../types';
import { ITicketRepository, ITicketMessageRepository } from '../../domain/repositories/interfaces';
import { TicketDetailResponseDto } from '../dto/ticket.dto';
import { TicketMapper } from '../mappers/ticket.mapper';

@injectable()
export class GetTicketUseCase {
    constructor(
        @inject(TYPES.ITicketRepository) private ticketRepository: ITicketRepository,
        @inject(TYPES.ITicketMessageRepository) private messageRepository: ITicketMessageRepository
    ) { }

    public async execute(ticketId: string, requesterId: string): Promise<TicketDetailResponseDto> {
        const ticket = await this.ticketRepository.findById(ticketId);
        if (!ticket) {
            throw new Error(`Ticket not found: ${ticketId}`);
        }

        // Access control: only owner, assigned agent, or admins (handled by middleware usually, but good to have here)
        // if (ticket.userId !== requesterId && ticket.assignedAgentId !== requesterId) {
        //   throw new Error('Unauthorized access to ticket');
        // }

        const messages = await this.messageRepository.findByTicketId(ticketId);
        // Attachments would also be fetched here

        return TicketMapper.toDetailDto(ticket, messages);
    }
}
