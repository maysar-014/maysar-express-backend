import { ProductionController } from '../ProductionController';
import { Request, Response } from 'express';

const mockCreatePlanUseCase = { execute: jest.fn() } as any;
const mockScheduleUseCase = { execute: jest.fn() } as any;

describe('ProductionController', () => {
    let controller: ProductionController;
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new ProductionController(mockCreatePlanUseCase, mockScheduleUseCase);
        req = { body: {}, params: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    });

    it('should create production plan', async () => {
        req.body = { orderId: 'o1', quantity: 100 };
        mockCreatePlanUseCase.execute.mockResolvedValue({ id: 'plan1' });
        await controller.createPlan(req as Request, res as Response);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should schedule production', async () => {
        req.params = { id: 'plan1' };
        mockScheduleUseCase.execute.mockResolvedValue([{ id: 'p1' }]);
        await controller.schedule(req as Request, res as Response);
        expect(res.json).toHaveBeenCalled();
    });
});
