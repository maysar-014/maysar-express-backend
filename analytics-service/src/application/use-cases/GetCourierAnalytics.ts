import { CourierAnalyticsRepository } from '../../infrastructure/repositories/CourierAnalyticsRepository';

export class GetCourierAnalytics {
    constructor(private repository: CourierAnalyticsRepository) { }

    async execute(courierId: string) {
        return this.repository.getAnalytics(courierId);
    }
}
