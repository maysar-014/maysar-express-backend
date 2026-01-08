import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfiguration } from '../../config/supabase.config';

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

    const config = SupabaseConfiguration.getInstance().getConfig();
    
    this.client = createClient(config.url, config.anonKey);

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
      
      // Simple connection test without requiring specific tables
      const { error } = await this.client!.from('_realtime').select('*').limit(1);
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