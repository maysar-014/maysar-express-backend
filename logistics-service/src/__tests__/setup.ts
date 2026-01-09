/**
 * Jest Test Setup for Logistics Service
 *
 * Constitution Section 11 - Testing Constitution
 * - Domain tests: Pure logic only
 * - Saga tests: Orchestration & compensation
 * - Integration tests: Infrastructure correctness
 */

import { jest } from '@jest/globals';

// Global test setup for architectural compliance
beforeAll(() => {
  // Ensure clean test environment
  jest.setTimeout(10000);

  // Mock console methods to reduce noise during testing
  global.console = {
    ...console,
    // Keep log and warn for debugging, but suppress info in CI
    info: process.env.CI ? jest.fn() : console.info,
    debug: jest.fn(),
  };
});

afterAll(() => {
  // Clean up any global state
  jest.clearAllMocks();
  jest.resetModules();
});

// Global test utilities
(global as any).testUtils = {
  // Generate test IDs
  generateTestId: (prefix: string = 'test') =>
    `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

  // Create mock GeoPoint
  createMockGeoPoint: (lat: number = -6.7924, lng: number = 39.2083) => ({
    lat,
    lng,
    address: 'Test Address',
    distanceTo: jest.fn().mockReturnValue(10)
  }),

  // Create mock Weight
  createMockWeight: (value: number = 5) => ({
    getValue: () => value,
    toString: () => `${value}kg`
  }),

  // Create mock TimeWindow
  createMockTimeWindow: () => ({
    earliest: new Date(Date.now() - 3600000), // 1 hour ago
    latest: new Date(Date.now() + 3600000)   // 1 hour from now
  }),

  // Create mock Money
  createMockMoney: (amount: number = 5000) => ({
    getAmount: () => amount,
    getCurrency: () => 'TZS',
    toString: () => `${amount} TZS`
  })
};
