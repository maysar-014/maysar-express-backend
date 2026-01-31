import { AnalyticsProcessingEngine, AnalyticsInput } from '../../domain/engines/AnalyticsProcessingEngine';
import { IMetricRepository } from '../../domain/interfaces/IMetricRepository';
import { EventBusAdapter } from '../../infrastructure/messaging/EventBusAdapter';
import { AnalyticsEvent } from '../../domain/entities/AnalyticsEvent.entity';
import { AnalyticsEventRepository } from '../../infrastructure/repositories/AnalyticsEventRepository';

export class ProcessAnalyticsEventUseCase {
    constructor(
        private readonly engine: AnalyticsProcessingEngine,
        private readonly eventRepo: AnalyticsEventRepository,
        private readonly metricRepo: IMetricRepository,
        private readonly eventBus: EventBusAdapter
    ) { }

    async execute(input: AnalyticsInput): Promise<void> {
        // 1. Create domain entity
        const event = new AnalyticsEvent({
            id: `evt_${Date.now()}`,
            type: input.eventType,
            data: input.data,
            timestamp: input.timestamp,
            status: 'pending'
        });

        // 2. Save event
        await this.eventRepo.save(event);

        // 3. Process via engine
        const output = await this.engine.processEvent(event, input.context);

        // 3. Save resulting metrics
        for (const metric of output.metrics) {
            await this.metricRepo.save(metric);
        }

        // 4. Publish metrics calculated event
        if (output.metrics.length > 0) {
            await this.eventBus.publish({
                type: 'analytics.metrics.calculated',
                data: {
                    eventId: output.eventId,
                    count: output.metrics.length,
                    timestamp: new Date().toISOString()
                }
            });
        }
    }
}
