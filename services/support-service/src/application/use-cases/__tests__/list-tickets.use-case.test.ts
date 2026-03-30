import { ListTicketsUseCase } from '../list-tickets.use-case';
import { ListTicketsDto } from '../../dto/ticket.dto';
import { TicketStatus } from '../../../domain/types';

describe('ListTicketsUseCase', () => {
    let useCase: ListTicketsUseCase;
    let mockTicketRepo: any;

    const mockTickets = [
        { id: 'ticket-1', subject: 'Issue 1', status: TicketStatus.OPEN },
        { id: 'ticket-2', subject: 'Issue 2', status: TicketStatus.IN_PROGRESS },
        { id: 'ticket-3', subject: 'Issue 3', status: TicketStatus.RESOLVED },
    ];

    const validDto: ListTicketsDto = {
        page: 1,
        limit: 10,
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockTicketRepo = {
            search: jest.fn().mockResolvedValue(mockTickets),
            count: jest.fn().mockResolvedValue(3),
        };

        useCase = new ListTicketsUseCase(mockTicketRepo);
    });

    it('should list tickets with pagination', async () => {
        const result = await useCase.execute(validDto);

        expect(result.items).toHaveLength(3);
        expect(result.total).toBe(3);
        expect(result.page).toBe(1);
        expect(result.limit).toBe(10);
    });

    it('should handle empty results', async () => {
        mockTicketRepo.search.mockResolvedValue([]);
        mockTicketRepo.count.mockResolvedValue(0);

        const result = await useCase.execute(validDto);

        expect(result.items).toHaveLength(0);
        expect(result.total).toBe(0);
    });

    it('should filter by status', async () => {
        const dtoWithStatus = { ...validDto, status: TicketStatus.OPEN };

        await useCase.execute(dtoWithStatus);

        expect(mockTicketRepo.search).toHaveBeenCalledWith(dtoWithStatus);
    });

    it('should filter by userId', async () => {
        const dtoWithUser = { ...validDto, userId: 'user-1' };

        await useCase.execute(dtoWithUser);

        expect(mockTicketRepo.search).toHaveBeenCalledWith(dtoWithUser);
    });

    it('should filter by agentId', async () => {
        const dtoWithAgent = { ...validDto, agentId: 'agent-1' };

        await useCase.execute(dtoWithAgent);

        expect(mockTicketRepo.search).toHaveBeenCalledWith(dtoWithAgent);
    });

    it('should handle different page sizes', async () => {
        const pageSizes = [5, 10, 20, 50];

        for (const limit of pageSizes) {
            jest.clearAllMocks();
            const result = await useCase.execute({ ...validDto, limit });

            expect(result.limit).toBe(limit);
        }
    });

    it('should handle pagination', async () => {
        const result = await useCase.execute({ ...validDto, page: 2, limit: 10 });

        expect(result.page).toBe(2);
        expect(mockTicketRepo.search).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
    });

    it('should use default values when not provided', async () => {
        const result = await useCase.execute({});

        expect(result.page).toBe(1);
        expect(result.limit).toBe(10);
    });
});
