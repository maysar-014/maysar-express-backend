import { UpdateTicketStatusUseCase } from '../update-ticket-status.use-case';
import { UpdateTicketStatusDto } from '../../dto/ticket.dto';
import { TicketStatus } from '../../../domain/types';

describe('UpdateTicketStatusUseCase', () => {
    let useCase: UpdateTicketStatusUseCase;
    let mockTicketRepo: any;
    let mockHistoryRepo: any;
    let mockEventBus: any;

    const mockTicket = {
        id: 'ticket-1',
        status: TicketStatus.OPEN,
        updateStatus: jest.fn(),
    };

    const validDto: UpdateTicketStatusDto = {
        ticketId: 'ticket-1',
        newStatus: TicketStatus.IN_PROGRESS,
        updatedBy: 'agent-1',
        reason: 'Started working on issue',
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockTicketRepo = {
            findById: jest.fn().mockResolvedValue(mockTicket),
            update: jest.fn(),
        };

        mockHistoryRepo = { create: jest.fn() };
        mockEventBus = { publish: jest.fn() };

        useCase = new UpdateTicketStatusUseCase(mockTicketRepo, mockHistoryRepo, mockEventBus);
    });

    it('should update status successfully', async () => {
        const result = await useCase.execute(validDto);

        expect(result).toBeDefined();
        expect(mockTicket.updateStatus).toHaveBeenCalledWith(TicketStatus.IN_PROGRESS);
        expect(mockTicketRepo.update).toHaveBeenCalled();
    });

    it('should fail when ticket not found', async () => {
        mockTicketRepo.findById.mockResolvedValue(null);

        await expect(useCase.execute(validDto)).rejects.toThrow('Ticket not found');
    });

    it('should record status history', async () => {
        await useCase.execute(validDto);

        expect(mockHistoryRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({
                fromStatus: 'OPEN',
                toStatus: TicketStatus.IN_PROGRESS,
            }),
            'ticket-1'
        );
    });

    it('should publish TicketStatusChanged event', async () => {
        await useCase.execute(validDto);

        expect(mockEventBus.publish).toHaveBeenCalledWith('TicketStatusChanged', expect.any(Object));
    });

    it('should handle status transitions', async () => {
        const transitions = [
            { from: TicketStatus.OPEN, to: TicketStatus.IN_PROGRESS },
            { from: TicketStatus.IN_PROGRESS, to: TicketStatus.RESOLVED },
            { from: TicketStatus.RESOLVED, to: TicketStatus.CLOSED },
        ];

        for (const { to } of transitions) {
            jest.clearAllMocks();
            await useCase.execute({ ...validDto, newStatus: to });
            expect(mockTicket.updateStatus).toHaveBeenCalledWith(to);
        }
    });

    it('should use default reason when not provided', async () => {
        const dtoWithoutReason = { ...validDto, reason: undefined };

        await useCase.execute(dtoWithoutReason);

        expect(mockHistoryRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({ reason: 'Status Updated' }),
            'ticket-1'
        );
    });
});
