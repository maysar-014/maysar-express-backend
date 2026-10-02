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

    it('should list persisted payouts for a given user id', async () => {
        req.params = { userId: 'usr_123' };
        req.query = { limit: '5' };
        mockPayoutRepository.findByUserId.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);

        await controller.listByUser(req as Request, res as Response);

        expect(mockPayoutRepository.findByUserId).toHaveBeenCalledWith('usr_123', 5);
        expect(res.status).toHaveBeenCalledWith(200);

        const body = (res.json as jest.Mock).mock.calls[0][0];
        expect(body.success).toBe(true);
        expect(body.total).toBe(2);
        expect(body.data.map((payout: any) => payout.payoutId)).toEqual(['p1', 'p2']);
    });

    it('should serialise payout aggregates into the flat documented shape', async () => {
        req.params = { userId: 'usr_123' };
        req.query = {};
        mockPayoutRepository.findByUserId.mockResolvedValue([
            {
                toObject: () => ({
                    id: 'pyo_01ARZ3NDEKTSV4RRFFQ69G5FAV',
                    userId: 'usr_123',
                    userRole: 'seller',
                    amount: 250,
                    currency: 'TZS',
                    method: 'MOBILE_MONEY',
                    status: 'PENDING',
                    fee: 10,
                    netAmount: 240,
                    reference: 'ref-1',
                    mobileMoneyDetails: {
                        provider: 'M-Pesa',
                        phoneNumber: '+255712345678',
                        accountName: 'Seller Ltd'
                    },
                    createdAt: new Date('2026-09-01T10:00:00.000Z'),
                    updatedAt: new Date('2026-09-01T10:05:00.000Z')
                })
            }
        ]);

        await controller.listByUser(req as Request, res as Response);

        const body = (res.json as jest.Mock).mock.calls[0][0];
        const row = body.data[0];

        expect(row.payoutId).toBe('pyo_01ARZ3NDEKTSV4RRFFQ69G5FAV');
        expect(row.props).toBeUndefined();
        expect(row.createdAt).toBe('2026-09-01T10:00:00.000Z');
        expect(row.updatedAt).toBe('2026-09-01T10:05:00.000Z');
        expect(row.netAmount).toBe(240);
        expect(row.mobileMoneyDetails).toBeUndefined();
    });

    it('should mask the payout phone number in detail responses', async () => {
        req.params = { id: 'pyo_01ARZ3NDEKTSV4RRFFQ69G5FAV' };
        mockPayoutRepository.findById.mockResolvedValue({
            toObject: () => ({
                id: 'pyo_01ARZ3NDEKTSV4RRFFQ69G5FAV',
                status: 'PENDING',
                amount: 250,
                method: 'MOBILE_MONEY',
                mobileMoneyDetails: {
                    provider: 'M-Pesa',
                    phoneNumber: '+255712345678',
                    accountName: 'Seller Ltd'
                },
                createdAt: new Date('2026-09-01T10:00:00.000Z')
            })
        });

        await controller.getPayout(req as Request, res as Response);

        const body = (res.json as jest.Mock).mock.calls[0][0];

        expect(res.status).toHaveBeenCalledWith(200);
        expect(body.data.payoutId).toBe('pyo_01ARZ3NDEKTSV4RRFFQ69G5FAV');
        expect(body.data.phoneNumber).toBe('*********678');
        expect(JSON.stringify(body)).not.toContain('25712345678');
        expect(JSON.stringify(body)).not.toContain('props');
    });

    it('should default and cap the payout history limit for user-scoped reads', async () => {
        req.params = { userId: 'usr_123' };
        req.query = {};
        mockPayoutRepository.findByUserId.mockResolvedValue([]);
        await controller.listByUser(req as Request, res as Response);
        expect(mockPayoutRepository.findByUserId).toHaveBeenCalledWith('usr_123', 20);

        req.query = { limit: '5000' };
        await controller.listByUser(req as Request, res as Response);
        expect(mockPayoutRepository.findByUserId).toHaveBeenLastCalledWith('usr_123', 100);
    });

    it('should return 500 when user-scoped payout lookup fails', async () => {
        req.params = { userId: 'usr_123' };
        mockPayoutRepository.findByUserId.mockRejectedValueOnce(new Error('db down'));

        await controller.listByUser(req as Request, res as Response);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Internal server error' });
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
