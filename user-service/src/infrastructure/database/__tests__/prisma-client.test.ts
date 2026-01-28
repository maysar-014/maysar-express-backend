import { DatabaseConnection, prisma } from '../prisma-client';
import { logger } from '../../services/logger.service';

jest.mock('../../services/logger.service');

describe('DatabaseConnection utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('testConnection', () => {
    it('returns true when testConnection succeeds', async () => {
      (prisma as any).$queryRaw = jest.fn().mockResolvedValueOnce([1]);
      const ok = await DatabaseConnection.testConnection();
      expect(ok).toBe(true);
      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Database connection test successful');
    });

    it('returns false when testConnection fails', async () => {
      (prisma as any).$queryRaw = jest.fn().mockRejectedValueOnce(new Error('Connection failed'));
      const ok = await DatabaseConnection.testConnection();
      expect(ok).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Database connection test failed',
        expect.any(Object)
      );
    });
  });

  describe('getConnectionStatus', () => {
    it('returns connected status when query succeeds', async () => {
      (prisma as any).$queryRaw = jest.fn().mockResolvedValueOnce([{ health_check: 1 }]);
      const status = await DatabaseConnection.getConnectionStatus();
      expect(status.connected).toBe(true);
      expect(status.responseTime).toBeDefined();
      expect(status.connectionInfo).toBeDefined();
    });

    it('returns disconnected status when query fails', async () => {
      (prisma as any).$queryRaw = jest.fn().mockRejectedValueOnce(new Error('Connection error'));
      const status = await DatabaseConnection.getConnectionStatus();
      expect(status.connected).toBe(false);
      expect(status.error).toBeDefined();
      expect(status.connectionInfo).toBeNull();
    });

    it('includes database name in connection info', async () => {
      const originalEnv = process.env.DATABASE_URL;
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb?sslmode=require';

      (prisma as any).$queryRaw = jest.fn().mockResolvedValueOnce([{ health_check: 1 }]);
      const status = await DatabaseConnection.getConnectionStatus();

      if (status.connectionInfo) {
        expect(status.connectionInfo.database).toBe('testdb');
        expect(status.connectionInfo.provider).toBe('postgresql');
      }

      process.env.DATABASE_URL = originalEnv;
    });

    it('handles missing DATABASE_URL gracefully', async () => {
      const originalEnv = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;

      (prisma as any).$queryRaw = jest.fn().mockResolvedValueOnce([{ health_check: 1 }]);
      const status = await DatabaseConnection.getConnectionStatus();

      if (status.connectionInfo) {
        expect(status.connectionInfo.database).toBe('unknown');
      }

      process.env.DATABASE_URL = originalEnv;
    });
  });

  describe('initialize', () => {
    it('initializes successfully when connection test passes', async () => {
      (prisma as any).$queryRaw = jest.fn().mockResolvedValueOnce([1]);
      await DatabaseConnection.initialize();

      expect(logger.info).toHaveBeenCalledWith('Initializing database connection...');
      expect(logger.info).toHaveBeenCalledWith('Database connection initialized successfully');
    });

    it('throws error when connection test fails', async () => {
      (prisma as any).$queryRaw = jest.fn().mockRejectedValueOnce(new Error('Connection failed'));
      await expect(DatabaseConnection.initialize()).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });

    it('logs migration check in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      (prisma as any).$queryRaw = jest.fn().mockResolvedValueOnce([1]);
      await DatabaseConnection.initialize();

      expect(logger.info).toHaveBeenCalledWith('Checking for pending migrations...');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('close', () => {
    it('closes database connection successfully', async () => {
      (prisma as any).$disconnect = jest.fn().mockResolvedValue(undefined);
      await DatabaseConnection.close();
      expect((prisma as any).$disconnect).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Database connection closed');
    });

    it('logs error when disconnect fails', async () => {
      (prisma as any).$disconnect = jest.fn().mockRejectedValueOnce(new Error('Disconnect failed'));
      await expect(DatabaseConnection.close()).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getHealthMetrics', () => {
    it('returns health metrics with connection pool info', async () => {
      (prisma as any).$queryRaw = jest.fn().mockResolvedValueOnce([{ health_check: 1 }]);
      (DatabaseConnection as any).getActiveConnections = jest.fn().mockResolvedValue(2);
      (DatabaseConnection as any).getIdleConnections = jest.fn().mockResolvedValue(3);
      (DatabaseConnection as any).getTotalConnections = jest.fn().mockResolvedValue(5);

      const metrics = await DatabaseConnection.getHealthMetrics();
      expect(metrics.status).toBe('healthy');
      expect(metrics.connectionPool.active).toBe(2);
      expect(metrics.connectionPool.idle).toBe(3);
      expect(metrics.connectionPool.total).toBe(5);
      expect(metrics.timestamp).toBeDefined();
    });

    it('returns unhealthy status when connection fails', async () => {
      (prisma as any).$queryRaw = jest.fn().mockRejectedValueOnce(new Error('Connection error'));
      (DatabaseConnection as any).getActiveConnections = jest.fn().mockResolvedValue(0);
      (DatabaseConnection as any).getIdleConnections = jest.fn().mockResolvedValue(0);
      (DatabaseConnection as any).getTotalConnections = jest.fn().mockResolvedValue(0);

      const metrics = await DatabaseConnection.getHealthMetrics();
      expect(metrics.status).toBe('unhealthy');
    });
  });

  describe('executeRaw', () => {
    it('executes raw query and logs success', async () => {
      await DatabaseConnection.executeRaw('SELECT 1', []);
      expect(logger.logDatabase).toHaveBeenCalledWith(
        'raw_query',
        'custom',
        expect.any(Number),
        true
      );
    });

    it('logs error when raw query fails', async () => {
      (prisma as any).$queryRaw = jest.fn().mockRejectedValueOnce(new Error('Query failed'));
      await expect(DatabaseConnection.executeRaw('INVALID QUERY')).rejects.toThrow('Query failed');
      expect(logger.logDatabase).toHaveBeenCalledWith(
        'raw_query',
        'custom',
        expect.any(Number),
        false,
        'Query failed'
      );
    });
  });

  describe('executeTransaction', () => {
    it('executes transaction successfully', async () => {
      (prisma as any).$transaction = jest.fn().mockImplementation(async (cb: any) => cb({}));
      const result = await DatabaseConnection.executeTransaction(async () => 'success');
      expect(result).toBe('success');
      expect(logger.logDatabase).toHaveBeenCalledWith(
        'transaction',
        'multiple',
        expect.any(Number),
        true
      );
    });

    it('logs error when transaction fails', async () => {
      (prisma as any).$transaction = jest.fn().mockRejectedValueOnce(new Error('Transaction failed'));
      await expect(DatabaseConnection.executeTransaction(async () => 'x')).rejects.toThrow('Transaction failed');
      expect(logger.logDatabase).toHaveBeenCalledWith(
        'transaction',
        'multiple',
        expect.any(Number),
        false,
        'Transaction failed'
      );
    });

    it('passes transaction client to callback', async () => {
      const mockTx = { user: { create: jest.fn() } };
      (prisma as any).$transaction = jest.fn().mockImplementation(async (cb: any) => cb(mockTx));

      await DatabaseConnection.executeTransaction(async (tx) => {
        expect(tx).toBe(mockTx);
        return 'ok';
      });
    });
  });

  describe('Connection pool queries', () => {
    it('getActiveConnections returns count from pg_stat_activity', async () => {
      (prisma as any).$queryRaw = jest.fn().mockResolvedValueOnce([{ count: 5 }]);
      const count = await DatabaseConnection.getActiveConnections();
      expect(count).toBe(5);
    });

    it('getActiveConnections returns 0 on error', async () => {
      (prisma as any).$queryRaw = jest.fn().mockRejectedValueOnce(new Error('Query failed'));
      const count = await DatabaseConnection.getActiveConnections();
      expect(count).toBe(0);
    });

    it('getIdleConnections returns count from pg_stat_activity', async () => {
      (prisma as any).$queryRaw = jest.fn().mockResolvedValueOnce([{ count: 3 }]);
      const count = await DatabaseConnection.getIdleConnections();
      expect(count).toBe(3);
    });

    it('getIdleConnections returns 0 on error', async () => {
      (prisma as any).$queryRaw = jest.fn().mockRejectedValueOnce(new Error('Query failed'));
      const count = await DatabaseConnection.getIdleConnections();
      expect(count).toBe(0);
    });

    it('getTotalConnections returns count from pg_stat_activity', async () => {
      (prisma as any).$queryRaw = jest.fn().mockResolvedValueOnce([{ count: 8 }]);
      const count = await DatabaseConnection.getTotalConnections();
      expect(count).toBe(8);
    });

    it('getTotalConnections returns 0 on error', async () => {
      (prisma as any).$queryRaw = jest.fn().mockRejectedValueOnce(new Error('Query failed'));
      const count = await DatabaseConnection.getTotalConnections();
      expect(count).toBe(0);
    });

    it('handles null count in query results', async () => {
      (prisma as any).$queryRaw = jest.fn().mockResolvedValueOnce([{}]);
      const count = await DatabaseConnection.getActiveConnections();
      expect(count).toBe(0);
    });
  });
});