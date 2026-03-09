import { ProcessAnalyticsEventUseCase } from '../ProcessAnalyticsEventUseCase';
import { AnalyticsProcessingEngine } from '../../../domain/engines/AnalyticsProcessingEngine';
import { AnalyticsEventRepository } from '../../../infrastructure/repositories/AnalyticsEventRepository';
import { IMetricRepository } from '../../../domain/interfaces/IMetricRepository';
import { EventBusAdapter } from '../../../infrastructure/messaging/EventBusAdapter';
import { Metric } from '../../../domain/entities/Metric.entity';
import { MetricValue } from '../../../domain/value-objects/metric-value.value-object';

function buildMetric(id: string, value: number): Metric {
    return new Metric({
        id,
        type: 'revenue',
        value: MetricValue.create(value),
        dimension: 'seller-1',
        period: 'day',
        timestamp: new Date('2026-01-01T00:00:00.000Z'),
        confidence: 90
    });
}

describe('ProcessAnalyticsEventUseCase', () => {
    it('saves event, persists metrics, and publishes metrics-calculated event', async () => {
        const engine = {
            processEvent: jest.fn().mockResolvedValue({
                eventId: 'evt-1',
                metrics: [buildMetric('m1', 100), buildMetric('m2', 200)]
            })
        } as unknown as jest.Mocked<Pick<AnalyticsProcessingEngine, 'processEvent'>>;

        const eventRepo = {
            save: jest.fn().mockResolvedValue(undefined)
        } as unknown as jest.Mocked<Pick<AnalyticsEventRepository, 'save'>>;

        const metricRepo = {
            save: jest.fn().mockResolvedValue(undefined)
        } as unknown as jest.Mocked<IMetricRepository>;

        const eventBus = {
            publish: jest.fn().mockResolvedValue(undefined)
        } as unknown as jest.Mocked<Pick<EventBusAdapter, 'publish'>>;

        const useCase = new ProcessAnalyticsEventUseCase(
            engine as unknown as AnalyticsProcessingEngine,
            eventRepo as unknown as AnalyticsEventRepository,
            metricRepo,
            eventBus as unknown as EventBusAdapter
        );

        await useCase.execute({
            eventType: 'order.created',
            data: { amount: 100 },
            timestamp: new Date('2026-01-01T00:00:00.000Z'),
            context: { channel: 'api', source: 'api' }
        });

        expect(eventRepo.save).toHaveBeenCalledTimes(1);
        expect(engine.processEvent).toHaveBeenCalledTimes(1);
        expect(metricRepo.save).toHaveBeenCalledTimes(2);
        expect(eventBus.publish).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'analytics.metrics.calculated',
                data: expect.objectContaining({
                    eventId: 'evt-1',
                    count: 2
                })
            })
        );
    });

    it('does not publish when no metrics are generated', async () => {
        const engine = {
            processEvent: jest.fn().mockResolvedValue({
                eventId: 'evt-1',
                metrics: []
            })
        } as unknown as jest.Mocked<Pick<AnalyticsProcessingEngine, 'processEvent'>>;

        const eventRepo = {
            save: jest.fn().mockResolvedValue(undefined)
        } as unknown as jest.Mocked<Pick<AnalyticsEventRepository, 'save'>>;

        const metricRepo = {
            save: jest.fn().mockResolvedValue(undefined)
        } as unknown as jest.Mocked<IMetricRepository>;

        const eventBus = {
            publish: jest.fn().mockResolvedValue(undefined)
        } as unknown as jest.Mocked<Pick<EventBusAdapter, 'publish'>>;

        const useCase = new ProcessAnalyticsEventUseCase(
            engine as unknown as AnalyticsProcessingEngine,
            eventRepo as unknown as AnalyticsEventRepository,
            metricRepo,
            eventBus as unknown as EventBusAdapter
        );

        await useCase.execute({
            eventType: 'order.created',
            data: {},
            timestamp: new Date('2026-01-01T00:00:00.000Z'),
            context: { channel: 'api', source: 'api' }
        });

        expect(metricRepo.save).not.toHaveBeenCalled();
        expect(eventBus.publish).not.toHaveBeenCalled();
    });
});
