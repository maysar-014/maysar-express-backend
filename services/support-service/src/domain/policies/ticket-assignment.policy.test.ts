import { SupportAgent } from '../entities/support-agent.entity';
import { Ticket } from '../entities/ticket.entity';
import { TicketPriority, TicketStatus } from '../types';
import { TicketAssignmentPolicy } from './ticket-assignment.policy';

const makeTicket = (overrides: Partial<ConstructorParameters<typeof Ticket>[0]> = {}): Ticket =>
    new Ticket({
        id: 'ticket-1',
        subject: 'Need support with account access',
        description: 'I cannot access my account after password reset.',
        status: TicketStatus.OPEN,
        priority: TicketPriority.MEDIUM,
        category: 'ACCOUNT',
        userId: 'user-1',
        createdAt: new Date('2026-03-01T10:00:00.000Z'),
        updatedAt: new Date('2026-03-01T10:00:00.000Z'),
        ...overrides
    });

const makeAgent = (overrides: Partial<ConstructorParameters<typeof SupportAgent>[0]> = {}): SupportAgent =>
    new SupportAgent({
        id: 'agent-1',
        userId: 'agent-user-1',
        specializations: ['ACCOUNT'],
        maxConcurrentTickets: 5,
        currentTicketCount: 0,
        isAvailable: true,
        metrics: { totalTicketsResolved: 10, averageResolutionTime: 20, rating: 4.5 },
        createdAt: new Date('2026-03-01T10:00:00.000Z'),
        updatedAt: new Date('2026-03-01T10:00:00.000Z'),
        ...overrides
    });

describe('TicketAssignmentPolicy', () => {
    const policy = new TicketAssignmentPolicy();

    it('denies assignment when ticket is closed', () => {
        const ticket = makeTicket({ status: TicketStatus.CLOSED });
        const agent = makeAgent();

        expect(policy.canAssignToAgent(ticket, agent)).toBe(false);
    });

    it('returns null when no agents can accept ticket', () => {
        const ticket = makeTicket();
        const unavailableAgent = makeAgent({ id: 'agent-2', isAvailable: false });
        const fullAgent = makeAgent({ id: 'agent-3', currentTicketCount: 5 });

        expect(policy.findBestAgent(ticket, [unavailableAgent, fullAgent])).toBeNull();
    });

    it('prioritizes specialized agent with lowest workload', () => {
        const ticket = makeTicket({ category: 'PAYMENT' });
        const generalAgent = makeAgent({ id: 'agent-2', specializations: ['GENERAL'], currentTicketCount: 0 });
        const specializedBusy = makeAgent({ id: 'agent-3', specializations: ['PAYMENT'], currentTicketCount: 3 });
        const specializedFree = makeAgent({ id: 'agent-4', specializations: ['PAYMENT'], currentTicketCount: 1 });

        const selected = policy.findBestAgent(ticket, [generalAgent, specializedBusy, specializedFree]);

        expect(selected?.id).toBe('agent-4');
    });

    it('returns reason when assignment is invalid', () => {
        const ticket = makeTicket();
        const fullAgent = makeAgent({ currentTicketCount: 5, maxConcurrentTickets: 5 });

        expect(policy.validateAssignment(ticket, fullAgent)).toEqual({
            isValid: false,
            reason: 'Agent has reached maximum ticket capacity'
        });
    });
});

