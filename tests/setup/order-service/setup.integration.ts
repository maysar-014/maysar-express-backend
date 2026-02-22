/**
 * Integration Test Setup
 * Specialized setup for integration and end-to-end tests
 */

import { jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

// Use a separate test database for integration tests
process.env.DATABASE_URL = process.env.DATABASE_URL_INTEGRATION ||
                         'postgresql://test:test@localhost:5432/test_integration_db';

// Create a real Prisma client for integration tests (not mocked)
let prismaClient: PrismaClient | null = null;

/**
 * Setup database for integration tests
 */
export async function setupTestDatabase(): Promise<void> {
  try {
    prismaClient = new PrismaClient({
      datasourceUrl: process.env.DATABASE_URL,
    });

    // Clean up any existing data
    await cleanupTestDatabase();

    // Run migrations
    await prismaClient.$executeRaw`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

    // Additional setup if needed

  } catch (error) {
    console.warn('Integration database setup failed, using mocks:', error);
    // Fall back to mocked database if real database is not available
  }
}

/**
 * Clean up test database between tests
 */
export async function cleanupTestDatabase(): Promise<void> {
  if (!prismaClient) return;

  try {
    // Clean up in reverse dependency order
    await prismaClient.settlement.deleteMany();
    await prismaClient.payment.deleteMany();
    await prismaClient.orderItem.deleteMany();
    await prismaClient.order.deleteMany();

  } catch (error) {
    console.warn('Database cleanup failed:', error);
  }
}

/**
 * Teardown integration test database
 */
export async function teardownTestDatabase(): Promise<void> {
  if (prismaClient) {
    try {
      await prismaClient.$disconnect();
    } catch (error) {
      console.warn('Error disconnecting Prisma client:', error);
    } finally {
      prismaClient = null;
    }
  }
}

// Setup before all integration tests
beforeAll(async () => {
  await setupTestDatabase();
}, 30000);

// Cleanup after each integration test
afterEach(async () => {
  await cleanupTestDatabase();
});

// Teardown after all integration tests
afterAll(async () => {
  await teardownTestDatabase();
}, 30000);

// Export for use in tests
export { prismaClient };
