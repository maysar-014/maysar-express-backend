import { AgentController } from '../agent.controller';
import { Request, Response } from 'express';

const mockGetTicketsUseCase = { execute: jest.fn() } as any;

describe('AgentController', () => {
    let controller: AgentController;
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new AgentController(mockGetTicketsUseCase);
        req = { params: {} };
        res = { json: jest.fn() };
    });

    it('should get agent tickets', async () => {
        req.params = { agentId: 'agent1' };
        mockGetTicketsUseCase.execute.mockResolvedValue([{ id: 't1' }]);
        await controller.getTickets(req as Request, res as Response);
        expect(res.json).toHaveBeenCalled();
    });
});
