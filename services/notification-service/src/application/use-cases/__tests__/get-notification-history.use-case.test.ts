import { GetNotificationHistoryUseCase } from '../get-notification-history.use-case';

const mockRepository = { findByUserId: jest.fn() } as any;

describe('GetNotificationHistoryUseCase', () => {
    let useCase: GetNotificationHistoryUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new GetNotificationHistoryUseCase(mockRepository);
    });

    it('should get notification history', async () => {
        mockRepository.findByUserId.mockResolvedValue([
            { id: 'n1', userId: 'u1', status: 'sent' },
            { id: 'n2', userId: 'u1', status: 'delivered' }
        ]);

        const result = await useCase.execute('u1');

        expect(result).toHaveLength(2);
    });

    it('should return empty array for user with no notifications', async () => {
        mockRepository.findByUserId.mockResolvedValue([]);
        const result = await useCase.execute('u2');
        expect(result).toHaveLength(0);
    });

    it('should filter by status when provided', async () => {
        mockRepository.findByUserId.mockResolvedValue([{ id: 'n1', status: 'sent' }]);
        const result = await useCase.execute('u1', { status: 'sent' });
        expect(result).toHaveLength(1);
    });

    it('should support pagination', async () => {
        mockRepository.findByUserId.mockResolvedValue([{ id: 'n1' }, { id: 'n2' }]);
        const result = await useCase.execute('u1', { limit: 10, offset: 0 });
        expect(result).toHaveLength(2);
    });

    it('should sort by date descending', async () => {
        mockRepository.findByUserId.mockResolvedValue([
            { id: 'n2', createdAt: new Date('2024-01-02') },
            { id: 'n1', createdAt: new Date('2024-01-01') }
        ]);
        const result = await useCase.execute('u1');
        expect(result[0].id).toBe('n2');
    });

    it('should handle repository errors', async () => {
        mockRepository.findByUserId.mockRejectedValue(new Error('Database error'));
        await expect(useCase.execute('u1')).rejects.toThrow('Database error');
    });
});
