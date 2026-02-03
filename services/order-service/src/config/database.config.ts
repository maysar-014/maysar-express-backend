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
      console.log('🔄 Connecting to database...');

      // Initialize Prisma with connection timeout
      this.prismaClient = new PrismaClient({
        datasourceUrl: config.prisma.url,
        log: config.prisma.logQueries ? ['query', 'info', 'warn', 'error'] : undefined,
      });

      // Test Prisma connection with timeout
      await Promise.race([
        this.prismaClient.$connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Prisma connection timeout')), 30000)
        )
      ]);

      console.log('✅ Prisma database connected successfully');

      // Initialize Supabase (optional for local development)
      try {
        this.supabaseClient = createClient(
          config.supabase.url,
          config.supabase.key,
          config.supabase.options
        );

        // Test Supabase connection (optional)
        const result = await Promise.race([
          this.supabaseClient.from('orders').select('id').limit(1),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Supabase connection timeout')), 10000)
          )
        ]);

        // Handle the result properly
        if (result && typeof result === 'object' && 'error' in result) {
          const { error } = result as { error: any };
          if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.warn('⚠️  Supabase connection issue (non-critical):', error.message);
            console.log('📝 Continuing without Supabase - using Prisma only');
          } else {
            console.log('✅ Supabase database connected successfully');
          }
        } else {
          console.log('✅ Supabase database connected successfully');
        }
      } catch (supabaseError) {
        const error = supabaseError as Error;
        console.warn('⚠️  Supabase connection failed (non-critical):', error.message);
        console.log('📝 Continuing with Prisma only - Supabase features disabled');
      }

    } catch (error) {
      const err = error as Error;
      console.error('❌ Database initialization failed:', err.message);

      // Provide helpful guidance for common issues
      if (err.message.includes('connection timeout')) {
        console.log('\n💡 Troubleshooting:');
        console.log('   • For local development: use Docker Compose (docker-compose up -d)');
        console.log('   • For production: ensure DATABASE_URL is correct');
        console.log('   • For testing: run tests without external dependencies');
      }

      throw new Error(`Database initialization failed: ${err.message}`);
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
