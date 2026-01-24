/**
 * Test Container Database Helper
 * 
 * Purpose: Manages test database lifecycle for integration tests
 * Scope: Infrastructure layer database testing with Docker containers
 * Coverage Target: 100% (database lifecycle management)
 * 
 * Test Categories:
 * - Docker container lifecycle management
 * - Database connection management
 * - Schema migration handling
 * - Test data isolation
 * - Resource cleanup
 * 
 * Edge Cases Covered:
 * - Container startup failures
 * - Database connection timeouts
 * - Migration failures
 * - Resource cleanup on test failures
 * - Concurrent test execution
 */

import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class TestContainerDatabase {
  private prismaClient: PrismaClient;
  private containerId?: string;
  private databaseUrl?: string;
  private isRunning = false;

  /**
   * Start test container database
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    try {
      // Start PostgreSQL container
      const containerName = `test-db-${Date.now()}`;
      const port = this.getRandomPort();
      
      const { stdout: containerOutput } = await execAsync(
        `docker run -d --name ${containerName} -e POSTGRES_DB=test -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test -p ${port}:5432 postgres:15`
      );
      
      this.containerId = containerOutput.trim();
      this.databaseUrl = `postgresql://test:test@localhost:${port}/test`;
      
      // Wait for database to be ready
      await this.waitForDatabaseReady();
      
      // Initialize Prisma client
      this.prismaClient = new PrismaClient({
        datasources: {
          db: {
            url: this.databaseUrl
          }
        }
      });
      
      this.isRunning = true;
      
      console.log(`Test database started: ${containerName} on port ${port}`);
    } catch (error) {
      console.error('Failed to start test database:', error);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Stop and clean up test container
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      if (this.prismaClient) {
        await this.prismaClient.$disconnect();
      }
      
      if (this.containerId) {
        try {
          await execAsync(`docker stop ${this.containerId}`);
          await execAsync(`docker rm ${this.containerId}`);
          console.log(`Test database stopped: ${this.containerId}`);
        } catch (error) {
          console.warn('Failed to stop container:', error);
        }
      }
      
      this.isRunning = false;
      this.containerId = undefined;
      this.databaseUrl = undefined;
    } catch (error) {
      console.error('Failed to stop test database:', error);
      throw error;
    }
  }

  /**
   * Reset database state
   */
  async reset(): Promise<void> {
    if (!this.isRunning || !this.prismaClient) {
      throw new Error('Database not running');
    }

    try {
      // Clean all data but keep schema
      await this.prismaClient.$executeRaw`TRUNCATE TABLE "ProductVariant" CASCADE`;
      await this.prismaClient.$executeRaw`TRUNCATE TABLE "Product" CASCADE`;
      await this.prismaClient.$executeRaw`TRUNCATE TABLE "Category" CASCADE`;
      await this.prismaClient.$executeRaw`TRUNCATE TABLE "Seller" CASCADE`;
      
      console.log('Database state reset');
    } catch (error) {
      console.error('Failed to reset database:', error);
      throw error;
    }
  }

  /**
   * Run database migrations
   */
  async runMigrations(): Promise<void> {
    if (!this.isRunning) {
      throw new Error('Database not running');
    }

    try {
      // Run Prisma migrations
      await execAsync('npx prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: this.databaseUrl }
      });
      
      console.log('Migrations completed');
    } catch (error) {
      console.error('Failed to run migrations:', error);
      throw error;
    }
  }

  /**
   * Get Prisma client instance
   */
  getPrismaClient(): PrismaClient {
    if (!this.isRunning || !this.prismaClient) {
      throw new Error('Database not running');
    }
    return this.prismaClient;
  }

  /**
   * Get database connection URL
   */
  getDatabaseUrl(): string {
    if (!this.databaseUrl) {
      throw new Error('Database URL not available');
    }
    return this.databaseUrl;
  }

  /**
   * Check if database is running
   */
  isDatabaseRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Force cleanup on test failure
   */
  async cleanup(): Promise<void> {
    try {
      if (this.prismaClient) {
        await this.prismaClient.$disconnect();
      }
    } catch (error) {
      console.warn('Error disconnecting Prisma client:', error);
    }

    if (this.containerId) {
      try {
        await execAsync(`docker stop ${this.containerId} || true`);
        await execAsync(`docker rm ${this.containerId} || true`);
      } catch (error) {
        console.warn('Error cleaning up container:', error);
      }
    }
  }

  /**
   * Wait for database to be ready
   */
  private async waitForDatabaseReady(maxRetries = 30, retryInterval = 2000): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.prismaClient.$queryRaw`SELECT 1`;
        console.log('Database is ready');
        return;
      } catch (error) {
        if (i === maxRetries - 1) {
          throw new Error('Database failed to become ready');
        }
        console.log(`Waiting for database... (${i + 1}/${maxRetries})`);
        await this.sleep(retryInterval);
      }
    }
  }

  /**
   * Get random available port
   */
  private getRandomPort(): number {
    const minPort = 5433;
    const maxPort = 6000;
    return Math.floor(Math.random() * (maxPort - minPort + 1)) + minPort;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Test Database Factory
 * Creates and manages multiple test database instances
 */
export class TestDatabaseFactory {
  private static instances = new Map<string, TestContainerDatabase>();

  /**
   * Create or get test database instance
   */
  static async createInstance(name: string = 'default'): Promise<TestContainerDatabase> {
    if (this.instances.has(name)) {
      return this.instances.get(name)!;
    }

    const database = new TestContainerDatabase();
    await database.start();
    this.instances.set(name, database);
    
    return database;
  }

  /**
   * Get existing test database instance
   */
  static getInstance(name: string = 'default'): TestContainerDatabase {
    const instance = this.instances.get(name);
    if (!instance) {
      throw new Error(`Test database instance '${name}' not found`);
    }
    return instance;
  }

  /**
   * Stop and clean up all test database instances
   */
  static async cleanupAll(): Promise<void> {
    const cleanupPromises = Array.from(this.instances.values()).map(async (database) => {
      try {
        await database.stop();
      } catch (error) {
        console.warn('Error cleaning up database instance:', error);
      }
    });

    await Promise.all(cleanupPromises);
    this.instances.clear();
  }

  /**
   * Get all active database instances
   */
  static getActiveInstances(): TestContainerDatabase[] {
    return Array.from(this.instances.values());
  }
}

/**
 * Test Database Configuration
 */
export interface TestDatabaseConfig {
  containerName?: string;
  port?: number;
  databaseName?: string;
  username?: string;
  password?: string;
  maxRetries?: number;
  retryInterval?: number;
}

/**
 * Test Database Manager
 * High-level interface for test database management
 */
export class TestDatabaseManager {
  private database: TestContainerDatabase;
  private config: TestDatabaseConfig;

  constructor(config: TestDatabaseConfig = {}) {
    this.config = {
      containerName: config.containerName || `test-db-${Date.now()}`,
      port: config.port || this.getRandomPort(),
      databaseName: config.databaseName || 'test',
      username: config.username || 'test',
      password: config.password || 'test',
      maxRetries: config.maxRetries || 30,
      retryInterval: config.retryInterval || 2000
    };
    
    this.database = new TestContainerDatabase();
  }

  /**
   * Setup test database
   */
  async setup(): Promise<void> {
    await this.database.start();
    await this.database.runMigrations();
  }

  /**
   * Teardown test database
   */
  async teardown(): Promise<void> {
    await this.database.stop();
  }

  /**
   * Reset test database state
   */
  async reset(): Promise<void> {
    await this.database.reset();
  }

  /**
   * Get database client
   */
  getClient(): PrismaClient {
    return this.database.getPrismaClient();
  }

  /**
   * Get database URL
   */
  getUrl(): string {
    return this.database.getDatabaseUrl();
  }

  /**
   * Get random available port
   */
  private getRandomPort(): number {
    const minPort = 5433;
    const maxPort = 6000;
    return Math.floor(Math.random() * (maxPort - minPort + 1)) + minPort;
  }
}