export class MetricValue {
    private readonly value: number;

    constructor(value: number) {
        if (value === null || value === undefined) {
            throw new Error('Metric value cannot be null or undefined');
        }

        if (!Number.isFinite(value)) {
            throw new Error('Metric value must be a finite number');
        }

        this.value = value;
    }

    static create(value: number): MetricValue {
        return new MetricValue(value);
    }

    static zero(): MetricValue {
        return new MetricValue(0);
    }

    toNumber(): number {
        return this.value;
    }

    isGreaterThan(other: MetricValue): boolean {
        return this.value > other.toNumber();
    }

    isLessThan(other: MetricValue): boolean {
        return this.value < other.toNumber();
    }

    isEqualTo(other: MetricValue): boolean {
        return this.value === other.toNumber();
    }

    add(other: MetricValue): MetricValue {
        return new MetricValue(this.value + other.toNumber());
    }

    subtract(other: MetricValue): MetricValue {
        return new MetricValue(this.value - other.toNumber());
    }

    multiply(factor: number): MetricValue {
        return new MetricValue(this.value * factor);
    }

    divide(divisor: number): MetricValue {
        if (divisor === 0) {
            throw new Error('Cannot divide by zero');
        }
        return new MetricValue(this.value / divisor);
    }

    toString(): string {
        return this.value.toString();
    }
}
