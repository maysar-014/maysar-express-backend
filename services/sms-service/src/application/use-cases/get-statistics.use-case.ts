import { ISmsRepository } from '../../domain/repositories/sms.repository';
import { SmsStatisticsDto } from '../dto/sms.dto';

/**
 * Get SMS Statistics Use Case
 * Retrieves statistics and metrics for SMS messages
 */
export class GetStatisticsUseCase {
    constructor(private readonly repository: ISmsRepository) { }

    async execute(startTime: Date, endTime: Date): Promise<SmsStatisticsDto> {
        const stats = await this.repository.getStatistics(startTime, endTime);

        const deliveryRate =
            stats.sent > 0
                ? Number(((stats.delivered / stats.sent) * 100).toFixed(2))
                : 0;

        const failureRate =
            stats.total > 0
                ? Number(((stats.failed / stats.total) * 100).toFixed(2))
                : 0;

        return {
            ...stats,
            deliveryRate,
            failureRate
        };
    }

    /**
     * Get today's statistics
     */
    async executeToday(): Promise<SmsStatisticsDto> {
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);

        return await this.execute(startOfDay, endOfDay);
    }

    /**
     * Get this week's statistics
     */
    async executeThisWeek(): Promise<SmsStatisticsDto> {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        return await this.execute(startOfWeek, now);
    }

    /**
     * Get this month's statistics
     */
    async executeThisMonth(): Promise<SmsStatisticsDto> {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        return await this.execute(startOfMonth, now);
    }
}
