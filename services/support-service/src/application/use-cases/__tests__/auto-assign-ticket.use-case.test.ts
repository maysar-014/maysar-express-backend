import { AutoAssignTicketUseCase } from '../auto-assign-ticket.use-case';

describe('AutoAssignTicketUseCase', () => {
    let useCase: AutoAssignTicketUseCase;
    let mockTicketRepo: any;
    let mockAgentRepo: any;
    let mockAssignmentPolicy: any;
    let mockEventBus: any;

    const mockTicket = {
        id: 'ticket-1',
        status: 'OPEN',
        isAssigned: jest.fn().mockReturnValue(false),
        isClosed: jest.fn().mockReturnValue(false),
        assignAgent: jest.fn(),
    };

    const mockAgent = {
        id: 'agent-1',
        assignTicket: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockTicketRepo = {
            findById: jest.fn().mockResolvedValue(mockTicket),
            update: jest.fn(),
        };

        mockAgentRepo = {
            findAvailable: jest.fn().mockResolvedValue([mockAgent]),
            update: jest.fn(),
        };

        mockAssignmentPolicy = {
            findBestAgent: jest.fn().mockReturnValue(mockAgent),
        };

        mockEventBus = { publish: jest.fn() };

        useCase = new AutoAssignTicketUseCase(
            mockTicketRepo,
            mockAgentRepo,
            mockAssignmentPolicy,
            mockEventBus
        );
    });

    it('should auto-assign ticket successfully', async () => {
        const result = await useCase.execute('ticket-1');

        expect(result).toBeDefined();
        expect(mockTicket.assignAgent).toHaveBeenCalledWith('agent-1');
        expect(mockAgent.assignTicket).toHaveBeenCalled();
        expect(mockTicketRepo.update).toHaveBeenCalled();
    });

    it('should return null when ticket not found', async () => {
        mockTicketRepo.findById.mockResolvedValue(null);

        const result = await useCase.execute('invalid');

        expect(result).toBeNull();
    });

    it('should return null when ticket already assigned', async () => {
        mockTicket.isAssigned.mockReturnValue(true);

        const result = await useCase.execute('ticket-1');

        expect(result).toBeNull();
    });

    it('should return null when ticket is closed', async () => {
        mockTicket.isClosed.mockReturnValue(true);

        const result = await useCase.execute('ticket-1');

        expect(result).toBeNull();
    });

    it('should return null when no agents available', async () => {
        mockAgentRepo.findAvailable.mockResolvedValue([]);
        mockAssignmentPolicy.findBestAgent.mockReturnValue(null);

        const result = await useCase.execute('ticket-1');

        expect(result).toBeNull();
    });

    it('should publish TicketAssigned event with SYSTEM as assigner', async () => {
        await useCase.execute('ticket-1');

        expect(mockEventBus.publish).toHaveBeenCalledWith(
            'TicketAssigned',
            expect.objectContaining({ assignedBy: 'SYSTEM' })
        );
    });

    it('should use assignment policy to find best agent', async () => {
        await useCase.execute('ticket-1');

        expect(mockAssignmentPolicy.findBestAgent).toHaveBeenCalledWith(mockTicket, [mockAgent]);
    });
});
