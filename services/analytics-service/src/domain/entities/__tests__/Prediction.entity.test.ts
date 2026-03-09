import { Prediction, PredictionProperties } from '../Prediction.entity';

function buildPrediction(confidence: number): PredictionProperties {
    return {
        id: 'pred-1',
        type: 'revenue',
        predictedValue: 1234,
        confidence,
        factors: ['trend', 'seasonality'],
        targetDate: new Date('2026-01-02T00:00:00.000Z'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        metadata: { source: 'model-a' }
    };
}

describe('Prediction', () => {
    it('validates confidence range', () => {
        expect(() => new Prediction(buildPrediction(-1))).toThrow('Confidence must be between 0 and 100');
        expect(() => new Prediction(buildPrediction(101))).toThrow('Confidence must be between 0 and 100');
    });

    it('returns defensive copies for arrays and dates', () => {
        const prediction = new Prediction(buildPrediction(85));
        const factors = prediction.factors;
        factors.push('tamper');

        const targetDate = prediction.targetDate;
        targetDate.setUTCFullYear(2030);

        expect(prediction.factors).toEqual(['trend', 'seasonality']);
        expect(prediction.targetDate.toISOString()).toBe('2026-01-02T00:00:00.000Z');
    });

    it('serializes to JSON', () => {
        const prediction = new Prediction(buildPrediction(85));
        expect(prediction.toJSON()).toEqual({
            id: 'pred-1',
            type: 'revenue',
            predictedValue: 1234,
            confidence: 85,
            factors: ['trend', 'seasonality'],
            targetDate: '2026-01-02T00:00:00.000Z',
            createdAt: '2026-01-01T00:00:00.000Z',
            metadata: { source: 'model-a' }
        });
    });
});
