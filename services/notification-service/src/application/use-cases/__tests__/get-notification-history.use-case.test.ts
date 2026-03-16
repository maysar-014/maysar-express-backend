import { GetNotificationHistoryUseCase } from '../get-notification-history.use-case';

const mockRepository = { search: jest.fn() } as any;

describe('GetNotificationHistoryUseCase', () => {
    let useCase: GetNotificationHistoryUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new GetNotificationHistoryUseCase(mockRepository);
    });

    it('should get notification history', async () => {
        mockRepository.search.mockResolvedValue([
            { id: 'n1', userId: 'u1', status: 'sent' },
            { id: 'n2', userId: 'u1', status: 'delivered' }
        ]);

        const result = await useCase.execute({ userId: 'u1' });

        expect(result.items).toHaveLength(2);
    });

    it('should return empty array for user with no notifications', async () => {
        mockRepository.search.mockResolvedValue([]);
        const result = await useCase.execute({ userId: 'u2' });
        expect(result.items).toHaveLength(0);
    });

    it('should filter by status when provided', async () => {
        mockRepository.search.mockResolvedValue([{ id: 'n1', status: 'sent' }]);
        const result = await useCase.execute({ userId: 'u1', status: 'sent' });
        expect(result.items).toHaveLength(1);
    });

    it('should support pagination', async () => {
        mockRepository.search.mockResolvedValue([{ id: 'n1' }, { id: 'n2' }]);
        const result = await useCase.execute({ userId: 'u1', limit: 10, page: 1 });
        expect(result.items).toHaveLength(2);
        expect(result.limit).toBe(10);
        expect(result.page).toBe(1);
    });

    it('should sort by date descending', async () => {
        mockRepository.search.mockResolvedValue([
            { id: 'n2', createdAt: new Date('2024-01-02') },
            { id: 'n1', createdAt: new Date('2024-01-01') }
        ]);
        const result = await useCase.execute({ userId: 'u1' });
        expect(result.items[0].id).toBe('n2');
    });

    it('should handle repository errors', async () => {
        mockRepository.search.mockRejectedValue(new Error('Database error'));
        await expect(useCase.execute({ userId: 'u1' })).rejects.toThrow('Database error');
    });
});
