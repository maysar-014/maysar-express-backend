import { createClient, SupabaseClient } from '@supabase/supabase-js';

export class SupabaseClientManager {
  private static instance: SupabaseClientManager;
  private client: SupabaseClient<any> | null = null;
  private isConnected = false;

  private constructor() {}

  static getInstance(): SupabaseClientManager {
    if (!SupabaseClientManager.instance) {
      SupabaseClientManager.instance = new SupabaseClientManager();
    }
    return SupabaseClientManager.instance;
  }

  async connect(): Promise<SupabaseClient<any>> {
    if (this.client && this.isConnected) {
      return this.client;
    }

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY;

    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_KEY environment variables are required');
    }

    this.client = createClient(url, key);
    this.isConnected = true;
    console.log('✅ Supabase connected successfully');
    return this.client;
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency: number }> {
    const startTime = Date.now();

    try {
      if (!this.client) {
        await this.connect();
      }

      // Simple connection test
      const { error } = await this.client!.from('orders').select('id').limit(1);
      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        latency
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime
      };
    }
  }

  getClient(): SupabaseClient<any> | null {
    return this.client;
  }

  isHealthy(): boolean {
    return this.isConnected && this.client !== null;
  }
}
