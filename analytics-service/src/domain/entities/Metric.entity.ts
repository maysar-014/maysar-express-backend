import { MetricValue } from '../value-objects/metric-value.value-object';

export interface MetricProperties {
    id: string;
    type: string;
    value: MetricValue;
    dimension: string;
    period: string;
    timestamp: Date;
    confidence: number;
}

export class Metric {
    private readonly props: MetricProperties;

    constructor(props: MetricProperties) {
        if (props.confidence < 0 || props.confidence > 100) {
            throw new Error('Confidence must be between 0 and 100');
        }

        this.props = {
            ...props,
            timestamp: new Date(props.timestamp.getTime())
        };

        Object.freeze(this);
    }

    get id(): string { return this.props.id; }
    get type(): string { return this.props.type; }
    get value(): MetricValue { return this.props.value; }
    get dimension(): string { return this.props.dimension; }
    get period(): string { return this.props.period; }
    get timestamp(): Date { return new Date(this.props.timestamp.getTime()); }
    get confidence(): number { return this.props.confidence; }

    isAboveThreshold(threshold: number): boolean {
        return this.props.value.toNumber() > threshold;
    }

    calculateTrend(previous: Metric): number {
        if (previous.type !== this.type) {
            throw new Error('Cannot calculate trend between different metric types');
        }

        const currentValue = this.props.value.toNumber();
        const previousValue = previous.value.toNumber();

        if (previousValue === 0) return currentValue > 0 ? 100 : 0;

        return ((currentValue - previousValue) / previousValue) * 100;
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            value: this.value.toNumber(),
            dimension: this.dimension,
            period: this.period,
            timestamp: this.timestamp.toISOString(),
            confidence: this.confidence
        };
    }
}
