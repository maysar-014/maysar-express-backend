import { GetTicketUseCase } from '../get-ticket.use-case';

describe('GetTicketUseCase', () => {
    let useCase: GetTicketUseCase;
    let mockTicketRepo: any;
    let mockMessageRepo: any;

    const mockTicket = {
        id: 'ticket-1',
        userId: 'user-1',
        assignedAgentId: 'agent-1',
        subject: 'Login Issue',
        status: 'OPEN',
    };

    const mockMessages = [
        { id: 'msg-1', content: 'Initial message', senderId: 'user-1' },
        { id: 'msg-2', content: 'Response', senderId: 'agent-1' },
    ];

    beforeEach(() => {
        jest.clearAllMocks();

        mockTicketRepo = { findById: jest.fn().mockResolvedValue(mockTicket) };
        mockMessageRepo = { findByTicketId: jest.fn().mockResolvedValue(mockMessages) };

        useCase = new GetTicketUseCase(mockTicketRepo, mockMessageRepo);
    });

    it('should get ticket with messages successfully', async () => {
        const result = await useCase.execute('ticket-1', 'user-1');

        expect(result).toBeDefined();
        expect(mockTicketRepo.findById).toHaveBeenCalledWith('ticket-1');
        expect(mockMessageRepo.findByTicketId).toHaveBeenCalledWith('ticket-1');
    });

    it('should fail when ticket not found', async () => {
        mockTicketRepo.findById.mockResolvedValue(null);

        await expect(useCase.execute('invalid', 'user-1')).rejects.toThrow('Ticket not found');
    });

    it('should retrieve ticket by owner', async () => {
        const result = await useCase.execute('ticket-1', 'user-1');

        expect(result).toBeDefined();
    });

    it('should retrieve ticket by assigned agent', async () => {
        const result = await useCase.execute('ticket-1', 'agent-1');

        expect(result).toBeDefined();
    });

    it('should handle ticket with no messages', async () => {
        mockMessageRepo.findByTicketId.mockResolvedValue([]);

        const result = await useCase.execute('ticket-1', 'user-1');

        expect(result).toBeDefined();
    });

    it('should handle ticket with multiple messages', async () => {
        const manyMessages = Array.from({ length: 10 }, (_, i) => ({
            id: `msg-${i}`,
            content: `Message ${i}`,
        }));
        mockMessageRepo.findByTicketId.mockResolvedValue(manyMessages);

        const result = await useCase.execute('ticket-1', 'user-1');

        expect(result).toBeDefined();
    });

    it('should handle different ticket statuses', async () => {
        const statuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

        for (const status of statuses) {
            jest.clearAllMocks();
            mockTicketRepo.findById.mockResolvedValue({ ...mockTicket, status });

            const result = await useCase.execute('ticket-1', 'user-1');

            expect(result).toBeDefined();
        }
    });
});
