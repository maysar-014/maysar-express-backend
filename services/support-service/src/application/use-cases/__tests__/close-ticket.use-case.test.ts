import { CloseTicketUseCase } from '../close-ticket.use-case';
import { CloseTicketDto } from '../../dto/ticket.dto';

describe('CloseTicketUseCase', () => {
    let useCase: CloseTicketUseCase;
    let mockTicketRepo: any;
    let mockEventBus: any;

    const mockTicket = {
        id: 'ticket-1',
        status: 'RESOLVED',
        close: jest.fn(),
    };

    const validDto: CloseTicketDto = {
        ticketId: 'ticket-1',
        closedBy: 'user-1',
        reason: 'Issue resolved',
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockTicketRepo = {
            findById: jest.fn().mockResolvedValue(mockTicket),
            update: jest.fn(),
        };

        mockEventBus = { publish: jest.fn() };

        useCase = new CloseTicketUseCase(mockTicketRepo, mockEventBus);
    });

    it('should close ticket successfully', async () => {
        const result = await useCase.execute(validDto);

        expect(result).toBeDefined();
        expect(mockTicket.close).toHaveBeenCalled();
        expect(mockTicketRepo.update).toHaveBeenCalled();
    });

    it('should fail when ticket not found', async () => {
        mockTicketRepo.findById.mockResolvedValue(null);

        await expect(useCase.execute(validDto)).rejects.toThrow('Ticket not found');
    });

    it('should publish TicketClosed event', async () => {
        await useCase.execute(validDto);

        expect(mockEventBus.publish).toHaveBeenCalledWith('TicketClosed', expect.any(Object));
    });

    it('should handle different close reasons', async () => {
        const reasons = ['Resolved', 'Duplicate', 'Cannot reproduce', 'User request'];

        for (const reason of reasons) {
            jest.clearAllMocks();
            await useCase.execute({ ...validDto, reason });
            expect(mockTicketRepo.update).toHaveBeenCalled();
        }
    });

    it('should handle closure by different users', async () => {
        const users = ['user-1', 'agent-1', 'admin-1'];

        for (const closedBy of users) {
            jest.clearAllMocks();
            await useCase.execute({ ...validDto, closedBy });
            expect(mockTicketRepo.update).toHaveBeenCalled();
        }
    });
});
