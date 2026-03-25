import { Request, Response } from 'express';
import { DisputeController } from '../dispute.controller';
import { TicketPriority, TicketStatus, SenderType } from '../../../domain/types';

const createResponse = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
};

describe('DisputeController', () => {
    const createTicketUC = { execute: jest.fn() };
    const listTicketsUC = { execute: jest.fn() };
    const ticketRepository = { findById: jest.fn(), update: jest.fn() };
    const messageRepository = { findByTicketId: jest.fn(), create: jest.fn() };
    const attachmentRepository = { findByTicketId: jest.fn(), create: jest.fn() };

    let controller: DisputeController;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new DisputeController(
            createTicketUC as never,
            listTicketsUC as never,
            ticketRepository as never,
            messageRepository as never,
            attachmentRepository as never
        );
    });

    it('creates an explicit dispute ticket with order context', async () => {
        const req = {
            body: {
                orderId: 'ord_01ARZ3NDEKTSV4RRFFQ69G5FAV',
                reason: 'Wrong item delivered',
                description: 'The shipment does not match the order contents.',
                attachments: []
            },
            user: { userId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV', roles: ['seller'] }
        } as unknown as Request;
        const res = createResponse();

        createTicketUC.execute.mockResolvedValue({
            id: 'sup_tik_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            userId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            subject: 'Order dispute for ord_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            description: 'stored',
            status: TicketStatus.OPEN,
            priority: TicketPriority.MEDIUM,
            category: 'order_dispute',
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await controller.createDispute(req, res);

        expect(createTicketUC.execute).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            category: 'order_dispute',
            subject: 'Order dispute for ord_01ARZ3NDEKTSV4RRFFQ69G5FAV'
        }));
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('lists dispute tickets with extracted order metadata', async () => {
        const req = {
            query: {},
            user: { userId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV', roles: ['seller'] }
        } as unknown as Request;
        const res = createResponse();

        listTicketsUC.execute.mockResolvedValue({
            items: [
                {
                    id: 'sup_tik_1',
                    userId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
                    subject: 'Order dispute for ord_01ARZ3NDEKTSV4RRFFQ69G5FAV',
                    description: 'Order ID: ord_01ARZ3NDEKTSV4RRFFQ69G5FAV\nReason: Wrong item delivered\n\nThe shipment does not match the order contents.',
                    status: TicketStatus.OPEN,
                    priority: TicketPriority.HIGH,
                    category: 'order_dispute',
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ],
            total: 1,
            page: 1,
            limit: 10
        });

        await controller.listDisputes(req, res);

        expect(listTicketsUC.execute).toHaveBeenCalledWith(expect.objectContaining({
            category: 'order_dispute',
            userId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV'
        }));
        expect(res.status).toHaveBeenCalledWith(200);
        expect((res.json as jest.Mock).mock.calls[0][0].data.items[0]).toEqual(expect.objectContaining({
            orderId: 'ord_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            reason: 'Wrong item delivered',
            description: 'The shipment does not match the order contents.'
        }));
    });

    it('escalates an open dispute and records the escalation note', async () => {
        const req = {
            params: { id: 'sup_tik_1' },
            body: { reason: 'Requires admin review' },
            user: { userId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV', roles: ['seller'] }
        } as unknown as Request;
        const res = createResponse();

        ticketRepository.findById.mockResolvedValue({
            id: 'sup_tik_1',
            userId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            subject: 'Order dispute',
            description: 'Order ID: ord_01\nReason: Wrong item\n\nNarrative',
            status: TicketStatus.OPEN,
            priority: TicketPriority.MEDIUM,
            category: 'order_dispute',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        ticketRepository.update.mockImplementation(async (ticket: any) => ticket);
        messageRepository.create.mockImplementation(async (message: any) => message);
        attachmentRepository.findByTicketId.mockResolvedValue([]);

        await controller.escalateDispute(req, res);

        expect(ticketRepository.update).toHaveBeenCalledWith(expect.objectContaining({
            priority: TicketPriority.HIGH
        }));
        expect(messageRepository.create).toHaveBeenCalledWith(expect.objectContaining({
            senderType: SenderType.USER,
            content: expect.stringContaining('Dispute escalated to HIGH')
        }));
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('adds evidence attachments to a dispute ticket', async () => {
        const req = {
            params: { id: 'sup_tik_1' },
            body: {
                note: 'Uploading courier handoff photos',
                attachments: [
                    {
                        fileName: 'proof.jpg',
                        fileUrl: 'https://example.com/proof.jpg',
                        fileSize: 2048,
                        mimeType: 'image/jpeg'
                    }
                ]
            },
            user: { userId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV', roles: ['seller'] }
        } as unknown as Request;
        const res = createResponse();

        ticketRepository.findById.mockResolvedValue({
            id: 'sup_tik_1',
            userId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            subject: 'Order dispute',
            description: 'Order ID: ord_01\nReason: Wrong item\n\nNarrative',
            status: TicketStatus.OPEN,
            priority: TicketPriority.MEDIUM,
            category: 'order_dispute',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        messageRepository.create.mockImplementation(async (message: any) => message);
        attachmentRepository.create.mockResolvedValue({
            id: 'att_1',
            fileName: 'proof.jpg',
            fileUrl: 'https://example.com/proof.jpg',
            fileSize: 2048,
            mimeType: 'image/jpeg'
        });

        await controller.addEvidence(req, res);

        expect(messageRepository.create).toHaveBeenCalled();
        expect(attachmentRepository.create).toHaveBeenCalledWith(expect.objectContaining({
            fileName: 'proof.jpg',
            uploadedBy: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV'
        }), 'sup_tik_1', expect.any(String));
        expect(res.status).toHaveBeenCalledWith(201);
    });
});
