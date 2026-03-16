import { RetryFailedMessagesUseCase } from '../retry-failed-messages.use-case';
import { ISmsRepository } from '../../../domain/repositories/sms.repository';
import { RetryPolicy } from '../../../domain/policies/retry.policy';
import { SmsMessage, SmsStatus } from '../../../domain/entities/sms-message.entity';
import { ProviderResponse } from '../../../domain/value-objects/provider-response.value-object';

const mockRepository: jest.Mocked<ISmsRepository> = {
    findFailedMessagesForRetry: jest.fn(),
    findById: jest.fn(),
    update: jest.fn()
} as any;

const mockProvider = {
    getName: jest.fn().mockReturnValue('test-provider'),
    send: jest.fn()
};

const mockEventPublisher = {
    publish: jest.fn()
};

describe('RetryFailedMessagesUseCase', () => {
    let useCase: RetryFailedMessagesUseCase;
    let retryPolicy: RetryPolicy;

    beforeEach(() => {
        jest.clearAllMocks();
        retryPolicy = new RetryPolicy();
        useCase = new RetryFailedMessagesUseCase(
            mockRepository,
            mockProvider as any,
            retryPolicy,
            mockEventPublisher as any
        );
    });

    describe('execute', () => {
        it('should retry eligible failed messages', async () => {
            jest.spyOn(retryPolicy, 'isRetryDue').mockReturnValue(true);
            const failedMessage = SmsMessage.reconstitute({
                id: 'msg-1',
                phoneNumber: '+255612834684',
                content: 'Test',
                status: SmsStatus.FAILED,
                retryCount: 1,
                maxRetries: 3,
                failedAt: new Date(Date.now() - 10000),
                createdAt: new Date(),
                updatedAt: new Date()
            });

            mockRepository.findFailedMessagesForRetry.mockResolvedValue([failedMessage]);
            mockProvider.send.mockResolvedValue(
                ProviderResponse.createSuccess('msg-123')
            );

            const result = await useCase.execute();

            expect(result.totalProcessed).toBe(1);
            expect(result.totalRetried).toBe(1);
            expect(result.totalFailed).toBe(0);
            expect(mockProvider.send).toHaveBeenCalled();
        });

        it('should handle provider failures', async () => {
            jest.spyOn(retryPolicy, 'isRetryDue').mockReturnValue(true);
            const failedMessage = SmsMessage.reconstitute({
                id: 'msg-1',
                phoneNumber: '+255612834684',
                content: 'Test',
                status: SmsStatus.FAILED,
                retryCount: 1,
                maxRetries: 3,
                failedAt: new Date(Date.now() - 10000),
                createdAt: new Date(),
                updatedAt: new Date()
            });

            mockRepository.findFailedMessagesForRetry.mockResolvedValue([failedMessage]);
            mockProvider.send.mockResolvedValue(
                ProviderResponse.createFailure('Provider error')
            );

            const result = await useCase.execute();

            expect(result.totalFailed).toBe(1);
            expect(result.totalRetried).toBe(0);
        });

        it('should respect limit option', async () => {
            jest.spyOn(retryPolicy, 'isRetryDue').mockReturnValue(true);
            const messages = Array.from({ length: 10 }, (_, i) =>
                SmsMessage.reconstitute({
                    id: `msg-${i}`,
                    phoneNumber: '+255612834684',
                    content: 'Test',
                    status: SmsStatus.FAILED,
                    retryCount: 0,
                    maxRetries: 3,
                    failedAt: new Date(Date.now() - 10000),
                    createdAt: new Date(),
                    updatedAt: new Date()
                })
            );

            mockRepository.findFailedMessagesForRetry.mockResolvedValue(messages);
            mockProvider.send.mockResolvedValue(
                ProviderResponse.createSuccess('msg-123')
            );

            const result = await useCase.execute({ limit: 5 });

            expect(result.totalProcessed).toBe(5);
        });
    });

    describe('executeById', () => {
        it('should retry message by ID', async () => {
            const message = SmsMessage.reconstitute({
                id: 'msg-1',
                phoneNumber: '+255612834684',
                content: 'Test',
                status: SmsStatus.FAILED,
                retryCount: 1,
                maxRetries: 3,
                failedAt: new Date(Date.now() - 10000),
                createdAt: new Date(),
                updatedAt: new Date()
            });

            mockRepository.findById.mockResolvedValue(message);
            mockProvider.send.mockResolvedValue(
                ProviderResponse.createSuccess('msg-123')
            );

            const result = await useCase.executeById('msg-1');

            expect(result.success).toBe(true);
            expect(result.messageId).toBe('msg-1');
        });

        it('should return error when message not found', async () => {
            mockRepository.findById.mockResolvedValue(null);

            const result = await useCase.executeById('msg-999');

            expect(result.success).toBe(false);
            expect(result.newStatus).toBe('NOT_FOUND');
        });

        it('should return error when message not eligible for retry', async () => {
            const message = SmsMessage.reconstitute({
                id: 'msg-1',
                phoneNumber: '+255612834684',
                content: 'Test',
                status: SmsStatus.FAILED,
                retryCount: 3,
                maxRetries: 3,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            mockRepository.findById.mockResolvedValue(message);

            const result = await useCase.executeById('msg-1');

            expect(result.success).toBe(false);
            expect(result.message).toContain('not eligible');
        });
    });
});
