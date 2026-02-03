import { Metric } from '../entities/Metric.entity';
import { Prediction, PredictionType } from '../entities/Prediction.entity';
import { StatisticalAlgorithm } from '../algorithms/StatisticalAlgorithm';
import { MovingAverageAlgorithm } from '../algorithms/MovingAverageAlgorithm';

export class PredictionEngine {
    constructor(
        private readonly stats: StatisticalAlgorithm = new StatisticalAlgorithm(),
        private readonly movingAverage: MovingAverageAlgorithm = new MovingAverageAlgorithm()
    ) { }

    async predict(metrics: Metric[], type: PredictionType): Promise<Prediction | null> {
        if (metrics.length < 3) return null;

        const values = metrics.map(m => m.value.toNumber());
        const ema = this.movingAverage.calculateEMA(values, 3);

        if (ema.length === 0) return null;

        const lastValue = ema[ema.length - 1];
        const trend = values[values.length - 1] - values[0];
        const predictedValue = lastValue + (trend / metrics.length);

        return new Prediction({
            id: `prd_${Date.now()}`,
            type,
            predictedValue,
            confidence: 85.0, // Base confidence
            factors: ['historical_trend', 'exponential_moving_average'],
            targetDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Predictive for tomorrow
            createdAt: new Date()
        });
    }
}
