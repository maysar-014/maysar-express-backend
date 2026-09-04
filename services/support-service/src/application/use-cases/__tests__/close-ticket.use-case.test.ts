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
        closedAt: undefined as Date | undefined,
        resolution: undefined as string | undefined,
    };

    const validDto: CloseTicketDto = {
        ticketId: 'ticket-1',
        closedBy: 'user-1',
        reason: 'Issue resolved',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockTicket.status = 'RESOLVED';
        mockTicket.closedAt = undefined;
        mockTicket.resolution = undefined;

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

    it('returns the persisted closed ticket after direct close', async () => {
        const persistedTicket = {
            ...mockTicket,
            status: 'CLOSED',
            closedAt: new Date('2026-01-01T00:00:00.000Z')
        };
        mockTicketRepo.update.mockResolvedValueOnce(persistedTicket);

        const result = await useCase.execute(validDto);

        expect(mockTicketRepo.update).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'CLOSED',
                closedAt: expect.any(Date)
            })
        );
        expect(result.status).toBe('CLOSED');
    });

    it('records resolution sent directly to close endpoint', async () => {
        await useCase.execute({
            ...validDto,
            reason: undefined,
            resolution: 'Refund confirmed and customer notified'
        });

        expect(mockTicketRepo.update).toHaveBeenCalledWith(
            expect.objectContaining({
                resolution: 'Refund confirmed and customer notified'
            })
        );
        expect(mockEventBus.publish).toHaveBeenCalledWith('TicketClosed', expect.any(Object));
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
