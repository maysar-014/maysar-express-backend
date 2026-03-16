import { NotificationController } from '../notification.controller';
import { Request, Response } from 'express';

const mockSendUseCase = { execute: jest.fn() } as any;
const mockGetHistoryUseCase = { execute: jest.fn() } as any;
const mockRetryUseCase = { execute: jest.fn() } as any;
const mockRepository = { findById: jest.fn(), update: jest.fn(), delete: jest.fn() } as any;

describe('NotificationController', () => {
    let controller: NotificationController;
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new NotificationController(
            mockSendUseCase,
            mockGetHistoryUseCase,
            mockRetryUseCase,
            mockRepository
        );
        req = { body: {}, params: {}, query: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    });

    it('should create notification', async () => {
        req.body = { userId: 'u1', type: 'email', channel: 'email', subject: 'Test', content: 'Test body' };
        mockSendUseCase.execute.mockResolvedValue({ notification: { id: 'n1' } });

        await controller.createNotification(req as Request, res as Response);

        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should list notifications', async () => {
        mockGetHistoryUseCase.execute.mockResolvedValue({ items: [{ id: 'n1' }], total: 1, page: 1, limit: 20, hasMore: false });

        await controller.listNotifications(req as Request, res as Response);

        expect(res.status).toHaveBeenCalledWith(200);
    });
});
