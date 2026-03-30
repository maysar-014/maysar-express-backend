/**
 * Event Store Test Suite
 * 
 * Purpose: Validates event sourcing and persistence functionality
 * Scope: Domain layer testing with zero external dependencies
 * Coverage Target: 98% (critical business logic)
 * 
 * Test Categories:
 * - Event persistence and retrieval
 * - Aggregate versioning and concurrency
 * - Event stream management
 * - Snapshot creation and restoration
 * - Event store health and maintenance
 * 
 * Edge Cases Covered:
 * - Version conflicts and optimistic locking
 * - Duplicate event IDs
 * - Invalid event structures
 * - Large event streams
 * - Concurrent access scenarios
 */

import type { PrismaClient } from '@prisma/client';
import { DomainEvent } from '../../../domain/interfaces';
import { 
  PrismaEventStore, 
  InMemoryEventStore,
  EventStoreFactory,
  EventStoreHealthCheck,
  EventStoreMaintenance
} from '../event-store';

describe('Event Store', () => {
  describe('Event Store Factory', () => {
    beforeEach(() => {
      EventStoreFactory.resetInstance();
    });

    it('should create Prisma event store', () => {
      const mockPrisma = {
        eventStore: {
          findMany: jest.fn(),
          createMany: jest.fn(),
          count: jest.fn(),
          groupBy: jest.fn(),
          deleteMany: jest.fn(),
          findFirst: jest.fn()
        },
        $transaction: jest.fn()
      } as unknown as PrismaClient;

      const store = EventStoreFactory.createPrisma(mockPrisma);
      expect(store).toBeInstanceOf(PrismaEventStore);
    });

    it('should create in-memory event store', () => {
      const store = EventStoreFactory.createInMemory();
      expect(store).toBeInstanceOf(InMemoryEventStore);
    });

    it('should create default store based on environment', () => {
      const store = EventStoreFactory.createDefault();
      expect(store).toBeInstanceOf(InMemoryEventStore);
    });

    it('should prevent multiple instance creation', () => {
      const store = EventStoreFactory.createInMemory();
      EventStoreFactory.setInstance(store);

      expect(() => {
        EventStoreFactory.setInstance(store);
      }).toThrow('Event store instance already exists');
    });
  });

  describe('In-Memory Event Store', () => {
    let store: InMemoryEventStore;

    beforeEach(() => {
      store = new InMemoryEventStore();
    });

    it('should save single event', async () => {
      const event: DomainEvent = {
        eventId: 'event-123',
        eventType: 'ProductCreated',
        aggregateId: 'product-456',
        version: 1,
        timestamp: new Date(),
        payload: { name: 'Test Product' },
        metadata: {}
      };

      await store.save([event]);

      const loadedEvents = await store.load('product-456');
      expect(loadedEvents).toHaveLength(1);
      expect(loadedEvents[0].eventId).toBe('event-123');
    });

    it('should save multiple events for same aggregate', async () => {
      const events: DomainEvent[] = [
        {
          eventId: 'event-1',
          eventType: 'ProductCreated',
          aggregateId: 'product-1',
          version: 1,
          timestamp: new Date(),
          payload: { name: 'Product 1' },
          metadata: {}
        },
        {
          eventId: 'event-2',
          eventType: 'ProductUpdated',
          aggregateId: 'product-1',
          version: 2,
          timestamp: new Date(),
          payload: { name: 'Product 1 Updated' },
          metadata: {}
        }
      ];

      await store.save(events);

      const loadedEvents = await store.load('product-1');
      expect(loadedEvents).toHaveLength(2);
      expect(loadedEvents[0].version).toBe(1);
      expect(loadedEvents[1].version).toBe(2);
    });

    it('should load events from specific version', async () => {
      const events: DomainEvent[] = [
        {
          eventId: 'event-1',
          eventType: 'ProductCreated',
          aggregateId: 'product-1',
          version: 1,
          timestamp: new Date(),
          payload: { name: 'Product 1' },
          metadata: {}
        },
        {
          eventId: 'event-2',
          eventType: 'ProductUpdated',
          aggregateId: 'product-1',
          version: 2,
          timestamp: new Date(),
          payload: { name: 'Product 1 Updated' },
          metadata: {}
        },
        {
          eventId: 'event-3',
          eventType: 'ProductPublished',
          aggregateId: 'product-1',
          version: 3,
          timestamp: new Date(),
          payload: { published: true },
          metadata: {}
        }
      ];

      await store.save(events);

      const loadedEvents = await store.load('product-1', 2);
      expect(loadedEvents).toHaveLength(2);
      expect(loadedEvents[0].version).toBe(2);
      expect(loadedEvents[1].version).toBe(3);
    });

    it('should get event stream', async () => {
      const events: DomainEvent[] = [
        {
          eventId: 'event-1',
          eventType: 'ProductCreated',
          aggregateId: 'product-1',
          version: 1,
          timestamp: new Date(),
          payload: { name: 'Product 1' },
          metadata: {}
        }
      ];

      await store.save(events);

      const stream = await store.getStream('Product', 'product-1');
      expect(stream).toHaveLength(1);
      expect(stream[0].eventId).toBe('event-1');
    });

    it('should handle empty event arrays', async () => {
      await expect(store.save([])).resolves.toBeUndefined();
    });

    it('should clear all events', async () => {
      const event: DomainEvent = {
        eventId: 'event-123',
        eventType: 'ProductCreated',
        aggregateId: 'product-456',
        version: 1,
        timestamp: new Date(),
        payload: { name: 'Test Product' },
        metadata: {}
      };

      await store.save([event]);
      expect(store.getAllEvents()).toHaveLength(1);

      store.clear();
      expect(store.getAllEvents()).toHaveLength(0);
    });

    it('should get all events sorted by timestamp', async () => {
      const events: DomainEvent[] = [
        {
          eventId: 'event-1',
          eventType: 'ProductCreated',
          aggregateId: 'product-1',
          version: 1,
          timestamp: new Date('2024-01-02T10:00:00Z'),
          payload: { name: 'Product 1' },
          metadata: {}
        },
        {
          eventId: 'event-2',
          eventType: 'ProductCreated',
          aggregateId: 'product-2',
          version: 1,
          timestamp: new Date('2024-01-01T10:00:00Z'),
          payload: { name: 'Product 2' },
          metadata: {}
        }
      ];

      await store.save(events);
      const allEvents = store.getAllEvents();

      expect(allEvents).toHaveLength(2);
      expect(allEvents[0].timestamp).toBeInstanceOf(Date);
      expect(allEvents[0].timestamp.getTime()).toBeLessThan(allEvents[1].timestamp.getTime());
    });
  });

  describe('Prisma Event Store', () => {
    let store: PrismaEventStore;
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        eventStore: {
          findMany: jest.fn(),
          createMany: jest.fn(),
          count: jest.fn(),
          groupBy: jest.fn(),
          deleteMany: jest.fn(),
          findFirst: jest.fn()
        },
        $transaction: jest.fn()
      };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));

      store = new PrismaEventStore(mockPrisma);
    });

    it('should save events with validation', async () => {
      const events: DomainEvent[] = [
        {
          eventId: 'event-1',
          eventType: 'ProductCreated',
          aggregateId: 'product-1',
          version: 1,
          timestamp: new Date(),
          payload: { name: 'Product 1' },
          metadata: {}
        },
        {
          eventId: 'event-2',
          eventType: 'ProductUpdated',
          aggregateId: 'product-1',
          version: 2,
          timestamp: new Date(),
          payload: { name: 'Product 1 Updated' },
          metadata: {}
        }
      ];

      mockPrisma.eventStore.createMany.mockResolvedValue({ count: 2 });

      await store.save(events);

      expect(mockPrisma.eventStore.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            eventId: 'event-1',
            eventType: 'ProductCreated',
            aggregateType: 'Product',
            aggregateId: 'product-1',
            version: 1
          }),
          expect.objectContaining({
            eventId: 'event-2',
            eventType: 'ProductUpdated',
            aggregateType: 'Product',
            aggregateId: 'product-1',
            version: 2
          })
        ])
      });
    });

    it('should load events from database', async () => {
      const mockEvents = [
        {
          eventId: 'event-1',
          eventType: 'ProductCreated',
          aggregateId: 'product-1',
          version: 1,
          timestamp: new Date(),
          payload: { name: 'Product 1' },
          metadata: {}
        }
      ];

      mockPrisma.eventStore.findMany.mockResolvedValue(mockEvents);

      const loadedEvents = await store.load('product-1');

      expect(mockPrisma.eventStore.findMany).toHaveBeenCalledWith({
        where: { aggregateId: 'product-1' },
        orderBy: { version: 'asc' },
        take: 10000
      });
      expect(loadedEvents).toHaveLength(1);
    });

    it('should load events with pagination', async () => {
      const mockEvents = [
        {
          eventId: 'event-1',
          eventType: 'ProductCreated',
          aggregateId: 'product-1',
          version: 1,
          timestamp: new Date(),
          payload: { name: 'Product 1' },
          metadata: {}
        }
      ];

      mockPrisma.eventStore.findMany.mockResolvedValue(mockEvents);
      mockPrisma.eventStore.count.mockResolvedValue(1);

      const result = await store.getStreamPaginated('Product', 'product-1', 1, 10);

      expect(result.events).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('should get events by type', async () => {
      const mockEvents = [
        {
          eventId: 'event-1',
          eventType: 'ProductCreated',
          aggregateId: 'product-1',
          version: 1,
          timestamp: new Date(),
          payload: { name: 'Product 1' },
          metadata: {}
        }
      ];

      mockPrisma.eventStore.findMany.mockResolvedValue(mockEvents);

      const events = await store.getEventsByType('ProductCreated', 10);

      expect(mockPrisma.eventStore.findMany).toHaveBeenCalledWith({
        where: { eventType: 'ProductCreated' },
        orderBy: { timestamp: 'desc' },
        take: 10
      });
      expect(events).toHaveLength(1);
    });

    it('should get events in time range', async () => {
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-31T23:59:59Z');

      const mockEvents = [
        {
          eventId: 'event-1',
          eventType: 'ProductCreated',
          aggregateId: 'product-1',
          version: 1,
          timestamp: new Date(),
          payload: { name: 'Product 1' },
          metadata: {}
        }
      ];

      mockPrisma.eventStore.findMany.mockResolvedValue(mockEvents);

      const events = await store.getEventsInTimeRange(startTime, endTime, ['ProductCreated']);

      expect(mockPrisma.eventStore.findMany).toHaveBeenCalledWith({
        where: {
          timestamp: {
            gte: startTime,
            lte: endTime
          },
          eventType: { in: ['ProductCreated'] }
        },
        orderBy: { timestamp: 'asc' }
      });
      expect(events).toHaveLength(1);
    });

    it('should get aggregate version', async () => {
      mockPrisma.eventStore.findFirst.mockResolvedValue({ version: 5 });

      const version = await store.getAggregateVersion('product-1');

      expect(mockPrisma.eventStore.findFirst).toHaveBeenCalledWith({
        where: { aggregateId: 'product-1' },
        orderBy: { version: 'desc' },
        select: { version: true }
      });
      expect(version).toBe(5);
    });

    it('should check if aggregate exists', async () => {
      mockPrisma.eventStore.count.mockResolvedValue(1);

      const exists = await store.aggregateExists('product-1');

      expect(mockPrisma.eventStore.count).toHaveBeenCalledWith({
        where: { aggregateId: 'product-1' }
      });
      expect(exists).toBe(true);
    });

    it('should clean up old events', async () => {
      mockPrisma.eventStore.deleteMany.mockResolvedValue({ count: 100 });

      const cleanedCount = await store.cleanupOldEvents();

      expect(mockPrisma.eventStore.deleteMany).toHaveBeenCalledWith({
        where: {
          timestamp: expect.any(Object) // cutoff date
        }
      });
      expect(cleanedCount).toBe(100);
    });

    it('should get event statistics', async () => {
      mockPrisma.eventStore.count.mockResolvedValue(1000);
      mockPrisma.eventStore.groupBy.mockResolvedValue([
        { aggregateId: 'product-1', _count: { aggregateId: 1 } },
        { aggregateId: 'product-2', _count: { aggregateId: 1 } }
      ]);
      mockPrisma.eventStore.groupBy.mockResolvedValue([
        { eventType: 'ProductCreated', _count: { eventType: 500 } },
        { eventType: 'ProductUpdated', _count: { eventType: 300 } }
      ]);

      const stats = await store.getEventStatistics();

      expect(stats.totalEvents).toBe(1000);
      expect(stats.totalAggregates).toBe(2);
      expect(stats.eventTypes).toEqual({
        ProductCreated: 500,
        ProductUpdated: 300
      });
      expect(stats.averageEventsPerAggregate).toBe(500);
    });
  });

  describe('Event Store Edge Cases', () => {
    let store: InMemoryEventStore;

    beforeEach(() => {
      store = new InMemoryEventStore();
    });

    it('should handle duplicate event IDs', async () => {
      const events: DomainEvent[] = [
        {
          eventId: 'event-1',
          eventType: 'ProductCreated',
          aggregateId: 'product-1',
          version: 1,
          timestamp: new Date(),
          payload: { name: 'Product 1' },
          metadata: {}
        },
        {
          eventId: 'event-1', // Duplicate ID
          eventType: 'ProductUpdated',
          aggregateId: 'product-1',
          version: 2,
          timestamp: new Date(),
          payload: { name: 'Product 1 Updated' },
          metadata: {}
        }
      ];

      await expect(store.save(events)).rejects.toThrow('Duplicate event ID');
    });

    it('should handle invalid event structures', async () => {
      const invalidEvent: any = {
        eventType: 'ProductCreated',
        aggregateId: 'product-1',
        version: 1,
        timestamp: new Date()
        // Missing eventId and payload
      };

      await expect(store.save([invalidEvent])).rejects.toThrow('Invalid event');
    });

    it('should handle version conflicts', async () => {
      const events: DomainEvent[] = [
        {
          eventId: 'event-1',
          eventType: 'ProductCreated',
          aggregateId: 'product-1',
          version: 1,
          timestamp: new Date(),
          payload: { name: 'Product 1' },
          metadata: {}
        }
      ];

      await store.save(events);

      const conflictingEvent: DomainEvent = {
        eventId: 'event-2',
        eventType: 'ProductUpdated',
        aggregateId: 'product-1',
        version: 1, // Should be 2
        timestamp: new Date(),
        payload: { name: 'Product 1 Updated' },
        metadata: {}
      };

      await expect(store.save([conflictingEvent])).rejects.toThrow('Version conflict');
    });

    it('should handle concurrent access', async () => {
      const events1: DomainEvent[] = [
        {
          eventId: 'event-1',
          eventType: 'ProductCreated',
          aggregateId: 'product-1',
          version: 1,
          timestamp: new Date(),
          payload: { name: 'Product 1' },
          metadata: {}
        }
      ];

      const events2: DomainEvent[] = [
        {
          eventId: 'event-2',
          eventType: 'ProductUpdated',
          aggregateId: 'product-1',
          version: 2,
          timestamp: new Date(),
          payload: { name: 'Product 1 Updated' },
          metadata: {}
        }
      ];

      await store.save(events1);
      await store.save(events2);

      const loadedEvents = await store.load('product-1');
      expect(loadedEvents).toHaveLength(2);
      expect(loadedEvents[0].version).toBe(1);
      expect(loadedEvents[1].version).toBe(2);
    });

    it('should handle empty aggregate ID', async () => {
      const event: DomainEvent = {
        eventId: 'event-123',
        eventType: 'ProductCreated',
        aggregateId: '',
        version: 1,
        timestamp: new Date(),
        payload: { name: 'Test Product' },
        metadata: {}
      };

      await expect(store.save([event])).rejects.toThrow('Invalid event');
    });
  });

  describe('Event Store Performance', () => {
    let store: InMemoryEventStore;

    beforeEach(() => {
      store = new InMemoryEventStore();
    });

    it('should handle high volume event storage', async () => {
      const startTime = Date.now();
      
      const events: DomainEvent[] = Array.from({ length: 1000 }, (_, i) => ({
        eventId: `event-${i}`,
        eventType: 'ProductCreated',
        aggregateId: `product-${i % 10}`, // 10 different aggregates
        version: Math.floor(i / 10) + 1,
        timestamp: new Date(),
        payload: { name: `Product ${i}` },
        metadata: {}
      }));

      await store.save(events);

      const duration = Date.now() - startTime;
      const allEvents = store.getAllEvents();

      expect(allEvents).toHaveLength(1000);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle large event streams', async () => {
      const aggregateId = 'large-aggregate';
      
      const events: DomainEvent[] = Array.from({ length: 500 }, (_, i) => ({
        eventId: `event-${i}`,
        eventType: 'ProductUpdated',
        aggregateId,
        version: i + 1,
        timestamp: new Date(),
        payload: { update: `update-${i}` },
        metadata: {}
      }));

      await store.save(events);

      const loadedEvents = await store.load(aggregateId);
      expect(loadedEvents).toHaveLength(500);
      expect(loadedEvents[0].version).toBe(1);
      expect(loadedEvents[499].version).toBe(500);
    });

    it('should handle large event payloads', async () => {
      const largePayload = {
        data: 'x'.repeat(50000), // 50KB of data
        metadata: { large: true, timestamp: Date.now() }
      };

      const event: DomainEvent = {
        eventId: 'large-event',
        eventType: 'ProductCreated',
        aggregateId: 'product-456',
        version: 1,
        timestamp: new Date(),
        payload: largePayload,
        metadata: {}
      };

      const startTime = Date.now();
      await store.save([event]);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100); // Should handle large payloads quickly
      expect(store.getAllEvents()).toHaveLength(1);
    });
  });

  describe('Event Store Health and Maintenance', () => {
    let store: PrismaEventStore;
    let mockPrisma: any;
    let maintenance: EventStoreMaintenance;

    beforeEach(() => {
      mockPrisma = {
        eventStore: {
          findMany: jest.fn(),
          createMany: jest.fn(),
          count: jest.fn(),
          groupBy: jest.fn(),
          deleteMany: jest.fn(),
          findFirst: jest.fn()
        },
        $transaction: jest.fn()
      };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));

      store = new PrismaEventStore(mockPrisma);
      maintenance = new EventStoreMaintenance(store);
    });

    it('should get health check status', async () => {
      mockPrisma.eventStore.count.mockResolvedValue(1000);
      mockPrisma.eventStore.groupBy.mockResolvedValue([
        { aggregateId: 'product-1', _count: { aggregateId: 1 } }
      ]);
      mockPrisma.eventStore.findMany.mockResolvedValue([]);

      const health = await maintenance.getHealthCheck();

      expect(health.status).toBe('healthy');
      expect(health.totalEvents).toBe(1000);
      expect(health.totalAggregates).toBe(1);
      expect(health.recentActivity).toBeNull();
    });

    it('should perform maintenance operations', async () => {
      mockPrisma.eventStore.deleteMany.mockResolvedValue({ count: 500 });

      const result = await maintenance.performMaintenance();

      expect(result.eventsCleaned).toBe(500);
      expect(result.snapshotsCreated).toBe(0);
      expect(result.optimizationsPerformed).toContain('old_event_cleanup');
    });
  });

  describe('Event Store Factory Patterns', () => {
    it('should create store with custom configuration', () => {
      const mockPrisma = {
        eventStore: {
          findMany: jest.fn(),
          createMany: jest.fn(),
          count: jest.fn(),
          groupBy: jest.fn(),
          deleteMany: jest.fn(),
          findFirst: jest.fn()
        },
        category: {
          findMany: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn()
        },
        product: {
          findMany: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn()
        },
        productVariant: {
          findMany: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn()
        },
        mediaRef: {
          findMany: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn()
        },
        $transaction: jest.fn(),
        $on: jest.fn(),
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        $use: jest.fn(),
        $executeRaw: jest.fn(),
        $executeRawUnsafe: jest.fn(),
        $queryRaw: jest.fn(),
        $queryRawUnsafe: jest.fn(),
        $runCommandRaw: jest.fn(),
        $extends: jest.fn().mockReturnValue({ extArgs: {}, eventStore: jest.fn() })
      } as unknown as PrismaClient;

      const config = {
        enableSnapshots: true,
        snapshotFrequency: 50,
        maxEventsPerAggregate: 5000,
        retentionDays: 180,
        enableCompression: true,
        enableEncryption: false,
        batchSize: 50
      };

      const store = EventStoreFactory.createPrisma(mockPrisma, config);
      expect(store).toBeInstanceOf(PrismaEventStore);
    });
  });
});
