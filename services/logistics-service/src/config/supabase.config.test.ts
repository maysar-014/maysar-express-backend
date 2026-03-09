import { SupabaseConfiguration } from './supabase.config';

const ORIGINAL_ENV = process.env;

describe('SupabaseConfiguration', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete (SupabaseConfiguration as any).instance;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
    delete (SupabaseConfiguration as any).instance;
  });

  it('uses empty defaults when supabase vars are not provided', () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SCHEMA;

    const config = SupabaseConfiguration.getInstance().getConfig();

    expect(config.url).toBe('');
    expect(config.anonKey).toBe('');
    expect(config.schema).toBe('public');
  });

  it('reads supplied supabase environment variables', () => {
    process.env.SUPABASE_URL = 'https://supabase.example';
    process.env.SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
    process.env.SUPABASE_SCHEMA = 'logistics';

    const config = SupabaseConfiguration.getInstance().getConfig();

    expect(config.url).toBe('https://supabase.example');
    expect(config.anonKey).toBe('anon');
    expect(config.serviceRoleKey).toBe('service');
    expect(config.schema).toBe('logistics');
  });
});
