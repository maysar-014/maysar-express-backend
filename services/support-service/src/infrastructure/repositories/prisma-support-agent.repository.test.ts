const loggerErrorMock = jest.fn();

jest.mock('../services/logger.service', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: (...args: any[]) => loggerErrorMock(...args),
        debug: jest.fn()
    }
}));

import { SupportAgent } from '../../domain/entities/support-agent.entity';
import { PrismaSupportAgentRepository } from './prisma-support-agent.repository';

const makeAgentRow = (overrides: Record<string, any> = {}) => ({
    id: 'agent-1',
    userId: 'user-agent-1',
    specializations: ['DELIVERY'],
    maxConcurrentTickets: 5,
    currentTicketCount: 1,
    isAvailable: true,
    totalTicketsResolved: 30,
    averageResolutionTime: 18,
    rating: 4.8,
    createdAt: new Date('2026-03-01T10:00:00.000Z'),
    updatedAt: new Date('2026-03-01T10:00:00.000Z'),
    ...overrides
});

describe('PrismaSupportAgentRepository', () => {
    let prisma: any;
    let repository: PrismaSupportAgentRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        prisma = {
            support_SupportAgent: {
                fields: { maxConcurrentTickets: 'maxConcurrentTickets' },
                findUnique: jest.fn(),
                findMany: jest.fn(),
                create: jest.fn(),
                update: jest.fn()
            }
        };
        repository = new PrismaSupportAgentRepository(prisma as any);
    });

    it('findById and findByUserId map to SupportAgent', async () => {
        prisma.support_SupportAgent.findUnique
            .mockResolvedValueOnce(makeAgentRow({ id: 'agent-42' }))
            .mockResolvedValueOnce(makeAgentRow({ id: 'agent-99', userId: 'user-99' }));

        const byId = await repository.findById('agent-42');
        const byUserId = await repository.findByUserId('user-99');

        expect(prisma.support_SupportAgent.findUnique).toHaveBeenNthCalledWith(1, { where: { id: 'agent-42' } });
        expect(prisma.support_SupportAgent.findUnique).toHaveBeenNthCalledWith(2, { where: { userId: 'user-99' } });
        expect(byId).toBeInstanceOf(SupportAgent);
        expect(byUserId).toBeInstanceOf(SupportAgent);
    });

    it('findAvailable filters overloaded agents after fetching available pool', async () => {
        prisma.support_SupportAgent.findMany
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([
                makeAgentRow({ id: 'agent-ok', currentTicketCount: 2, maxConcurrentTickets: 3 }),
                makeAgentRow({ id: 'agent-full', currentTicketCount: 3, maxConcurrentTickets: 3 })
            ]);

        const available = await repository.findAvailable();

        expect(prisma.support_SupportAgent.findMany).toHaveBeenNthCalledWith(1, {
            where: {
                isAvailable: true,
                currentTicketCount: { lt: 'maxConcurrentTickets' }
            }
        });
        expect(prisma.support_SupportAgent.findMany).toHaveBeenNthCalledWith(2, {
            where: { isAvailable: true }
        });
        expect(available).toHaveLength(1);
        expect(available[0].id).toBe('agent-ok');
    });

    it('findBySpecialization/create/update propagate persistence errors with logging', async () => {
        const inputAgent = SupportAgent.create({
            id: 'agent-new',
            userId: 'user-new',
            specializations: ['ACCOUNT'],
            maxConcurrentTickets: 4
        });
        prisma.support_SupportAgent.findMany.mockResolvedValueOnce([makeAgentRow({ id: 'agent-specialist' })]);
        prisma.support_SupportAgent.create.mockResolvedValueOnce(makeAgentRow({ id: 'agent-new', userId: 'user-new' }));
        prisma.support_SupportAgent.update.mockRejectedValueOnce(new Error('write-failed'));

        const specialized = await repository.findBySpecialization('ACCOUNT');
        const created = await repository.create(inputAgent);
        await expect(repository.update(inputAgent)).rejects.toThrow('write-failed');

        expect(prisma.support_SupportAgent.findMany).toHaveBeenCalledWith({
            where: { specializations: { has: 'ACCOUNT' } }
        });
        expect(specialized[0].id).toBe('agent-specialist');
        expect(created.id).toBe('agent-new');
        expect(loggerErrorMock).toHaveBeenCalledWith('Error updating agent: agent-new', expect.any(Object));
    });
});

