/**
 * Domain Test Setup
 * Specific setup for domain layer tests (pure business logic)
 */

import { jest } from '@jest/globals';

// =====================================================================================
// DOMAIN TEST ENVIRONMENT SETUP
// =====================================================================================

// Ensure we're in test mode
process.env.NODE_ENV = 'test';

// Mock all external dependencies for pure domain testing
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
  })),
}));

jest.mock('@elastic/elasticsearch', () => ({
  Client: jest.fn(() => ({
    search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
    index: jest.fn().mockResolvedValue({ _id: 'test-id' }),
    delete: jest.fn().mockResolvedValue({ result: 'deleted' }),
  })),
}));

jest.mock('kafkajs', () => ({
  Kafka: jest.fn(() => ({
    producer: jest.fn(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      send: jest.fn().mockResolvedValue(undefined),
    })),
    consumer: jest.fn(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockResolvedValue(undefined),
      run: jest.fn().mockResolvedValue(undefined),
    })),
  })),
}));

// Mock any database-related modules
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  })),
}));

// =====================================================================================
// DOMAIN-SPECIFIC TEST UTILITIES
// =====================================================================================

/**
 * Domain Test Helpers
 */
global.domainTestUtils = {
  /**
   * Create a valid domain entity for testing
   */
  createValidProduct: (overrides = {}) => ({
    id: 'prod-123',
    name: 'Test Product',
    description: 'A comprehensive test product description',
    price: 99.99,
    category: 'electronics',
    sku: 'TEST-001',
    inventory: 100,
    status: 'draft' as const,
    visibility: 'public' as const,
    ownerId: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  /**
   * Create a valid pricing context
   */
  createValidPricingContext: (overrides = {}) => ({
    basePrice: 100,
    quantity: 10,
    tier: 'wholesale-small' as const,
    region: 'us-east',
    demandFactor: 1.0,
    inventoryLevel: 100,
    ...overrides,
  }),

  /**
   * Create a valid user context for domain operations
   */
  createValidUserContext: (overrides = {}) => ({
    userId: 'user-123',
    roles: ['user'],
    permissions: ['read:products', 'write:products'],
    isAuthenticated: true,
    subscriptionTier: 'basic' as const,
    region: 'us-east',
    ...overrides,
  }),

  /**
   * Assert domain invariants
   */
  assertDomainInvariant: (entity: any, invariant: (e: any) => boolean, message?: string) => {
    if (!invariant(entity)) {
      throw new Error(message || 'Domain invariant violated');
    }
  },

  /**
   * Test domain event generation
   */
  expectDomainEvent: (events: any[], eventType: string, eventData?: any) => {
    const event = events.find(e => e.type === eventType);
    expect(event).toBeDefined();
    if (eventData) {
      expect(event.data).toMatchObject(eventData);
    }
    return event;
  },
};

// =====================================================================================
// DOMAIN TEST HOOKS
// =====================================================================================

beforeEach(() => {
  // Clear all mocks before each domain test
  jest.clearAllMocks();

  // Reset any global domain state if needed
  // This ensures pure domain testing
});

afterEach(() => {
  // Verify no external dependencies were called in domain tests
  // This helps ensure domain layer purity

  // Note: In a real implementation, you might want to check that
  // infrastructure mocks were not called unexpectedly
});

// =====================================================================================
// TYPE DEFINITIONS
// =====================================================================================

declare global {
  var domainTestUtils: {
    createValidProduct: (overrides?: any) => any;
    createValidPricingContext: (overrides?: any) => any;
    createValidUserContext: (overrides?: any) => any;
    assertDomainInvariant: (entity: any, invariant: (e: any) => boolean, message?: string) => void;
    expectDomainEvent: (events: any[], eventType: string, eventData?: any) => any;
  };
}
