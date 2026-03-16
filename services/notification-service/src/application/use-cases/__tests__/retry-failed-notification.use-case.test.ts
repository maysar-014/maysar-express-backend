import { RetryFailedNotificationUseCase } from '../retry-failed-notification.use-case';
import { NotificationNotFoundError, NotificationValidationError } from '../../../domain/errors/notification.errors';

describe('RetryFailedNotificationUseCase', () => {
    let useCase: RetryFailedNotificationUseCase;
    const mockRepository = { findById: jest.fn(), update: jest.fn() } as any;
    const mockDeliveryPolicy = { shouldRetry: jest.fn() } as any;
    const mockTriggerSaga = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new RetryFailedNotificationUseCase(
            mockRepository,
            mockDeliveryPolicy,
            mockTriggerSaga
        );
    });

    it('should retry failed notification when eligible', async () => {
        const incremented = { id: 'n1', retryCount: 1 } as any;
        const notification = {
            id: 'n1',
            incrementRetryCount: jest.fn().mockReturnValue(incremented)
        } as any;
        mockRepository.findById.mockResolvedValue(notification);
        mockDeliveryPolicy.shouldRetry.mockReturnValue(true);
        mockRepository.update.mockResolvedValue(incremented);

        const result = await useCase.execute('n1');

        expect(notification.incrementRetryCount).toHaveBeenCalled();
        expect(mockRepository.update).toHaveBeenCalledWith(incremented);
        expect(mockTriggerSaga).toHaveBeenCalledWith(incremented);
        expect(result).toBe(incremented);
    });

    it('should throw when notification not found', async () => {
        mockRepository.findById.mockResolvedValue(null);

        await expect(useCase.execute('n1')).rejects.toThrow(NotificationNotFoundError);
    });

    it('should throw when notification cannot be retried', async () => {
        const notification = { id: 'n1', incrementRetryCount: jest.fn() } as any;
        mockRepository.findById.mockResolvedValue(notification);
        mockDeliveryPolicy.shouldRetry.mockReturnValue(false);

        await expect(useCase.execute('n1')).rejects.toThrow(NotificationValidationError);
    });
});
