import { Ticket } from '../ticket.entity';
import { TicketStatus, TicketPriority } from '../types';

describe('Ticket Entity', () => {
    const createTicket = (props: Partial<any> = {}) => Ticket.create({
        id: 'ticket-1',
        subject: 'Test Issue',
        description: 'Unable to login',
        category: 'technical',
        userId: 'user-1',
        ...props
    });

    describe('create', () => {
        it('should create new ticket with defaults', () => {
            const ticket = createTicket();
            expect(ticket.status).toBe(TicketStatus.OPEN);
            expect(ticket.priority).toBe(TicketPriority.MEDIUM);
            expect(ticket.createdAt).toBeDefined();
        });
    });

    describe('status transitions', () => {
        it('should allow assigning agent', () => {
            const ticket = createTicket();
            ticket.assignAgent('agent-1');
            expect(ticket.status).toBe(TicketStatus.IN_PROGRESS);
            expect(ticket.assignedAgentId).toBe('agent-1');
        });

        it('should allow resolving ticket', () => {
            const ticket = createTicket();
            ticket.assignAgent('agent-1');
            ticket.resolve('Fixed it');

            expect(ticket.status).toBe(TicketStatus.RESOLVED);
            expect(ticket.resolution).toBe('Fixed it');
            expect(ticket.resolvedAt).toBeDefined();
        });

        it('should allow closing ticket', () => {
            const ticket = createTicket();
            ticket.close();
            expect(ticket.status).toBe(TicketStatus.CLOSED);
            expect(ticket.closedAt).toBeDefined();
        });

        it('should allow reopening ticket', () => {
            const ticket = createTicket();
            ticket.close();
            ticket.reopen();

            expect(ticket.status).toBe(TicketStatus.IN_PROGRESS);
            expect(ticket.closedAt).toBeUndefined();
        });

        it('should prevent invalid transitions', () => {
            const ticket = createTicket();
            ticket.close();

            // Cannot go from CLOSED to RESOLVED directly
            expect(() => ticket.resolve('Fixed')).toThrow('Invalid status transition');
        });
    });

    describe('validation', () => {
        it('should validate valid ticket', () => {
            const ticket = createTicket();
            const result = ticket.validate();
            expect(result.isValid).toBe(true);
        });

        it('should catch invalid fields', () => {
            const ticket = Ticket.create({
                id: '1',
                subject: 'Bad',
                description: 'Short',
                category: 'tech',
                userId: 'u1'
            });

            const result = ticket.validate();
            expect(result.isValid).toBe(false);
            expect(result.errors).toHaveLength(2); // Short subject, short description
        });
    });
});
