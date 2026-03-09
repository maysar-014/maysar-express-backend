const loggerErrorMock = jest.fn();

jest.mock('../services/logger.service', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: (...args: any[]) => loggerErrorMock(...args),
        debug: jest.fn()
    }
}));

import { PrismaTicketAttachmentRepository } from './prisma-ticket-attachment.repository';

describe('PrismaTicketAttachmentRepository', () => {
    let prisma: any;
    let repository: PrismaTicketAttachmentRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        prisma = {
            support_TicketAttachment: {
                create: jest.fn(),
                update: jest.fn(),
                findMany: jest.fn()
            }
        };
        repository = new PrismaTicketAttachmentRepository(prisma as never);
    });

    it('create persists attachment with SYSTEM fallback uploader', async () => {
        prisma.support_TicketAttachment.create.mockResolvedValue({ id: 'att-1' });

        await repository.create(
            {
                id: 'att-1',
                fileName: 'image.png',
                fileUrl: 'https://files/image.png',
                fileSize: 123,
                mimeType: 'image/png'
            },
            'ticket-1'
        );

        expect(prisma.support_TicketAttachment.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                id: 'att-1',
                ticketId: 'ticket-1',
                uploadedBy: 'SYSTEM'
            })
        });
    });

    it('update/find methods pass expected filters and payload', async () => {
        prisma.support_TicketAttachment.update.mockResolvedValue({ id: 'att-2', fileName: 'new.pdf' });
        prisma.support_TicketAttachment.findMany
            .mockResolvedValueOnce([{ id: 'a1' }])
            .mockResolvedValueOnce([{ id: 'a2' }]);

        await repository.update('att-2', { fileName: 'new.pdf' });
        const byTicket = await repository.findByTicketId('ticket-9');
        const byMessage = await repository.findByMessageId('msg-9');

        expect(prisma.support_TicketAttachment.update).toHaveBeenCalledWith({
            where: { id: 'att-2' },
            data: { fileName: 'new.pdf' }
        });
        expect(prisma.support_TicketAttachment.findMany).toHaveBeenNthCalledWith(1, {
            where: { ticketId: 'ticket-9' }
        });
        expect(prisma.support_TicketAttachment.findMany).toHaveBeenNthCalledWith(2, {
            where: { messageId: 'msg-9' }
        });
        expect(byTicket).toEqual([{ id: 'a1' }]);
        expect(byMessage).toEqual([{ id: 'a2' }]);
    });

    it('logs and rethrows errors from persistence layer', async () => {
        prisma.support_TicketAttachment.create.mockRejectedValue(new Error('db-failed'));

        await expect(
            repository.create(
                {
                    id: 'att-error',
                    fileName: 'broken.png',
                    fileUrl: 'x',
                    fileSize: 1,
                    mimeType: 'image/png'
                },
                'ticket-1'
            )
        ).rejects.toThrow('db-failed');

        expect(loggerErrorMock).toHaveBeenCalledWith(
            'Error creating ticket attachment: att-error',
            expect.any(Object)
        );
    });
});

