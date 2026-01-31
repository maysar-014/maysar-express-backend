import { AnalyticsEvent } from '../../domain/entities/AnalyticsEvent.entity';

export class AnalyticsEventRepository {
    private events: Map<string, AnalyticsEvent> = new Map();

    async save(event: AnalyticsEvent): Promise<void> {
        this.events.set(event.id, event);
        // Real implementation would save to a persistent store
    }

    async findById(id: string): Promise<AnalyticsEvent | null> {
        return this.events.get(id) || null;
    }

    async findPending(): Promise<AnalyticsEvent[]> {
        return Array.from(this.events.values()).filter(e => e.status === 'pending');
    }

    async markProcessed(id: string): Promise<void> {
        const event = await this.findById(id);
        if (event) {
            this.events.set(id, event.markAsProcessed());
        }
    }
}
