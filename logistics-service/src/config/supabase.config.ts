export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  schema: string;
}

export class SupabaseConfiguration {
  private static instance: SupabaseConfiguration;
  private config: SupabaseConfig;

  private constructor() {
    this.config = {
      url: process.env.SUPABASE_URL || '',
      anonKey: process.env.SUPABASE_ANON_KEY || '',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      schema: process.env.SUPABASE_SCHEMA || 'public'
    };
  }

  static getInstance(): SupabaseConfiguration {
    if (!SupabaseConfiguration.instance) {
      SupabaseConfiguration.instance = new SupabaseConfiguration();
    }
    return SupabaseConfiguration.instance;
  }

  getConfig(): SupabaseConfig {
    return this.config;
  }
}