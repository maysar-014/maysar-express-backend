const loggerErrorMock = jest.fn();

jest.mock('../services/logger.service', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: (...args: any[]) => loggerErrorMock(...args),
        debug: jest.fn()
    }
}));

import { Ticket } from '../../domain/entities/ticket.entity';
import { TicketStatus } from '../../domain/types';
import { PrismaTicketRepository } from './prisma-ticket.repository';

const makeTicketRow = (overrides: Record<string, any> = {}) => ({
    id: 'ticket-1',
    subject: 'Need support for delivery issue',
    description: 'Package has not arrived and tracking is stale for two days.',
    status: 'OPEN',
    priority: 'MEDIUM',
    category: 'DELIVERY',
    userId: 'user-1',
    assignedAgentId: null,
    resolution: null,
    createdAt: new Date('2026-03-07T10:00:00.000Z'),
    updatedAt: new Date('2026-03-07T10:00:00.000Z'),
    resolvedAt: null,
    closedAt: null,
    ...overrides
});

describe('PrismaTicketRepository', () => {
    let prisma: any;
    let repository: PrismaTicketRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        prisma = {
            support_Ticket: {
                findUnique: jest.fn(),
                findMany: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
                count: jest.fn()
            }
        };
        repository = new PrismaTicketRepository(prisma as any);
    });

    it('findById maps row to Ticket entity', async () => {
        prisma.support_Ticket.findUnique.mockResolvedValue(makeTicketRow({ id: 'ticket-42' }));

        const result = await repository.findById('ticket-42');

        expect(prisma.support_Ticket.findUnique).toHaveBeenCalledWith({ where: { id: 'ticket-42' } });
        expect(result).toBeInstanceOf(Ticket);
        expect(result?.id).toBe('ticket-42');
    });

    it('findByStatuses, search, and count apply filters and pagination', async () => {
        prisma.support_Ticket.findMany
            .mockResolvedValueOnce([makeTicketRow({ id: 'ticket-a' }), makeTicketRow({ id: 'ticket-b' })])
            .mockResolvedValueOnce([makeTicketRow({ id: 'ticket-c' })]);
        prisma.support_Ticket.count.mockResolvedValue(7);

        const byStatuses = await repository.findByStatuses([TicketStatus.OPEN, TicketStatus.IN_PROGRESS]);
        const searched = await repository.search({
            userId: 'user-1',
            status: 'OPEN',
            priority: 'HIGH',
            category: 'DELIVERY',
            page: 2,
            limit: 5
        });
        const count = await repository.count({ userId: 'user-1', status: 'OPEN' });

        expect(prisma.support_Ticket.findMany).toHaveBeenNthCalledWith(1, {
            where: { status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] } }
        });
        expect(prisma.support_Ticket.findMany).toHaveBeenNthCalledWith(2, {
            where: {
                userId: 'user-1',
                status: 'OPEN',
                priority: 'HIGH',
                category: 'DELIVERY'
            },
            take: 5,
            skip: 5,
            orderBy: { createdAt: 'desc' }
        });
        expect(prisma.support_Ticket.count).toHaveBeenCalledWith({
            where: { userId: 'user-1', status: 'OPEN' }
        });
        expect(byStatuses).toHaveLength(2);
        expect(searched).toHaveLength(1);
        expect(count).toBe(7);
    });

    it('update persists mutable fields and delete rethrows with logging on errors', async () => {
        const ticket = new Ticket({
            id: 'ticket-updated',
            subject: 'Delivery issue',
            description: 'Delivery issue body',
            status: TicketStatus.IN_PROGRESS,
            priority: 'HIGH' as any,
            category: 'DELIVERY',
            userId: 'user-1',
            assignedAgentId: 'agent-1',
            createdAt: new Date('2026-03-07T10:00:00.000Z'),
            updatedAt: new Date('2026-03-07T10:00:00.000Z'),
            resolution: 'Investigating'
        });
        prisma.support_Ticket.update.mockResolvedValue(makeTicketRow({ id: 'ticket-updated' }));
        prisma.support_Ticket.delete.mockRejectedValue(new Error('db-down'));

        const updated = await repository.update(ticket);
        await expect(repository.delete('ticket-updated')).rejects.toThrow('db-down');

        expect(prisma.support_Ticket.update).toHaveBeenCalledWith({
            where: { id: 'ticket-updated' },
            data: expect.objectContaining({
                status: TicketStatus.IN_PROGRESS,
                priority: 'HIGH',
                assignedAgentId: 'agent-1',
                updatedAt: expect.any(Date),
                resolution: 'Investigating'
            })
        });
        expect(updated).toBeInstanceOf(Ticket);
        expect(loggerErrorMock).toHaveBeenCalledWith('Error deleting ticket: ticket-updated', expect.any(Object));
    });
});

