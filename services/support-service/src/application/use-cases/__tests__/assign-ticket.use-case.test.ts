import { AssignTicketUseCase } from '../assign-ticket.use-case';
import { AssignTicketDto } from '../../dto/ticket.dto';

describe('AssignTicketUseCase', () => {
    let useCase: AssignTicketUseCase;
    let mockTicketRepo: any;
    let mockAgentRepo: any;
    let mockHistoryRepo: any;
    let mockAssignmentPolicy: any;
    let mockEventBus: any;

    const mockTicket = {
        id: 'ticket-1',
        status: 'OPEN',
        assignAgent: jest.fn(),
    };

    const mockAgent = {
        id: 'agent-1',
        assignTicket: jest.fn(),
    };

    const validDto: AssignTicketDto = {
        ticketId: 'ticket-1',
        agentId: 'agent-1',
        assignedBy: 'admin-1',
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockTicketRepo = {
            findById: jest.fn().mockResolvedValue(mockTicket),
            update: jest.fn(),
        };

        mockAgentRepo = {
            findById: jest.fn().mockResolvedValue(mockAgent),
            update: jest.fn(),
        };

        mockHistoryRepo = { create: jest.fn() };
        mockAssignmentPolicy = {
            validateAssignment: jest.fn().mockReturnValue({ isValid: true }),
        };
        mockEventBus = { publish: jest.fn() };

        useCase = new AssignTicketUseCase(
            mockTicketRepo,
            mockAgentRepo,
            mockHistoryRepo,
            mockAssignmentPolicy,
            mockEventBus
        );
    });

    it('should assign ticket successfully', async () => {
        const result = await useCase.execute(validDto);

        expect(result).toBeDefined();
        expect(mockTicket.assignAgent).toHaveBeenCalledWith('agent-1');
        expect(mockAgent.assignTicket).toHaveBeenCalled();
        expect(mockTicketRepo.update).toHaveBeenCalled();
        expect(mockAgentRepo.update).toHaveBeenCalled();
    });

    it('should fail when ticket not found', async () => {
        mockTicketRepo.findById.mockResolvedValue(null);

        await expect(useCase.execute(validDto)).rejects.toThrow('Ticket not found');
    });

    it('should fail when agent not found', async () => {
        mockAgentRepo.findById.mockResolvedValue(null);

        await expect(useCase.execute(validDto)).rejects.toThrow('Agent not found');
    });

    it('should fail when assignment validation fails', async () => {
        mockAssignmentPolicy.validateAssignment.mockReturnValue({
            isValid: false,
            reason: 'Agent at capacity',
        });

        await expect(useCase.execute(validDto)).rejects.toThrow('Assignment failed');
    });

    it('should record status history', async () => {
        await useCase.execute(validDto);

        expect(mockHistoryRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({
                reason: 'Agent Assigned',
            }),
            'ticket-1'
        );
    });

    it('should publish TicketAssigned event', async () => {
        await useCase.execute(validDto);

        expect(mockEventBus.publish).toHaveBeenCalledWith('TicketAssigned', expect.any(Object));
    });

    it('should handle assignment by different admins', async () => {
        const admins = ['admin-1', 'admin-2', 'supervisor-1'];

        for (const assignedBy of admins) {
            jest.clearAllMocks();
            await useCase.execute({ ...validDto, assignedBy });
            expect(mockTicketRepo.update).toHaveBeenCalled();
        }
    });
});
