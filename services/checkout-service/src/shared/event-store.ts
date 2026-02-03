/**
 * Event Store
 * Persists domain events for event sourcing
 */

export class EventStore {
  async append(_event: any): Promise<void> {
    // Implementation
  }

  async getEvents(_aggregateId: string): Promise<any[]> {
    // Implementation
    return [];
  }
}
