import { GetStatisticsUseCase } from '../get-statistics.use-case';
import { ISmsRepository } from '../../../domain/repositories/sms.repository';

const mockRepository: jest.Mocked<ISmsRepository> = {
    getStatistics: jest.fn()
} as any;

describe('GetStatisticsUseCase', () => {
    let useCase: GetStatisticsUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new GetStatisticsUseCase(mockRepository);
    });

    describe('execute', () => {
        it('should return statistics with calculated rates', async () => {
            mockRepository.getStatistics.mockResolvedValue({
                total: 100,
                queued: 10,
                sending: 5,
                sent: 80,
                delivered: 75,
                failed: 5,
                cancelled: 0,
                undelivered: 0
            });

            const start = new Date('2024-01-01');
            const end = new Date('2024-01-31');
            const result = await useCase.execute(start, end);

            expect(result.total).toBe(100);
            expect(result.delivered).toBe(75);
            expect(result.deliveryRate).toBe(93.75);
            expect(result.failureRate).toBe(5);
        });

        it('should handle zero sent messages', async () => {
            mockRepository.getStatistics.mockResolvedValue({
                total: 10,
                queued: 10,
                sending: 0,
                sent: 0,
                delivered: 0,
                failed: 0,
                cancelled: 0,
                undelivered: 0
            });

            const result = await useCase.execute(new Date(), new Date());

            expect(result.deliveryRate).toBe(0);
        });

        it('should handle zero total messages', async () => {
            mockRepository.getStatistics.mockResolvedValue({
                total: 0,
                queued: 0,
                sending: 0,
                sent: 0,
                delivered: 0,
                failed: 0,
                cancelled: 0,
                undelivered: 0
            });

            const result = await useCase.execute(new Date(), new Date());

            expect(result.failureRate).toBe(0);
        });
    });

    describe('executeToday', () => {
        it('should get today statistics', async () => {
            mockRepository.getStatistics.mockResolvedValue({
                total: 50,
                queued: 5,
                sending: 2,
                sent: 40,
                delivered: 38,
                failed: 3,
                cancelled: 0,
                undelivered: 0
            });

            const result = await useCase.executeToday();

            expect(result.total).toBe(50);
            expect(mockRepository.getStatistics).toHaveBeenCalled();
        });
    });

    describe('executeThisWeek', () => {
        it('should get week statistics', async () => {
            mockRepository.getStatistics.mockResolvedValue({
                total: 200,
                queued: 10,
                sending: 5,
                sent: 180,
                delivered: 170,
                failed: 5,
                cancelled: 0,
                undelivered: 0
            });

            const result = await useCase.executeThisWeek();

            expect(result.total).toBe(200);
        });
    });

    describe('executeThisMonth', () => {
        it('should get month statistics', async () => {
            mockRepository.getStatistics.mockResolvedValue({
                total: 1000,
                queued: 50,
                sending: 20,
                sent: 900,
                delivered: 880,
                failed: 30,
                cancelled: 0,
                undelivered: 0
            });

            const result = await useCase.executeThisMonth();

            expect(result.total).toBe(1000);
        });
    });
});
