export type EventStatus = 'pending' | 'processed' | 'failed';

export interface AnalyticsEventProperties {
    id: string;
    type: string;
    data: Record<string, any>;
    timestamp: Date;
    status: EventStatus;
    processedAt?: Date;
    metadata?: Record<string, any>;
}

export class AnalyticsEvent {
    private readonly props: AnalyticsEventProperties;

    constructor(props: AnalyticsEventProperties) {
        this.props = {
            ...props,
            timestamp: new Date(props.timestamp.getTime()),
            processedAt: props.processedAt ? new Date(props.processedAt.getTime()) : undefined
        };

        Object.freeze(this);
    }

    get id(): string { return this.props.id; }
    get type(): string { return this.props.type; }
    get data(): Record<string, any> { return { ...this.props.data }; }
    get timestamp(): Date { return new Date(this.props.timestamp.getTime()); }
    get status(): EventStatus { return this.props.status; }
    get processedAt(): Date | undefined {
        return this.props.processedAt ? new Date(this.props.processedAt.getTime()) : undefined;
    }
    get metadata(): Record<string, any> | undefined {
        return this.props.metadata ? { ...this.props.metadata } : undefined;
    }

    markAsProcessed(): AnalyticsEvent {
        if (this.status === 'processed') return this;

        return new AnalyticsEvent({
            ...this.props,
            status: 'processed',
            processedAt: new Date()
        });
    }

    markAsFailed(reason?: string): AnalyticsEvent {
        return new AnalyticsEvent({
            ...this.props,
            status: 'failed',
            metadata: {
                ...this.props.metadata,
                failureReason: reason
            }
        });
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            data: this.data,
            timestamp: this.timestamp.toISOString(),
            status: this.status,
            processedAt: this.processedAt?.toISOString(),
            metadata: this.metadata
        };
    }
}
