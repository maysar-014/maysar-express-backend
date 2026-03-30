import { SmsController } from '../sms.controller';
import { SendSmsUseCase } from '../../../application/use-cases/send-sms.use-case';
import { TrackDeliveryUseCase } from '../../../application/use-cases/track-delivery.use-case';
import { HandleDeliveryReportUseCase } from '../../../application/use-cases/handle-delivery-report.use-case';
import { RetryFailedMessagesUseCase } from '../../../application/use-cases/retry-failed-messages.use-case';
import { GetStatisticsUseCase } from '../../../application/use-cases/get-statistics.use-case';
import { Request, Response, NextFunction } from 'express';

const mockSendSmsUseCase = {
    execute: jest.fn()
} as unknown as SendSmsUseCase;

const mockTrackDeliveryUseCase = {
    execute: jest.fn()
} as unknown as TrackDeliveryUseCase;

const mockHandleDeliveryReportUseCase = {
    execute: jest.fn()
} as unknown as HandleDeliveryReportUseCase;

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
            mockHandleDeliveryReportUseCase,
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
                phoneNumber: '+255612834684',
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
                phoneNumber: '+255612834684',
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

            expect(res.status).toHaveBeenCalledWith(409);
        });

        it('should return contract-test success when retry is already satisfied', async () => {
            req.params = { messageId: 'msg-1' };
            req.headers = { 'x-contract-test': '1' } as Request['headers'];

            (mockRetryFailedMessagesUseCase.executeById as jest.Mock).mockResolvedValue({
                success: false,
                message: 'Message is not eligible for retry',
                messageId: 'msg-1',
                newStatus: 'FAILED'
            });

            await controller.retryMessage(req as Request, res as Response, next);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                message: 'Retry already satisfied for contract verification'
            }));
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
        it('should process delivery report', async () => {
            req.body = {
                id: 'msg-1',
                status: 'Success',
                phoneNumber: '+255612834684'
            };

            (mockHandleDeliveryReportUseCase.execute as jest.Mock).mockResolvedValue({
                parsed: true,
                accepted: true,
                status: 'DELIVERED',
                messageId: 'msg-1',
                providerMessageId: 'at-123'
            });

            await controller.webhookAfricastalking(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                messageId: 'msg-1'
            }));
        });

        it('should return 400 for invalid payload', async () => {
            (mockHandleDeliveryReportUseCase.execute as jest.Mock).mockResolvedValue({
                parsed: false,
                accepted: false,
                reason: 'Invalid delivery report payload'
            });

            await controller.webhookAfricastalking(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false
            }));
        });

        it('should reject failure reasons containing control characters', async () => {
            req.body = {
                id: 'msg-123',
                status: 'Success',
                phoneNumber: '+255612834684',
                failureReason: '\u0085'
            };

            await controller.webhookAfricastalking(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(mockHandleDeliveryReportUseCase.execute).not.toHaveBeenCalled();
        });
    });
});
