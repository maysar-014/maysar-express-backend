import { TicketController } from '../ticket.controller';
import { Request, Response } from 'express';

const mockCreateUseCase = { execute: jest.fn() } as any;
const mockAssignUseCase = { execute: jest.fn() } as any;

describe('TicketController', () => {
    let controller: TicketController;
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new TicketController(mockCreateUseCase, mockAssignUseCase);
        req = { body: {}, params: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    });

    it('should create ticket', async () => {
        req.body = { userId: 'u1', subject: 'Issue', description: 'Help' };
        mockCreateUseCase.execute.mockResolvedValue({ id: 't1' });
        await controller.create(req as Request, res as Response);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should assign ticket', async () => {
        req.params = { id: 't1' };
        req.body = { agentId: 'agent1' };
        await controller.assign(req as Request, res as Response);
        expect(mockAssignUseCase.execute).toHaveBeenCalledWith('t1', 'agent1');
    });
});
