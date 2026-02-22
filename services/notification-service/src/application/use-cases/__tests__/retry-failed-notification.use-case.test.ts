import { RetryFailedNotificationUseCase } from '../retry-failed-notification.use-case';

const mockRepository = { findById: jest.fn(), update: jest.fn(), findFailed: jest.fn() } as any;
const mockProvider = { send: jest.fn() } as any;

describe('RetryFailedNotificationUseCase', () => {
    let useCase: RetryFailedNotificationUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new RetryFailedNotificationUseCase(mockRepository, mockProvider);
    });

    it('should retry failed notification', async () => {
        mockRepository.findFailed.mockResolvedValue([{ id: 'n1', retryCount: 1 }]);
        mockProvider.send.mockResolvedValue({ success: true });

        await useCase.execute();

        expect(mockProvider.send).toHaveBeenCalled();
    });

    it('should skip notifications exceeding max retries', async () => {
        mockRepository.findFailed.mockResolvedValue([{ id: 'n1', retryCount: 5 }]);
        await useCase.execute();
        expect(mockProvider.send).not.toHaveBeenCalled();
    });

    it('should update retry count on success', async () => {
        mockRepository.findFailed.mockResolvedValue([{ id: 'n1', retryCount: 1 }]);
        mockProvider.send.mockResolvedValue({ success: true });
        await useCase.execute();
        expect(mockRepository.update).toHaveBeenCalledWith('n1', expect.objectContaining({ status: 'sent' }));
    });

    it('should increment retry count on failure', async () => {
        mockRepository.findFailed.mockResolvedValue([{ id: 'n1', retryCount: 1 }]);
        mockProvider.send.mockResolvedValue({ success: false });
        await useCase.execute();
        expect(mockRepository.update).toHaveBeenCalledWith('n1', expect.objectContaining({ retryCount: 2 }));
    });

    it('should handle multiple failed notifications', async () => {
        mockRepository.findFailed.mockResolvedValue([{ id: 'n1', retryCount: 1 }, { id: 'n2', retryCount: 2 }]);
        mockProvider.send.mockResolvedValue({ success: true });
        await useCase.execute();
        expect(mockProvider.send).toHaveBeenCalledTimes(2);
    });

    it('should handle provider errors gracefully', async () => {
        mockRepository.findFailed.mockResolvedValue([{ id: 'n1', retryCount: 1 }]);
        mockProvider.send.mockRejectedValue(new Error('Network error'));
        await expect(useCase.execute()).resolves.not.toThrow();
    });
});
