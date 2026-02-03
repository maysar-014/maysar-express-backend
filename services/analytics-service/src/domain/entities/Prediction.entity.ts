export type PredictionType = 'revenue' | 'demand' | 'churn' | 'inventory';

export interface PredictionProperties {
    id: string;
    type: PredictionType;
    predictedValue: number;
    confidence: number;
    factors: string[];
    targetDate: Date;
    createdAt: Date;
    metadata?: Record<string, any>;
}

export class Prediction {
    private readonly props: PredictionProperties;

    constructor(props: PredictionProperties) {
        if (props.confidence < 0 || props.confidence > 100) {
            throw new Error('Confidence must be between 0 and 100');
        }

        this.props = {
            ...props,
            targetDate: new Date(props.targetDate.getTime()),
            createdAt: new Date(props.createdAt.getTime())
        };

        Object.freeze(this);
    }

    get id(): string { return this.props.id; }
    get type(): PredictionType { return this.props.type; }
    get predictedValue(): number { return this.props.predictedValue; }
    get confidence(): number { return this.props.confidence; }
    get factors(): string[] { return [...this.props.factors]; }
    get targetDate(): Date { return new Date(this.props.targetDate.getTime()); }
    get createdAt(): Date { return new Date(this.props.createdAt.getTime()); }
    get metadata(): Record<string, any> | undefined {
        return this.props.metadata ? { ...this.props.metadata } : undefined;
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            predictedValue: this.predictedValue,
            confidence: this.confidence,
            factors: this.factors,
            targetDate: this.targetDate.toISOString(),
            createdAt: this.createdAt.toISOString(),
            metadata: this.metadata
        };
    }
}
