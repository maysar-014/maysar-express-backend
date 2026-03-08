const createClientMock = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock
}));

jest.mock('../../../../logistics-service/src/config/supabase.config', () => ({
  SupabaseConfiguration: {
    getInstance: () => ({
      getConfig: () => ({
        url: 'https://logistics.supabase.local',
        anonKey: 'anon-key'
      })
    })
  }
}));

describe('supabase client managers', () => {
  const previousEnv = { ...process.env };

  const createSupabaseClientStub = () => ({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue({ error: null })
      })
    })
  });

  afterEach(() => {
    process.env = { ...previousEnv };
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('order-service manager validates env, connects, and reports health', async () => {
    process.env.SUPABASE_URL = 'https://order.supabase.local';
    process.env.SUPABASE_KEY = 'order-key';
    createClientMock.mockReturnValue(createSupabaseClientStub());

    const orderModule = await import('./supabase.client');
    const manager = orderModule.SupabaseClientManager.getInstance();

    const client = await manager.connect();
    const health = await manager.healthCheck();

    expect(client).toBeDefined();
    expect(createClientMock).toHaveBeenCalledWith('https://order.supabase.local', 'order-key');
    expect(health.status).toBe('healthy');
    expect(manager.isHealthy()).toBe(true);
  });

  it('order-service manager throws when required env vars are missing', async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_KEY;

    const orderModule = await import('./supabase.client');
    const manager = orderModule.SupabaseClientManager.getInstance();

    await expect(manager.connect()).rejects.toThrow(
      'SUPABASE_URL and SUPABASE_KEY environment variables are required'
    );
  });

  it('loads logistics manager and connects using configuration provider', async () => {
    createClientMock.mockReturnValue(createSupabaseClientStub());

    const logisticsModule = await import('../../../../logistics-service/src/infrastructure/database/supabase.client');
    const manager = logisticsModule.SupabaseClientManager.getInstance();

    const client = await manager.connect();
    const health = await manager.healthCheck();

    expect(client).toBeDefined();
    expect(createClientMock).toHaveBeenCalledWith('https://logistics.supabase.local', 'anon-key');
    expect(health.status).toBe('healthy');
  });
});
