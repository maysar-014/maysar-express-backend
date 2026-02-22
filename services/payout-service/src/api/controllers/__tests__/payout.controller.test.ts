import { PayoutController } from '../payout.controller';
import { Request, Response } from 'express';

const mockInitiateUseCase = { execute: jest.fn() } as any;
const mockCompleteUseCase = { execute: jest.fn() } as any;
const mockCancelUseCase = { execute: jest.fn() } as any;

describe('PayoutController', () => {
    let controller: PayoutController;
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new PayoutController(mockInitiateUseCase, mockCompleteUseCase, mockCancelUseCase);
        req = { body: {}, params: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    });

    it('should initiate payout', async () => {
        req.body = { recipientId: 'r1', amount: 100, currency: 'USD' };
        mockInitiateUseCase.execute.mockResolvedValue({ id: 'p1' });

        await controller.initiate(req as Request, res as Response);

        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should complete payout', async () => {
        req.params = { id: 'p1' };

        await controller.complete(req as Request, res as Response);

        expect(mockCompleteUseCase.execute).toHaveBeenCalledWith('p1', undefined);
    });

    it('should cancel payout', async () => {
        req.params = { id: 'p1' };
        req.body = { reason: 'User requested' };

        await controller.cancel(req as Request, res as Response);

        expect(mockCancelUseCase.execute).toHaveBeenCalledWith('p1', 'User requested');
    });
});
