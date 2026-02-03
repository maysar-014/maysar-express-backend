export type InsightType = 'trend' | 'pattern' | 'anomaly' | 'segment';
export type InsightPriority = 'low' | 'medium' | 'high' | 'critical';

export interface InsightProperties {
    id: string;
    type: InsightType;
    message: string;
    priority: InsightPriority;
    metric?: string;
    metadata?: Record<string, any>;
    timestamp: Date;
}

export class Insight {
    private readonly props: InsightProperties;

    constructor(props: InsightProperties) {
        this.props = {
            ...props,
            timestamp: new Date(props.timestamp.getTime())
        };

        Object.freeze(this);
    }

    get id(): string { return this.props.id; }
    get type(): InsightType { return this.props.type; }
    get message(): string { return this.props.message; }
    get priority(): InsightPriority { return this.props.priority; }
    get metric(): string | undefined { return this.props.metric; }
    get metadata(): Record<string, any> | undefined {
        return this.props.metadata ? { ...this.props.metadata } : undefined;
    }
    get timestamp(): Date { return new Date(this.props.timestamp.getTime()); }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            message: this.message,
            priority: this.priority,
            metric: this.metric,
            metadata: this.metadata,
            timestamp: this.timestamp.toISOString()
        };
    }
}
