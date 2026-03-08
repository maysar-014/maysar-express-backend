describe('database config', () => {
  const previousEnv = { ...process.env };

  const loadConfigModule = async () => {
    jest.resetModules();
    return import('../database.config');
  };

  afterEach(() => {
    process.env = { ...previousEnv };
    jest.resetModules();
  });

  it('applies environment overrides in development mode', async () => {
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_SSL = 'true';
    process.env.DATABASE_MAX_CONNECTIONS = '35';

    const { databaseConfig } = await loadConfigModule();

    expect(databaseConfig.ssl).toBe(true);
    expect(databaseConfig.maxConnections).toBe(35);
    expect(databaseConfig.prisma.log).toEqual(['query', 'info', 'warn', 'error']);
    expect(databaseConfig.prisma.errorFormat).toBe('pretty');
  });

  it('uses production-oriented defaults when running in production', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DATABASE_MAX_CONNECTIONS;
    delete process.env.DATABASE_SSL;

    const { databaseConfig, databaseMonitoringConfig } = await loadConfigModule();

    expect(databaseConfig.maxConnections).toBe(20);
    expect(databaseConfig.ssl).toBe(false);
    expect(databaseConfig.prisma.log).toEqual(['warn', 'error']);
    expect(databaseConfig.prisma.errorFormat).toBe('colorless');
    expect(databaseMonitoringConfig.queryMetrics.enabled).toBe(true);
  });

  it('exposes stable health and monitoring thresholds', async () => {
    const { databaseHealthConfig, databaseMonitoringConfig } = await loadConfigModule();

    expect(databaseHealthConfig.healthCheckQuery).toBe('SELECT 1');
    expect(databaseHealthConfig.maxLatencyMs).toBe(1000);
    expect(databaseMonitoringConfig.poolMonitoring.interval).toBe(60000);
    expect(databaseMonitoringConfig.slowQueryThreshold).toBe(1000);
  });
});
