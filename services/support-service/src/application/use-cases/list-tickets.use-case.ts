import { injectable, inject } from 'inversify';
import { TYPES } from '../../types';
import { ITicketRepository } from '../../domain/repositories/interfaces';
import { ListTicketsDto, PaginatedTicketListDto } from '../dto/ticket.dto';
import { TicketMapper } from '../mappers/ticket.mapper';

@injectable()
export class ListTicketsUseCase {
    constructor(
        @inject(TYPES.ITicketRepository) private ticketRepository: ITicketRepository
    ) { }

    public async execute(dto: ListTicketsDto): Promise<PaginatedTicketListDto> {
        const tickets = await this.ticketRepository.search(dto);
        const total = await this.ticketRepository.count(dto);

        return {
            items: tickets.map(t => TicketMapper.toResponseDto(t)),
            total,
            page: dto.page || 1,
            limit: dto.limit || 10
        };
    }
}
