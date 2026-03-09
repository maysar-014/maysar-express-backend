const loggerErrorMock = jest.fn();

jest.mock('../services/logger.service', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: (...args: any[]) => loggerErrorMock(...args),
        debug: jest.fn()
    }
}));

import { TicketStatus } from '../../domain/types';
import { PrismaTicketStatusHistoryRepository } from './prisma-ticket-status-history.repository';

describe('PrismaTicketStatusHistoryRepository', () => {
    let prisma: any;
    let repository: PrismaTicketStatusHistoryRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        prisma = {
            support_TicketStatusHistory: {
                create: jest.fn(),
                findMany: jest.fn()
            }
        };
        repository = new PrismaTicketStatusHistoryRepository(prisma as never);
    });

    it('create persists status history and maps null reason to undefined', async () => {
        prisma.support_TicketStatusHistory.create.mockResolvedValue({
            id: 'hist-1',
            fromStatus: TicketStatus.OPEN,
            toStatus: TicketStatus.IN_PROGRESS,
            changedBy: 'agent-1',
            reason: null,
            createdAt: new Date('2026-03-09T09:00:00.000Z')
        });

        const history = await repository.create(
            {
                id: 'hist-1',
                fromStatus: TicketStatus.OPEN,
                toStatus: TicketStatus.IN_PROGRESS,
                changedBy: 'agent-1',
                reason: 'picked up',
                createdAt: new Date('2026-03-09T09:00:00.000Z')
            },
            'ticket-1'
        );

        expect(prisma.support_TicketStatusHistory.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                id: 'hist-1',
                ticketId: 'ticket-1',
                fromStatus: TicketStatus.OPEN,
                toStatus: TicketStatus.IN_PROGRESS
            })
        });
        expect(history.reason).toBeUndefined();
    });

    it('findByTicketId applies descending order and maps rows', async () => {
        prisma.support_TicketStatusHistory.findMany.mockResolvedValue([
            {
                id: 'hist-2',
                fromStatus: TicketStatus.IN_PROGRESS,
                toStatus: TicketStatus.RESOLVED,
                changedBy: 'agent-2',
                reason: 'fixed',
                createdAt: new Date('2026-03-09T10:00:00.000Z')
            }
        ]);

        const histories = await repository.findByTicketId('ticket-2');

        expect(prisma.support_TicketStatusHistory.findMany).toHaveBeenCalledWith({
            where: { ticketId: 'ticket-2' },
            orderBy: { createdAt: 'desc' }
        });
        expect(histories[0]).toEqual(
            expect.objectContaining({
                id: 'hist-2',
                reason: 'fixed'
            })
        );
    });

    it('logs and rethrows errors from create/find', async () => {
        prisma.support_TicketStatusHistory.findMany.mockRejectedValue(new Error('status-read-failed'));

        await expect(repository.findByTicketId('ticket-3')).rejects.toThrow('status-read-failed');
        expect(loggerErrorMock).toHaveBeenCalledWith(
            'Error finding status history for ticket: ticket-3',
            expect.any(Object)
        );
    });
});

