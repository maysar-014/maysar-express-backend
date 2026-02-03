/**
 * Event Store Implementation
 * Infrastructure layer implementation of EventStore interface
 * Provides persistence and retrieval of domain events for event sourcing
 */

import { EventStore, DomainEvent } from '../../domain/interfaces';
import { PrismaClient } from '@prisma/client';

/**
 * Event Store Configuration
 */
export interface EventStoreConfig {
  enableSnapshots: boolean;
  snapshotFrequency: number; // Events between snapshots
  maxEventsPerAggregate: number;
  retentionDays: number;
  enableCompression: boolean;
  enableEncryption: boolean;
  batchSize: number;
}

/**
 * Event Store Entry
 * Database representation of a domain event
 */
interface EventStoreEntry {
  eventId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  version: number;
  timestamp: Date;
  payload: any;
  metadata?: Record<string, any>;
  correlationId?: string;
  causationId?: string;
}

/**
 * Snapshot Entry
 * Database representation of an aggregate snapshot
 */
interface SnapshotEntry {
  aggregateType: string;
  aggregateId: string;
  version: number;
  timestamp: Date;
  state: any;
  metadata?: Record<string, any>;
}

/**
 * Prisma Event Store
 * Event sourcing implementation using Prisma ORM
 * Stores domain events in relational database with proper indexing
 */
export class PrismaEventStore implements EventStore {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly config: EventStoreConfig = {
      enableSnapshots: false,
      snapshotFrequency: 100,
      maxEventsPerAggregate: 10000,
      retentionDays: 365,
      enableCompression: false,
      enableEncryption: false,
      batchSize: 100
    }
  ) {}

  async save(events: DomainEvent[]): Promise<void> {
    if (events.length === 0) return;

    // Validate events before saving
    this.validateEvents(events);

    // Group events by aggregate for optimistic concurrency
    const eventsByAggregate = this.groupEventsByAggregate(events);

    // Save events in transaction for consistency
    await this.prisma.$transaction(async (tx) => {
      for (const [aggregateId, aggregateEvents] of eventsByAggregate) {
        await this.saveAggregateEvents(tx, aggregateId, aggregateEvents);
      }
    });

    // Create snapshots if enabled
    if (this.config.enableSnapshots) {
      await this.createSnapshotsIfNeeded(events);
    }
  }

  async load(aggregateId: string, fromVersion?: number): Promise<DomainEvent[]> {
    const events = await this.prisma.eventStore.findMany({
      where: {
        aggregateId,
        version: fromVersion ? { gte: fromVersion } : undefined
      },
      orderBy: { version: 'asc' },
      take: this.config.maxEventsPerAggregate
    });

    return events.map(event => this.mapToDomainEvent(event));
  }

  async getStream(aggregateType: string, aggregateId: string): Promise<DomainEvent[]> {
    const events = await this.prisma.eventStore.findMany({
      where: {
        aggregateType,
        aggregateId
      },
      orderBy: { version: 'asc' }
    });

    return events.map(event => this.mapToDomainEvent(event));
  }

  /**
   * Get event stream with pagination
   */
  async getStreamPaginated(
    aggregateType: string,
    aggregateId: string,
    page: number = 1,
    limit: number = 100
  ): Promise<{ events: DomainEvent[]; total: number; hasMore: boolean }> {
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      this.prisma.eventStore.findMany({
        where: { aggregateType, aggregateId },
        orderBy: { version: 'asc' },
        skip,
        take: limit + 1 // Get one extra to check if there are more
      }),
      this.prisma.eventStore.count({
        where: { aggregateType, aggregateId }
      })
    ]);

    const hasMore = events.length > limit;
    const resultEvents = hasMore ? events.slice(0, limit) : events;

    return {
      events: resultEvents.map(event => this.mapToDomainEvent(event)),
      total,
      hasMore
    };
  }

  /**
   * Get events by type across all aggregates
   */
  async getEventsByType(eventType: string, limit: number = 100): Promise<DomainEvent[]> {
    const events = await this.prisma.eventStore.findMany({
      where: { eventType },
      orderBy: { timestamp: 'desc' },
      take: limit
    });

    return events.map(event => this.mapToDomainEvent(event));
  }

  /**
   * Get events within time range
   */
  async getEventsInTimeRange(
    startTime: Date,
    endTime: Date,
    eventTypes?: string[]
  ): Promise<DomainEvent[]> {
    const events = await this.prisma.eventStore.findMany({
      where: {
        timestamp: {
          gte: startTime,
          lte: endTime
        },
        eventType: eventTypes ? { in: eventTypes } : undefined
      },
      orderBy: { timestamp: 'asc' }
    });

    return events.map(event => this.mapToDomainEvent(event));
  }

  /**
   * Get aggregate version
   */
  async getAggregateVersion(aggregateId: string): Promise<number> {
    const latestEvent = await this.prisma.eventStore.findFirst({
      where: { aggregateId },
      orderBy: { version: 'desc' },
      select: { version: true }
    });

    return latestEvent?.version || 0;
  }

  /**
   * Check if aggregate exists
   */
  async aggregateExists(aggregateId: string): Promise<boolean> {
    const count = await this.prisma.eventStore.count({
      where: { aggregateId }
    });

    return count > 0;
  }

  /**
   * Clean up old events based on retention policy
   */
  async cleanupOldEvents(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    const result = await this.prisma.eventStore.deleteMany({
      where: {
        timestamp: { lt: cutoffDate }
      }
    });

    return result.count;
  }

  /**
   * Get event statistics
   */
  async getEventStatistics(): Promise<{
    totalEvents: number;
    totalAggregates: number;
    eventTypes: Record<string, number>;
    averageEventsPerAggregate: number;
  }> {
    const [
      totalEvents,
      totalAggregates,
      eventTypeStats
    ] = await Promise.all([
      this.prisma.eventStore.count(),
      this.prisma.eventStore.groupBy({
        by: ['aggregateId'],
        _count: { aggregateId: true }
      }).then(groups => groups.length),
      this.prisma.eventStore.groupBy({
        by: ['eventType'],
        _count: { eventType: true }
      })
    ]);

    const eventTypes: Record<string, number> = {};
    eventTypeStats.forEach(stat => {
      eventTypes[stat.eventType] = stat._count.eventType;
    });

    return {
      totalEvents,
      totalAggregates,
      eventTypes,
      averageEventsPerAggregate: totalAggregates > 0 ? totalEvents / totalAggregates : 0
    };
  }

  private validateEvents(events: DomainEvent[]): void {
    const eventIds = new Set<string>();
    const aggregateVersions = new Map<string, number>();

    for (const event of events) {
      // Check for duplicate event IDs
      if (eventIds.has(event.eventId)) {
        throw new Error(`Duplicate event ID: ${event.eventId}`);
      }
      eventIds.add(event.eventId);

      // Check version ordering
      const currentVersion = aggregateVersions.get(event.aggregateId) || 0;
      if (event.version <= currentVersion) {
        throw new Error(
          `Invalid event version for aggregate ${event.aggregateId}: ` +
          `expected > ${currentVersion}, got ${event.version}`
        );
      }
      aggregateVersions.set(event.aggregateId, event.version);

      // Validate required fields
      if (!event.eventId || !event.eventType || !event.aggregateId) {
        throw new Error(`Invalid event: missing required fields`);
      }
    }
  }

  private groupEventsByAggregate(events: DomainEvent[]): Map<string, DomainEvent[]> {
    const groups = new Map<string, DomainEvent[]>();

    for (const event of events) {
      if (!groups.has(event.aggregateId)) {
        groups.set(event.aggregateId, []);
      }
      groups.get(event.aggregateId)!.push(event);
    }

    return groups;
  }

  private async saveAggregateEvents(tx: any, aggregateId: string, events: DomainEvent[]): Promise<void> {
    // Check for version conflicts
    const latestVersion = await tx.eventStore.findFirst({
      where: { aggregateId },
      orderBy: { version: 'desc' },
      select: { version: true }
    });

    const expectedVersion = (latestVersion?.version || 0) + 1;

    if (events[0].version !== expectedVersion) {
      throw new Error(
        `Version conflict for aggregate ${aggregateId}: ` +
        `expected ${expectedVersion}, got ${events[0].version}`
      );
    }

    // Save events in batch
    const eventData = events.map(event => ({
      eventId: event.eventId,
      eventType: event.eventType,
      aggregateType: this.inferAggregateType(event.eventType),
      aggregateId: event.aggregateId,
      version: event.version,
      timestamp: event.timestamp,
      payload: event.payload,
      metadata: event.metadata,
      correlationId: event.metadata?.correlationId,
      causationId: event.metadata?.causationId
    }));

    await tx.eventStore.createMany({ data: eventData });
  }

  private async createSnapshotsIfNeeded(events: DomainEvent[]): Promise<void> {
    // Implementation would create snapshots based on frequency
    // This is a simplified version
    for (const event of events) {
      const eventCount = await this.prisma.eventStore.count({
        where: { aggregateId: event.aggregateId }
      });

      if (eventCount % this.config.snapshotFrequency === 0) {
        // Create snapshot (would need additional schema/table)
        console.log(`Creating snapshot for aggregate ${event.aggregateId} at version ${event.version}`);
      }
    }
  }

  private mapToDomainEvent(eventData: any): DomainEvent {
    return {
      eventId: eventData.eventId,
      eventType: eventData.eventType,
      aggregateId: eventData.aggregateId,
      version: eventData.version,
      timestamp: eventData.timestamp,
      payload: eventData.payload,
      metadata: eventData.metadata
    };
  }

  private inferAggregateType(eventType: string): string {
    // Simple inference based on event type
    // In a real implementation, you might have a registry
    if (eventType.includes('Product')) return 'Product';
    if (eventType.includes('Category')) return 'Category';
    if (eventType.includes('Seller')) return 'Seller';
    return 'Unknown';
  }
}

/**
 * In-Memory Event Store
 * Simple in-memory implementation for testing
 */
export class InMemoryEventStore implements EventStore {
  private events: Map<string, DomainEvent[]> = new Map();
  private aggregateVersions: Map<string, number> = new Map();

  async save(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      if (!this.events.has(event.aggregateId)) {
        this.events.set(event.aggregateId, []);
      }

      const aggregateEvents = this.events.get(event.aggregateId)!;

      // Check version ordering
      const expectedVersion = this.aggregateVersions.get(event.aggregateId) || 0;
      if (event.version !== expectedVersion + 1) {
        throw new Error(`Version conflict for aggregate ${event.aggregateId}`);
      }

      aggregateEvents.push(event);
      this.aggregateVersions.set(event.aggregateId, event.version);
    }
  }

  async load(aggregateId: string, fromVersion?: number): Promise<DomainEvent[]> {
    const aggregateEvents = this.events.get(aggregateId) || [];
    return aggregateEvents.filter(event => !fromVersion || event.version >= fromVersion);
  }

  async getStream(aggregateType: string, aggregateId: string): Promise<DomainEvent[]> {
    // In-memory version doesn't distinguish by aggregate type
    return this.load(aggregateId);
  }

  /**
   * Get all stored events (for testing)
   */
  getAllEvents(): DomainEvent[] {
    const allEvents: DomainEvent[] = [];
    for (const events of this.events.values()) {
      allEvents.push(...events);
    }
    return allEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Clear all events (for testing)
   */
  clear(): void {
    this.events.clear();
    this.aggregateVersions.clear();
  }
}

/**
 * Event Store Factory
 */
export class EventStoreFactory {
  private static instance: EventStore | null = null;

  static createPrisma(prisma: PrismaClient, config?: EventStoreConfig): PrismaEventStore {
    return new PrismaEventStore(prisma, config);
  }

  static createInMemory(): InMemoryEventStore {
    return new InMemoryEventStore();
  }

  static createDefault(prisma?: PrismaClient, config?: EventStoreConfig): EventStore {
    if (process.env.EVENT_STORE_TYPE === 'in_memory') {
      return this.createInMemory();
    }

    if (!prisma) {
      throw new Error('Prisma client required for Prisma event store');
    }

    return this.createPrisma(prisma, config);
  }

  static getInstance(): EventStore | null {
    return this.instance;
  }

  static setInstance(store: EventStore): void {
    if (this.instance) {
      throw new Error('Event store instance already exists');
    }
    this.instance = store;
  }
}

/**
 * Event Store Health Check
 */
export interface EventStoreHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  totalEvents: number;
  totalAggregates: number;
  recentActivity: Date | null;
  storageSize: number;
  lastCleanup: Date | null;
}

/**
 * Event Store Maintenance
 */
export class EventStoreMaintenance {
  constructor(private readonly eventStore: PrismaEventStore) {}

  async getHealthCheck(): Promise<EventStoreHealthCheck> {
    const stats = await this.eventStore.getEventStatistics();

    const recentEvent = await this.eventStore.getEventsByType('', 1);
    const recentActivity = recentEvent.length > 0 ? recentEvent[0].timestamp : null;

    return {
      status: 'healthy', // Would implement actual health checks
      totalEvents: stats.totalEvents,
      totalAggregates: stats.totalAggregates,
      recentActivity,
      storageSize: 0, // Would calculate actual storage size
      lastCleanup: null // Would track cleanup operations
    };
  }

  async performMaintenance(): Promise<{
    eventsCleaned: number;
    snapshotsCreated: number;
    optimizationsPerformed: string[];
  }> {
    const eventsCleaned = await this.eventStore.cleanupOldEvents();

    return {
      eventsCleaned,
      snapshotsCreated: 0, // Would implement snapshot creation
      optimizationsPerformed: ['old_event_cleanup']
    };
  }
}
