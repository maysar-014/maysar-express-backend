const loggerErrorMock = jest.fn();

jest.mock('../services/logger.service', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: (...args: any[]) => loggerErrorMock(...args),
        debug: jest.fn()
    }
}));

import { SenderType } from '../../domain/types';
import { TicketMessage } from '../../domain/entities/ticket-message.entity';
import { PrismaTicketMessageRepository } from './prisma-ticket-message.repository';

const makeMessageRow = (overrides: Record<string, any> = {}) => ({
    id: 'message-1',
    ticketId: 'ticket-1',
    senderId: 'user-1',
    senderType: 'USER',
    content: 'Please update me on this issue.',
    isInternal: false,
    createdAt: new Date('2026-03-07T11:00:00.000Z'),
    ...overrides
});

describe('PrismaTicketMessageRepository', () => {
    let prisma: any;
    let repository: PrismaTicketMessageRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        prisma = {
            support_TicketMessage: {
                findUnique: jest.fn(),
                findMany: jest.fn(),
                create: jest.fn(),
                count: jest.fn()
            }
        };
        repository = new PrismaTicketMessageRepository(prisma as any);
    });

    it('findById and findByTicketId map persistence rows to TicketMessage entities', async () => {
        prisma.support_TicketMessage.findUnique.mockResolvedValue(makeMessageRow({ id: 'message-9' }));
        prisma.support_TicketMessage.findMany.mockResolvedValue([
            makeMessageRow({ id: 'message-a' }),
            makeMessageRow({ id: 'message-b' })
        ]);

        const byId = await repository.findById('message-9');
        const byTicket = await repository.findByTicketId('ticket-1');

        expect(prisma.support_TicketMessage.findMany).toHaveBeenCalledWith({
            where: { ticketId: 'ticket-1' },
            orderBy: { createdAt: 'asc' }
        });
        expect(byId).toBeInstanceOf(TicketMessage);
        expect(byTicket.map(m => m.id)).toEqual(['message-a', 'message-b']);
    });

    it('create persists message fields and returns mapped entity', async () => {
        const message = new TicketMessage({
            id: 'message-new',
            ticketId: 'ticket-8',
            senderId: 'agent-1',
            senderType: SenderType.AGENT,
            content: 'We are investigating the issue now.',
            isInternal: true,
            createdAt: new Date('2026-03-07T12:00:00.000Z')
        });
        prisma.support_TicketMessage.create.mockResolvedValue(makeMessageRow({
            id: 'message-new',
            ticketId: 'ticket-8',
            senderId: 'agent-1',
            senderType: 'AGENT',
            isInternal: true
        }));

        const created = await repository.create(message);

        expect(prisma.support_TicketMessage.create).toHaveBeenCalledWith({
            data: {
                id: 'message-new',
                ticketId: 'ticket-8',
                senderId: 'agent-1',
                senderType: SenderType.AGENT,
                content: 'We are investigating the issue now.',
                isInternal: true,
                createdAt: message.createdAt
            }
        });
        expect(created.id).toBe('message-new');
        expect(created.senderType).toBe(SenderType.AGENT);
    });

    it('count returns total and logs/rethrows on repository errors', async () => {
        prisma.support_TicketMessage.count.mockResolvedValueOnce(4).mockRejectedValueOnce(new Error('count-failed'));

        const total = await repository.count('ticket-7');
        await expect(repository.count('ticket-7')).rejects.toThrow('count-failed');

        expect(total).toBe(4);
        expect(loggerErrorMock).toHaveBeenCalledWith('Error counting messages for ticket: ticket-7', expect.any(Object));
    });
});

