import { Ticket } from '../entities/ticket.entity';
import { TicketPriority, TicketStatus } from '../types';
import { TicketEscalationPolicy } from './ticket-escalation.policy';

const now = new Date('2026-03-08T12:00:00.000Z');

const makeTicket = (overrides: Partial<ConstructorParameters<typeof Ticket>[0]> = {}): Ticket =>
    new Ticket({
        id: 'ticket-1',
        subject: 'Order issue requiring escalation',
        description: 'Order is still not delivered and customer has requested urgent action.',
        status: TicketStatus.OPEN,
        priority: TicketPriority.MEDIUM,
        category: 'DELIVERY',
        userId: 'user-1',
        createdAt: new Date('2026-03-08T08:00:00.000Z'),
        updatedAt: new Date('2026-03-08T08:00:00.000Z'),
        ...overrides
    });

describe('TicketEscalationPolicy', () => {
    const policy = new TicketEscalationPolicy();

    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(now);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('does not escalate resolved or closed tickets', () => {
        const resolved = makeTicket({ status: TicketStatus.RESOLVED, updatedAt: new Date('2026-03-07T00:00:00.000Z') });
        const closed = makeTicket({ status: TicketStatus.CLOSED, updatedAt: new Date('2026-03-07T00:00:00.000Z') });

        expect(policy.shouldEscalate(resolved)).toBe(false);
        expect(policy.shouldEscalate(closed)).toBe(false);
    });

    it('escalates high priority ticket when stale for more than 4 hours', () => {
        const highPriority = makeTicket({
            priority: TicketPriority.HIGH,
            updatedAt: new Date('2026-03-08T07:30:00.000Z')
        });

        expect(policy.shouldEscalate(highPriority)).toBe(true);
    });

    it('escalates unassigned ticket older than one hour', () => {
        const unassigned = makeTicket({
            createdAt: new Date('2026-03-08T09:30:00.000Z'),
            updatedAt: new Date('2026-03-08T11:30:00.000Z'),
            assignedAgentId: undefined
        });

        expect(policy.shouldEscalate(unassigned)).toBe(true);
    });

    it('returns proper escalation priority and reason', () => {
        const urgent = makeTicket({ priority: TicketPriority.URGENT, assignedAgentId: 'agent-1' });
        const low = makeTicket({ priority: TicketPriority.LOW, assignedAgentId: undefined });

        expect(policy.getEscalationPriority(low)).toBe(TicketPriority.MEDIUM);
        expect(policy.getEscalationPriority(urgent)).toBe(TicketPriority.URGENT);
        expect(policy.getEscalationReason(low)).toBe('Ticket remains unassigned for too long');
        expect(policy.getEscalationReason(urgent)).toBe('No update on ticket within the required SLA');
    });
});

