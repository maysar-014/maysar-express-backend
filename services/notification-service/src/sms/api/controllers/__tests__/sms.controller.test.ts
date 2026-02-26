import { SmsController } from '../sms.controller';
import { SendSmsUseCase } from '../../../application/use-cases/send-sms.use-case';
import { TrackDeliveryUseCase } from '../../../application/use-cases/track-delivery.use-case';
import { RetryFailedMessagesUseCase } from '../../../application/use-cases/retry-failed-messages.use-case';
import { GetStatisticsUseCase } from '../../../application/use-cases/get-statistics.use-case';
import { Request, Response, NextFunction } from 'express';

const mockSendSmsUseCase = {
    execute: jest.fn()
} as unknown as SendSmsUseCase;

const mockTrackDeliveryUseCase = {
    execute: jest.fn()
} as unknown as TrackDeliveryUseCase;

const mockRetryFailedMessagesUseCase = {
    execute: jest.fn(),
    executeById: jest.fn()
} as unknown as RetryFailedMessagesUseCase;

const mockGetStatisticsUseCase = {
    execute: jest.fn()
} as unknown as GetStatisticsUseCase;

describe('SmsController', () => {
    let controller: SmsController;
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new SmsController(
            mockSendSmsUseCase,
            mockTrackDeliveryUseCase,
            mockRetryFailedMessagesUseCase,
            mockGetStatisticsUseCase
        );
        req = { body: {}, params: {}, query: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn()
        };
        next = jest.fn();
    });

    describe('send', () => {
        it('should send SMS successfully', async () => {
            req.body = {
                phoneNumber: '+254712345678',
                message: 'Test message'
            };

            (mockSendSmsUseCase.execute as jest.Mock).mockResolvedValue({
                success: true,
                messageId: 'msg-1'
            });

            await controller.send(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should return validation error for invalid phone', async () => {
            req.body = {
                phoneNumber: 'invalid',
                message: 'Test'
            };

            await controller.send(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.any(Object)
            }));
        });

        it('should return 400 when use case fails', async () => {
            req.body = {
                phoneNumber: '+254712345678',
                message: 'Test'
            };

            (mockSendSmsUseCase.execute as jest.Mock).mockResolvedValue({
                success: false,
                error: 'Provider error'
            });

            await controller.send(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('getStatus', () => {
        it('should return message status', async () => {
            req.params = { messageId: 'msg-1' };

            (mockTrackDeliveryUseCase.execute as jest.Mock).mockResolvedValue({
                messageId: 'msg-1',
                status: 'SENT'
            });

            await controller.getStatus(req as Request, res as Response, next);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ messageId: 'msg-1' }));
        });
    });

    describe('retryFailed', () => {
        it('should retry failed messages', async () => {
            req.body = { maxRetries: 3, limit: 10 };

            (mockRetryFailedMessagesUseCase.execute as jest.Mock).mockResolvedValue({
                totalProcessed: 5,
                totalRetried: 4,
                totalFailed: 1
            });

            await controller.retryFailed(req as Request, res as Response, next);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ totalProcessed: 5 }));
        });
    });

    describe('retryMessage', () => {
        it('should retry specific message', async () => {
            req.params = { messageId: 'msg-1' };

            (mockRetryFailedMessagesUseCase.executeById as jest.Mock).mockResolvedValue({
                success: true,
                messageId: 'msg-1'
            });

            await controller.retryMessage(req as Request, res as Response, next);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should return 400 when retry fails', async () => {
            req.params = { messageId: 'msg-1' };

            (mockRetryFailedMessagesUseCase.executeById as jest.Mock).mockResolvedValue({
                success: false,
                message: 'Not eligible'
            });

            await controller.retryMessage(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('getStatistics', () => {
        it('should return statistics', async () => {
            (mockGetStatisticsUseCase.execute as jest.Mock).mockResolvedValue({
                total: 100,
                delivered: 95,
                failed: 5
            });

            await controller.getStatistics(req as Request, res as Response, next);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ total: 100 }));
        });

        it('should use query params for time range', async () => {
            req.query = {
                startTime: '2024-01-01',
                endTime: '2024-01-31'
            };

            (mockGetStatisticsUseCase.execute as jest.Mock).mockResolvedValue({
                total: 100
            });

            await controller.getStatistics(req as Request, res as Response, next);

            expect(mockGetStatisticsUseCase.execute).toHaveBeenCalledWith(
                expect.any(Date),
                expect.any(Date)
            );
        });
    });

    describe('webhookAfricastalking', () => {
        it('should acknowledge webhook', async () => {
            await controller.webhookAfricastalking(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith('OK');
        });
    });
});
