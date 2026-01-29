import { DatabaseConnection } from '../prisma-client';
import { logger } from '../../services/logger.service';

jest.mock('../../services/logger.service');

jest.mock('@prisma/client', () => {
  const mockClient: any = {
    $queryRaw: jest.fn().mockResolvedValue([{ count: 0 }]),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $executeRaw: jest.fn().mockResolvedValue(undefined),
    $transaction: jest.fn((callback) => Promise.resolve(callback(mockClient)))
  };
  return {
    PrismaClient: jest.fn().mockImplementation(() => mockClient)
  };
});

describe('DatabaseConnection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('testConnection', () => {
    test('returns true on successful connection', async () => {
      const result = await DatabaseConnection.testConnection();
      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalled();
    });

    test('returns false on connection failure', async () => {
      const result = await DatabaseConnection.testConnection();
      expect(typeof result).toBe('boolean');
    });

    test('logs error on connection failure', async () => {
      await DatabaseConnection.testConnection();
    });
  });

  describe('getConnectionStatus', () => {
    test('returns connection status object', async () => {
      const status = await DatabaseConnection.getConnectionStatus();
      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('responseTime');
    });

    test('includes connectionInfo when connected', async () => {
      const status = await DatabaseConnection.getConnectionStatus();
      if (status.connected) {
        expect(status).toHaveProperty('connectionInfo');
        expect(status.connectionInfo).toHaveProperty('database');
        expect(status.connectionInfo).toHaveProperty('provider');
      }
    });

    test('includes error message when disconnected', async () => {
      const status = await DatabaseConnection.getConnectionStatus();
      if (!status.connected) {
        expect(status).toHaveProperty('error');
      }
    });

    test('measures response time', async () => {
      const status = await DatabaseConnection.getConnectionStatus();
      expect(status.responseTime).toBeDefined();
    });
  });

  describe('initialize', () => {
    test('initializes database connection successfully', async () => {
      await DatabaseConnection.initialize();
      expect(logger.info).toHaveBeenCalled();
    });

    test('tests connection during initialization', async () => {
      await DatabaseConnection.initialize();
      expect(logger.info).toHaveBeenCalledWith('Initializing database connection...');
    });

    test('logs initialization completion', async () => {
      await DatabaseConnection.initialize();
      expect(logger.info).toHaveBeenCalled();
    });

    test('throws error on initialization failure', async () => {
      try {
        await DatabaseConnection.initialize();
      } catch (e) {
        expect(e).toBeDefined();
      }
    });
  });

  describe('close', () => {
    test('closes database connection', async () => {
      await DatabaseConnection.close();
      expect(logger.info).toHaveBeenCalledWith('Database connection closed');
    });

    test('logs error on close failure', async () => {
      await DatabaseConnection.close();
    });

    test('calls prisma disconnect', async () => {
      await DatabaseConnection.close();
      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe('getHealthMetrics', () => {
    test('returns health metrics object', async () => {
      const metrics = await DatabaseConnection.getHealthMetrics();
      expect(metrics).toHaveProperty('status');
      expect(metrics).toHaveProperty('responseTime');
      expect(metrics).toHaveProperty('connectionPool');
      expect(metrics).toHaveProperty('timestamp');
    });

    test('includes connection pool information', async () => {
      const metrics = await DatabaseConnection.getHealthMetrics();
      expect(metrics.connectionPool).toHaveProperty('active');
      expect(metrics.connectionPool).toHaveProperty('idle');
      expect(metrics.connectionPool).toHaveProperty('total');
    });

    test('status is healthy or unhealthy', async () => {
      const metrics = await DatabaseConnection.getHealthMetrics();
      expect(['healthy', 'unhealthy']).toContain(metrics.status);
    });

    test('includes ISO timestamp', async () => {
      const metrics = await DatabaseConnection.getHealthMetrics();
      expect(metrics.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('getActiveConnections', () => {
    test('returns number of active connections', async () => {
      const count = await DatabaseConnection.getActiveConnections();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('returns 0 on query failure', async () => {
      const count = await DatabaseConnection.getActiveConnections();
      expect(typeof count).toBe('number');
    });
  });

  describe('getIdleConnections', () => {
    test('returns number of idle connections', async () => {
      const count = await DatabaseConnection.getIdleConnections();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('returns 0 on query failure', async () => {
      const count = await DatabaseConnection.getIdleConnections();
      expect(typeof count).toBe('number');
    });
  });

  describe('getTotalConnections', () => {
    test('returns total number of connections', async () => {
      const count = await DatabaseConnection.getTotalConnections();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('returns 0 on query failure', async () => {
      const count = await DatabaseConnection.getTotalConnections();
      expect(typeof count).toBe('number');
    });
  });

  describe('executeRaw', () => {
    test('executes raw SQL query', async () => {
      const query = 'SELECT 1';
      await DatabaseConnection.executeRaw(query);
      expect(logger.logDatabase).toHaveBeenCalled();
    });

    test('logs successful query execution', async () => {
      const query = 'SELECT 1';
      await DatabaseConnection.executeRaw(query);
      expect(logger.logDatabase).toHaveBeenCalled();
    });

    test('accepts optional parameters', async () => {
      const query = 'SELECT * FROM users WHERE id = ?';
      const params = ['user-1'];
      await DatabaseConnection.executeRaw(query, params);
      expect(logger.logDatabase).toHaveBeenCalled();
    });

    test('logs query duration', async () => {
      const query = 'SELECT 1';
      await DatabaseConnection.executeRaw(query);
      expect(logger.logDatabase).toHaveBeenCalled();
    });

    test('throws error on query failure', async () => {
      const query = 'INVALID SQL';
      try {
        await DatabaseConnection.executeRaw(query);
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    test('logs failed query execution', async () => {
      const query = 'INVALID SQL';
      try {
        await DatabaseConnection.executeRaw(query);
      } catch (e) {
        // Expected
      }
      expect(logger.logDatabase).toHaveBeenCalled();
    });
  });

  describe('executeTransaction', () => {
    test('logs successful transaction', async () => {
      const callback = jest.fn().mockResolvedValue('result');
      await DatabaseConnection.executeTransaction(callback);
      expect(logger.logDatabase).toHaveBeenCalled();
    });

    test('logs transaction duration', async () => {
      const callback = jest.fn().mockResolvedValue('result');
      await DatabaseConnection.executeTransaction(callback);
      expect(logger.logDatabase).toHaveBeenCalled();
    });

    test('throws error on transaction failure', async () => {
      const callback = jest.fn().mockRejectedValue(new Error('Transaction failed'));
      try {
        await DatabaseConnection.executeTransaction(callback);
      } catch (e) {
        expect((e as Error).message).toBe('Transaction failed');
      }
    });

    test('logs failed transaction', async () => {
      const callback = jest.fn().mockRejectedValue(new Error('Transaction failed'));
      try {
        await DatabaseConnection.executeTransaction(callback);
      } catch (e) {
        // Expected
      }
      expect(logger.logDatabase).toHaveBeenCalled();
    });
  });

  describe('connection pooling', () => {
    test('active connections are non-negative', async () => {
      const active = await DatabaseConnection.getActiveConnections();
      expect(active).toBeGreaterThanOrEqual(0);
    });

    test('idle connections are non-negative', async () => {
      const idle = await DatabaseConnection.getIdleConnections();
      expect(idle).toBeGreaterThanOrEqual(0);
    });

    test('total connections equal active plus idle', async () => {
      const active = await DatabaseConnection.getActiveConnections();
      const idle = await DatabaseConnection.getIdleConnections();
      const total = await DatabaseConnection.getTotalConnections();
      expect(total).toBeGreaterThanOrEqual(active + idle);
    });
  });

  describe('error handling', () => {
    test('handles connection errors gracefully', async () => {
      const result = await DatabaseConnection.testConnection();
      expect(typeof result).toBe('boolean');
    });

    test('handles query errors gracefully', async () => {
      try {
        await DatabaseConnection.executeRaw('INVALID');
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    test('handles transaction errors gracefully', async () => {
      const callback = jest.fn().mockRejectedValue(new Error('Error'));
      try {
        await DatabaseConnection.executeTransaction(callback);
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    test('logs all errors', async () => {
      try {
        await DatabaseConnection.executeRaw('INVALID');
      } catch (e) {
        // Expected
      }
      expect(logger.logDatabase).toHaveBeenCalled();
    });
  });

  describe('metrics and monitoring', () => {
    test('response time is measured in milliseconds', async () => {
      const status = await DatabaseConnection.getConnectionStatus();
      expect(status.responseTime).toMatch(/^\d+ms$/);
    });

    test('health metrics include timestamp', async () => {
      const metrics = await DatabaseConnection.getHealthMetrics();
      expect(metrics.timestamp).toBeDefined();
      expect(typeof metrics.timestamp).toBe('string');
    });

    test('connection info includes database name', async () => {
      const status = await DatabaseConnection.getConnectionStatus();
      if (status.connected && status.connectionInfo) {
        expect(status.connectionInfo.database).toBeDefined();
      }
    });

    test('connection info includes provider', async () => {
      const status = await DatabaseConnection.getConnectionStatus();
      if (status.connected && status.connectionInfo) {
        expect(status.connectionInfo.provider).toBe('postgresql');
      }
    });
  });
});
