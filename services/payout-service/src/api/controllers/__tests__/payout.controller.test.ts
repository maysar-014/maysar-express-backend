import { PayoutController } from '../payout.controller';
import { Request, Response } from 'express';

const mockInitiateUseCase = { execute: jest.fn() } as any;
const mockCompleteUseCase = { execute: jest.fn() } as any;
const mockCancelUseCase = { execute: jest.fn() } as any;
const mockPayoutRepository = {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findByUserIdAndRole: jest.fn()
} as any;

describe('PayoutController', () => {
    let controller: PayoutController;
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new PayoutController(
            mockInitiateUseCase,
            mockCompleteUseCase,
            mockCancelUseCase,
            mockPayoutRepository
        );
        req = { body: {}, params: {}, query: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    });

    it('should initiate payout', async () => {
        (req as any).user = { userId: 'usr_123', role: 'seller' };
        req.body = { amount: 100, currency: 'USD', method: 'MOBILE_MONEY' };
        mockInitiateUseCase.execute.mockResolvedValue({ success: true, id: 'p1' });

        await controller.initiate(req as Request, res as Response);

        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should list payouts for the authenticated user', async () => {
        (req as any).user = { userId: 'usr_123', role: 'seller' };
        req.query = { limit: '10' };
        mockPayoutRepository.findByUserIdAndRole.mockResolvedValue([{ id: 'p1' }]);

        await controller.list(req as Request, res as Response);

        expect(mockPayoutRepository.findByUserIdAndRole).toHaveBeenCalledWith('usr_123', 'seller', 10);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should prefer an eligible payout role from multi-role auth context', async () => {
        (req as any).user = { userId: 'usr_123', roles: ['admin', 'agent', 'seller'] };
        req.query = { limit: '10' };
        mockPayoutRepository.findByUserIdAndRole.mockResolvedValue([{ id: 'p1' }]);

        await controller.list(req as Request, res as Response);

        expect(mockPayoutRepository.findByUserIdAndRole).toHaveBeenCalledWith('usr_123', 'seller', 10);
        expect(mockPayoutRepository.findByUserId).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should get payout details by id', async () => {
        req.params = { id: 'p1' };
        mockPayoutRepository.findById.mockResolvedValue({ id: 'p1' });

        await controller.getPayout(req as Request, res as Response);

        expect(mockPayoutRepository.findById).toHaveBeenCalledWith('p1');
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should cancel payout', async () => {
        req.params = { id: 'p1' };
        req.body = { reason: 'User requested' };

        await controller.cancel(req as Request, res as Response);

        expect(mockCancelUseCase.execute).toHaveBeenCalledWith('p1', 'User requested');
    });
});
