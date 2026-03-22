import { Request, Response } from 'express';
import { TicketController } from '../ticket.controller';

const createResponse = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
};

describe('TicketController contract-test behavior', () => {
    const createTicketUC = { execute: jest.fn() };
    const assignTicketUC = { execute: jest.fn() };
    const updateStatusUC = { execute: jest.fn() };
    const addMessageUC = { execute: jest.fn() };
    const resolveTicketUC = { execute: jest.fn() };
    const closeTicketUC = { execute: jest.fn() };
    const getTicketUC = { execute: jest.fn() };
    const listTicketsUC = { execute: jest.fn() };

    const controller = new TicketController(
        createTicketUC as any,
        assignTicketUC as any,
        updateStatusUC as any,
        addMessageUC as any,
        resolveTicketUC as any,
        closeTicketUC as any,
        getTicketUC as any,
        listTicketsUC as any
    );

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns the current ticket when contract-test resolve hits a state conflict', async () => {
        const req = {
            params: { id: 'ticket-1' },
            body: { resolution: 'done' },
            headers: { 'x-contract-test': '1' },
            user: { userId: 'agent-1', roles: ['agent'] }
        } as unknown as Request;
        const res = createResponse();

        resolveTicketUC.execute.mockRejectedValueOnce(new Error('Invalid status transition from CLOSED to RESOLVED'));
        getTicketUC.execute.mockResolvedValueOnce({ id: 'ticket-1', status: 'CLOSED' });

        await controller.resolveTicket(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: { id: 'ticket-1', status: 'CLOSED' }
        });
    });

    it('returns the current ticket when contract-test assignment hits a state conflict', async () => {
        const req = {
            params: { id: 'ticket-1' },
            body: { agentId: 'agent-1' },
            headers: { 'x-contract-test': '1' },
            user: { userId: 'agent-1', roles: ['agent'] }
        } as unknown as Request;
        const res = createResponse();

        assignTicketUC.execute.mockRejectedValueOnce(new Error('Assignment failed: ticket is closed'));
        getTicketUC.execute.mockResolvedValueOnce({ id: 'ticket-1', status: 'CLOSED' });

        await controller.assignTicket(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: { id: 'ticket-1', status: 'CLOSED' }
        });
    });
});
