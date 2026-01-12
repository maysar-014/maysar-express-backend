import { PrismaClient } from '@prisma/client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface DatabaseConfig {
  prisma: {
    url: string;
    maxConnections: number;
    logQueries: boolean;
  };
  supabase: {
    url: string;
    key: string;
    options: {
      auth: {
        autoRefreshToken: boolean;
        persistSession: boolean;
      };
    };
  };
}

export class DatabaseManager {
  private static instance: DatabaseManager;
  private prismaClient: PrismaClient | null = null;
  private supabaseClient: SupabaseClient | null = null;

  private constructor() {}

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  async initialize(config: DatabaseConfig): Promise<void> {
    try {
      // Initialize Prisma
      this.prismaClient = new PrismaClient({
        datasourceUrl: config.prisma.url,
        log: config.prisma.logQueries ? ['query', 'info', 'warn', 'error'] : undefined,
      });

      // Test Prisma connection
      await this.prismaClient.$connect();
      console.log('✅ Prisma database connected successfully');

      // Initialize Supabase
      this.supabaseClient = createClient(
        config.supabase.url,
        config.supabase.key,
        config.supabase.options
      );

      // Test Supabase connection
      const { data, error } = await this.supabaseClient
        .from('orders')
        .select('id')
        .limit(1);

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      console.log('✅ Supabase database connected successfully');

    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw new Error(`Database initialization failed: ${error}`);
    }
  }

  getPrisma(): PrismaClient {
    if (!this.prismaClient) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.prismaClient;
  }

  getSupabase(): SupabaseClient {
    if (!this.supabaseClient) {
      throw new Error('Supabase not initialized. Call initialize() first.');
    }
    return this.supabaseClient;
  }

  async disconnect(): Promise<void> {
    try {
      if (this.prismaClient) {
        await this.prismaClient.$disconnect();
        console.log('✅ Prisma database disconnected');
      }
    } catch (error) {
      console.error('❌ Error disconnecting from database:', error);
    }
  }

  async healthCheck(): Promise<{
    prisma: boolean;
    supabase: boolean;
    details: Record<string, any>;
  }> {
    const results = {
      prisma: false,
      supabase: false,
      details: {} as Record<string, any>
    };

    // Check Prisma
    try {
      if (this.prismaClient) {
        await this.prismaClient.$queryRaw`SELECT 1`;
        results.prisma = true;
        results.details.prisma = { status: 'healthy' };
      }
    } catch (error) {
      results.details.prisma = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Check Supabase
    try {
      if (this.supabaseClient) {
        const { error } = await this.supabaseClient
          .from('orders')
          .select('count', { count: 'exact', head: true });

        results.supabase = !error;
        results.details.supabase = error
          ? { status: 'unhealthy', error: error.message }
          : { status: 'healthy' };
      }
    } catch (error) {
      results.details.supabase = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    return results;
  }
}

export const databaseManager = DatabaseManager.getInstance();

// Environment-based configuration
export function loadDatabaseConfig(): DatabaseConfig {
  const config: DatabaseConfig = {
    prisma: {
      url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/order_service',
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
      logQueries: process.env.NODE_ENV === 'development'
    },
    supabase: {
      url: process.env.SUPABASE_URL || '',
      key: process.env.SUPABASE_KEY || '',
      options: {
        auth: {
          autoRefreshToken: true,
          persistSession: false
        }
      }
    }
  };

  // Validation
  if (!config.supabase.url) {
    throw new Error('SUPABASE_URL environment variable is required');
  }

  if (!config.supabase.key) {
    throw new Error('SUPABASE_KEY environment variable is required');
  }

  return config;
}
