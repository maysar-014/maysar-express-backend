import { NotificationController } from '../notification.controller';
import { Request, Response } from 'express';

const mockSendUseCase = { execute: jest.fn() } as any;
const mockGetHistoryUseCase = { execute: jest.fn() } as any;

describe('NotificationController', () => {
    let controller: NotificationController;
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new NotificationController(mockSendUseCase, mockGetHistoryUseCase);
        req = { body: {}, params: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    });

    it('should send notification', async () => {
        req.body = { userId: 'u1', type: 'email', subject: 'Test', body: 'Test body' };
        mockSendUseCase.execute.mockResolvedValue({ id: 'n1' });

        await controller.send(req as Request, res as Response);

        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should get notification history', async () => {
        req.params = { userId: 'u1' };
        mockGetHistoryUseCase.execute.mockResolvedValue([{ id: 'n1' }]);

        await controller.getHistory(req as Request, res as Response);

        expect(res.json).toHaveBeenCalled();
    });
});
