export class MovingAverageAlgorithm {
    calculateSMA(values: number[], period: number): number[] {
        if (values.length < period) return [];

        const results: number[] = [];
        for (let i = 0; i <= values.length - period; i++) {
            const window = values.slice(i, i + period);
            const sum = window.reduce((a, b) => a + b, 0);
            results.push(sum / period);
        }
        return results;
    }

    calculateEMA(values: number[], period: number): number[] {
        if (values.length < period) return [];

        const k = 2 / (period + 1);
        const results: number[] = [];

        // Start with SMA as first EMA
        const sma = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
        results.push(sma);

        for (let i = period; i < values.length; i++) {
            const ema = (values[i] - results[results.length - 1]) * k + results[results.length - 1];
            results.push(ema);
        }

        return results;
    }
}
