import { SupportAgent } from '../support-agent.entity';

describe('SupportAgent Entity', () => {
    const createAgent = (props: Partial<Record<string, unknown>> = {}) => SupportAgent.create({
        id: 'agent-1',
        userId: 'user-1',
        specializations: ['tech'],
        maxConcurrentTickets: 3,
        ...props
    });

    it('should create valid agent', () => {
        const agent = createAgent();
        expect(agent.id).toBe('agent-1');
        expect(agent.isAvailable).toBe(true);
        expect(agent.currentTicketCount).toBe(0);
        expect(agent.metrics.totalTicketsResolved).toBe(0);
    });

    describe('ticket assignment', () => {
        it('should assign ticket if available', () => {
            const agent = createAgent();
            agent.assignTicket();
            expect(agent.currentTicketCount).toBe(1);
        });

        it('should throw if max capacity reached', () => {
            const agent = createAgent({ maxConcurrentTickets: 1 });
            agent.assignTicket();
            expect(() => agent.assignTicket()).toThrow('Agent cannot accept more tickets');
        });

        it('should throw if unavailable', () => {
            const agent = createAgent();
            agent.updateAvailability(false);
            expect(() => agent.assignTicket()).toThrow('unavailable');
        });
    });

    describe('ticket resolution', () => {
        it('should record resolution and unassign', () => {
            const agent = createAgent();
            agent.assignTicket(); // 1 ticket

            agent.recordResolution(30); // 30 mins
            expect(agent.currentTicketCount).toBe(0);
            expect(agent.metrics.totalTicketsResolved).toBe(1);
            expect(agent.metrics.averageResolutionTime).toBe(30);
        });

        it('should calculate rolling average', () => {
            const agent = createAgent();
            // First ticket: 30 mins
            agent.currentTicketCount = 1;
            agent.recordResolution(30);

            // Second ticket: 60 mins. Avg should be (30+60)/2 = 45
            agent.currentTicketCount = 1;
            agent.recordResolution(60);

            expect(agent.metrics.averageResolutionTime).toBe(45);
        });
    });

    describe('validation', () => {
        it('should validate userId', () => {
            const agent = SupportAgent.create({
                id: '1',
                userId: '',
            });
            const result = agent.validate();
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('User ID is required');
        });
    });
});
