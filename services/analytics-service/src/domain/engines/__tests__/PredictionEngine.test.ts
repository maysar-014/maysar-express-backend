import { PredictionEngine } from '../PredictionEngine';
import { Metric } from '../../entities/Metric.entity';
import { MetricValue } from '../../value-objects/metric-value.value-object';
import { StatisticalAlgorithm } from '../../algorithms/StatisticalAlgorithm';
import { MovingAverageAlgorithm } from '../../algorithms/MovingAverageAlgorithm';

function metric(id: string, value: number): Metric {
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

describe('PredictionEngine', () => {
    it('returns null when there are too few metrics', async () => {
        const engine = new PredictionEngine();
        const result = await engine.predict([metric('m1', 100), metric('m2', 120)], 'revenue');
        expect(result).toBeNull();
    });

    it('returns null when EMA cannot be calculated', async () => {
        const movingAverage = {
            calculateEMA: jest.fn().mockReturnValue([])
        } as unknown as MovingAverageAlgorithm;
        const engine = new PredictionEngine(new StatisticalAlgorithm(), movingAverage);

        const result = await engine.predict([metric('m1', 100), metric('m2', 120), metric('m3', 140)], 'revenue');
        expect(result).toBeNull();
    });

    it('builds prediction when enough metrics are present', async () => {
        const engine = new PredictionEngine();
        const result = await engine.predict(
            [metric('m1', 100), metric('m2', 120), metric('m3', 140), metric('m4', 160)],
            'revenue'
        );

        expect(result).not.toBeNull();
        expect(result?.type).toBe('revenue');
        expect(result?.confidence).toBe(85);
        expect(result?.factors).toEqual(['historical_trend', 'exponential_moving_average']);
        expect(result?.predictedValue).toBeGreaterThan(0);
    });
});
