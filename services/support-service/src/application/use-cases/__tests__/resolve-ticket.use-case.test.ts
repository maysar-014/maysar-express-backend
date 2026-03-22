import { ResolveTicketUseCase } from '../resolve-ticket.use-case';
import { ResolveTicketDto } from '../../dto/ticket.dto';

describe('ResolveTicketUseCase', () => {
    let useCase: ResolveTicketUseCase;
    let mockTicketRepo: any;
    let mockHistoryRepo: any;
    let mockAgentRepo: any;
    let mockEventBus: any;

    const mockTicket = {
        id: 'ticket-1',
        status: 'IN_PROGRESS',
        updatedAt: new Date(),
        resolve: jest.fn(),
    };

    const mockAgent = {
        id: 'agent-1',
        recordResolution: jest.fn(),
    };

    const validDto: ResolveTicketDto = {
        ticketId: 'ticket-1',
        agentId: 'agent-1',
        resolution: 'Issue fixed by resetting password',
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockTicketRepo = {
            findById: jest.fn().mockResolvedValue(mockTicket),
            update: jest.fn(),
        };

        mockAgentRepo = {
            findById: jest.fn().mockResolvedValue(mockAgent),
            findByUserId: jest.fn().mockResolvedValue(null),
            update: jest.fn(),
        };

        mockHistoryRepo = { create: jest.fn() };
        mockEventBus = { publish: jest.fn() };

        useCase = new ResolveTicketUseCase(
            mockTicketRepo,
            mockHistoryRepo,
            mockAgentRepo,
            mockEventBus
        );
    });

    it('should resolve ticket successfully', async () => {
        const result = await useCase.execute(validDto);

        expect(result).toBeDefined();
        expect(mockTicket.resolve).toHaveBeenCalledWith('Issue fixed by resetting password');
        expect(mockTicketRepo.update).toHaveBeenCalled();
        expect(mockAgentRepo.update).toHaveBeenCalled();
    });

    it('should fail when ticket not found', async () => {
        mockTicketRepo.findById.mockResolvedValue(null);

        await expect(useCase.execute(validDto)).rejects.toThrow('Ticket not found');
    });

    it('should fail when agent not found', async () => {
        mockAgentRepo.findById.mockResolvedValue(null);
        mockAgentRepo.findByUserId.mockResolvedValue(null);

        await expect(useCase.execute(validDto)).rejects.toThrow('Agent not found');
    });

    it('falls back to agent lookup by user ID', async () => {
        mockAgentRepo.findById.mockResolvedValue(null);
        mockAgentRepo.findByUserId.mockResolvedValue(mockAgent);

        await expect(useCase.execute({ ...validDto, agentId: 'user-1' })).resolves.toBeDefined();
        expect(mockAgentRepo.findByUserId).toHaveBeenCalledWith('user-1');
    });

    it('should record resolution time', async () => {
        await useCase.execute(validDto);

        expect(mockAgent.recordResolution).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should record status history', async () => {
        await useCase.execute(validDto);

        expect(mockHistoryRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({
                reason: 'Issue fixed by resetting password',
            }),
            'ticket-1'
        );
    });

    it('should publish TicketResolved event', async () => {
        await useCase.execute(validDto);

        expect(mockEventBus.publish).toHaveBeenCalledWith('TicketResolved', expect.any(Object));
    });

    it('should handle different resolution messages', async () => {
        const resolutions = [
            'Password reset completed',
            'Account unlocked',
            'Bug fixed in production',
        ];

        for (const resolution of resolutions) {
            jest.clearAllMocks();
            await useCase.execute({ ...validDto, resolution });
            expect(mockTicket.resolve).toHaveBeenCalledWith(resolution);
        }
    });
});
