export {};

type QueryBuilder = {
  select: jest.Mock;
  eq: jest.Mock;
  gte: jest.Mock;
  lte: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
};

const buildQueryBuilder = (result: { data: any; error: any }): QueryBuilder => {
  const query: any = {};
  query.select = jest.fn(() => query);
  query.eq = jest.fn(() => query);
  query.gte = jest.fn(() => query);
  query.lte = jest.fn(() => query);
  query.order = jest.fn(async () => result);
  query.limit = jest.fn(async () => result);
  return query;
};

const buildRealtimeChannel = () => {
  const channel: any = {};
  channel.on = jest.fn(() => channel);
  channel.subscribe = jest.fn(() => ({ channel: 'subscribed' }));
  return channel;
};

const loadModule = async (options?: {
  authGetUser?: { data: { user: any }; error: any };
  authSignIn?: { data: any; error: any };
  authSignUp?: { data: any; error: any };
  authSignOut?: { error: any };
  analyticsResult?: { data: any; error: any };
  healthResult?: { data: any; error: any };
}) => {
  jest.resetModules();

  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'anon-k';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc-k';

  const analyticsResult = options?.analyticsResult ?? { data: [{ date: '2026-03-08' }], error: null };
  const healthResult = options?.healthResult ?? { data: [], error: null };

  const realtimeChannel1 = buildRealtimeChannel();
  const realtimeChannel2 = buildRealtimeChannel();
  const realtimeChannel3 = buildRealtimeChannel();
  const realtimeChannel4 = buildRealtimeChannel();
  const realtimeChannel5 = buildRealtimeChannel();
  const fromBuilder = buildQueryBuilder(analyticsResult);
  const fromBuilderForHealth = buildQueryBuilder(healthResult);
  const authGetUser = jest.fn().mockResolvedValue(options?.authGetUser ?? { data: { user: { id: 'u1' } }, error: null });
  const authSignIn = jest.fn().mockResolvedValue(options?.authSignIn ?? { data: { session: 's' }, error: null });
  const authSignUp = jest.fn().mockResolvedValue(options?.authSignUp ?? { data: { user: { id: 'u2' } }, error: null });
  const authSignOut = jest.fn().mockResolvedValue(options?.authSignOut ?? { error: null });

  const anonClient = {
    channel: jest.fn()
      .mockReturnValueOnce(realtimeChannel1)
      .mockReturnValueOnce(realtimeChannel2)
      .mockReturnValueOnce(realtimeChannel3)
      .mockReturnValueOnce(realtimeChannel4)
      .mockReturnValueOnce(realtimeChannel5),
    auth: {
      getUser: authGetUser,
      signInWithPassword: authSignIn,
      signUp: authSignUp,
      signOut: authSignOut
    },
    from: jest.fn((table: string) => {
      if (table === 'users') return fromBuilderForHealth;
      return fromBuilder;
    })
  };

  const adminClient = {
    channel: jest.fn(),
    auth: {},
    from: jest.fn()
  };

  const createClientMock = jest
    .fn()
    .mockReturnValueOnce(anonClient)
    .mockReturnValueOnce(adminClient);

  jest.doMock('@supabase/supabase-js', () => ({
    createClient: createClientMock
  }));

  const mod = await import('./client');
  return {
    mod,
    createClientMock,
    anonClient,
    adminClient,
    realtimeChannel1,
    realtimeChannel2,
    realtimeChannel3,
    realtimeChannel4,
    realtimeChannel5,
    fromBuilder,
    fromBuilderForHealth,
    authGetUser,
    authSignIn,
    authSignUp,
    authSignOut
  };
};

describe('shared/supabase/client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates anon/admin clients from environment configuration', async () => {
    const { mod, createClientMock, anonClient, adminClient } = await loadModule();

    expect(mod.supabase).toBe(anonClient);
    expect(mod.supabaseAdmin).toBe(adminClient);
    expect(createClientMock).toHaveBeenNthCalledWith(
      1,
      'https://example.supabase.co',
      'anon-k',
      expect.objectContaining({
        auth: expect.objectContaining({
          autoRefreshToken: true
        })
      })
    );
    expect(createClientMock).toHaveBeenNthCalledWith(
      2,
      'https://example.supabase.co',
      'svc-k',
      expect.objectContaining({
        auth: expect.objectContaining({
          autoRefreshToken: false
        })
      })
    );
  });

  it('creates realtime subscriptions and table change listeners for all event branches', async () => {
    const {
      mod,
      anonClient,
      realtimeChannel1,
      realtimeChannel2,
      realtimeChannel3,
      realtimeChannel4,
      realtimeChannel5
    } = await loadModule();
    const callback = jest.fn();

    const sub1 = mod.createRealtimeSubscription('orders', 'id=eq.1', callback);
    const sub2 = mod.listenToTableChanges('orders', 'INSERT', callback);
    const sub3 = mod.listenToTableChanges('orders', 'UPDATE', callback);
    const sub4 = mod.listenToTableChanges('orders', 'DELETE', callback);
    const sub5 = mod.listenToTableChanges('orders', '*', callback);

    expect(anonClient.channel).toHaveBeenCalledWith('orders_changes');
    expect(anonClient.channel).toHaveBeenCalledWith('orders_INSERT');
    expect(realtimeChannel1.on).toHaveBeenCalled();
    expect(realtimeChannel2.on).toHaveBeenCalled();
    expect(realtimeChannel3.on).toHaveBeenCalled();
    expect(realtimeChannel4.on).toHaveBeenCalled();
    expect(realtimeChannel5.on).toHaveBeenCalled();
    expect(sub1).toEqual({ channel: 'subscribed' });
    expect(sub2).toEqual({ channel: 'subscribed' });
    expect(sub3).toEqual({ channel: 'subscribed' });
    expect(sub4).toEqual({ channel: 'subscribed' });
    expect(sub5).toEqual({ channel: 'subscribed' });
  });

  it('auth helper functions return data and throw on error', async () => {
    const success = await loadModule();
    await expect(success.mod.getCurrentUser()).resolves.toEqual({ id: 'u1' });
    await expect(success.mod.signInWithEmail('a@b.com', 'pw')).resolves.toEqual({ session: 's' });
    await expect(success.mod.signUpWithEmail('a@b.com', 'pw', { role: 'buyer' })).resolves.toEqual({
      user: { id: 'u2' }
    });
    await expect(success.mod.signOut()).resolves.toBeUndefined();
    expect(success.authSignIn).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pw' });
    expect(success.authSignUp).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'pw',
      options: { data: { role: 'buyer' } }
    });

    const fail = await loadModule({
      authGetUser: { data: { user: null }, error: new Error('auth failed') },
      authSignIn: { data: null, error: new Error('sign in failed') },
      authSignUp: { data: null, error: new Error('sign up failed') },
      authSignOut: { error: new Error('sign out failed') }
    });

    await expect(fail.mod.getCurrentUser()).rejects.toThrow('auth failed');
    await expect(fail.mod.signInWithEmail('x@y.com', 'pw')).rejects.toThrow('sign in failed');
    await expect(fail.mod.signUpWithEmail('x@y.com', 'pw')).rejects.toThrow('sign up failed');
    await expect(fail.mod.signOut()).rejects.toThrow('sign out failed');
  });

  it('getAnalytics applies filtering and ordering with and without dateRange', async () => {
    const { mod, fromBuilder } = await loadModule({
      analyticsResult: { data: [{ id: 1 }], error: null }
    });

    const withRange = await mod.getAnalytics('order_analytics', 'u1', {
      start: '2026-03-01',
      end: '2026-03-08'
    });
    const withoutRange = await mod.getAnalytics('order_analytics', 'u1');

    expect(fromBuilder.select).toHaveBeenCalledWith('*');
    expect(fromBuilder.eq).toHaveBeenCalledWith('order_id', 'u1');
    expect(fromBuilder.gte).toHaveBeenCalledWith('date', '2026-03-01');
    expect(fromBuilder.lte).toHaveBeenCalledWith('date', '2026-03-08');
    expect(fromBuilder.order).toHaveBeenCalledWith('date', { ascending: false });
    expect(withRange).toEqual([{ id: 1 }]);
    expect(withoutRange).toEqual([{ id: 1 }]);
  });

  it('healthCheck reports healthy and unhealthy states', async () => {
    const healthy = await loadModule({
      healthResult: { data: [], error: null }
    });
    const unhealthy = await loadModule({
      healthResult: { data: null, error: new Error('db down') }
    });

    await expect(healthy.mod.healthCheck()).resolves.toEqual({
      healthy: true,
      error: null
    });
    await expect(unhealthy.mod.healthCheck()).resolves.toEqual({
      healthy: false,
      error: expect.any(Error)
    });
  });
});
