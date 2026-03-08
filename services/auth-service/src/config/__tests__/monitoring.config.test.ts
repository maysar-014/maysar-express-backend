describe('monitoring config', () => {
  const previousEnv = { ...process.env };

  const loadConfigModule = async () => {
    jest.resetModules();
    return import('../monitoring.config');
  };

  afterEach(() => {
    process.env = { ...previousEnv };
    jest.resetModules();
  });

  it('uses development defaults when environment overrides are absent', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.LOG_LEVEL;
    delete process.env.METRICS_ENABLED;
    delete process.env.APM_ENABLED;

    const { monitoringConfig } = await loadConfigModule();

    expect(monitoringConfig.logging.level).toBe('info');
    expect(monitoringConfig.logging.console.enabled).toBe(true);
    expect(monitoringConfig.logging.file.enabled).toBe(false);
    expect(monitoringConfig.metrics.enabled).toBe(true);
    expect(monitoringConfig.alerting.enabled).toBe(false);
    expect(monitoringConfig.apm.enabled).toBe(false);
  });

  it('applies production overrides for logging, health, and APM settings', async () => {
    process.env.NODE_ENV = 'production';
    process.env.LOG_LEVEL = 'debug';
    process.env.METRICS_ENABLED = 'false';
    process.env.HEALTH_CHECK_ENABLED = 'false';
    process.env.APM_ENABLED = 'true';
    process.env.ADMIN_EMAIL = 'admin@example.com';
    process.env.SMTP_PORT = '2525';
    process.env.SMTP_SECURE = 'true';

    const { monitoringConfig } = await loadConfigModule();

    expect(monitoringConfig.logging.level).toBe('debug');
    expect(monitoringConfig.logging.console.enabled).toBe(false);
    expect(monitoringConfig.logging.file.enabled).toBe(true);
    expect(monitoringConfig.metrics.enabled).toBe(false);
    expect(monitoringConfig.healthCheck.enabled).toBe(false);
    expect(monitoringConfig.alerting.enabled).toBe(true);
    expect(monitoringConfig.alerting.email.recipients).toEqual(['admin@example.com']);
    expect(monitoringConfig.alerting.email.smtp.port).toBe(2525);
    expect(monitoringConfig.alerting.email.smtp.secure).toBe(true);
    expect(monitoringConfig.apm.enabled).toBe(true);
  });

  it('exports stable enums and threshold values', async () => {
    const {
      LogLevel,
      MetricType,
      AlertSeverity,
      MonitoringEventType,
      monitoringThresholds
    } = await loadConfigModule();

    expect(LogLevel.ERROR).toBe('error');
    expect(MetricType.HISTOGRAM).toBe('histogram');
    expect(AlertSeverity.CRITICAL).toBe('critical');
    expect(MonitoringEventType.HEALTH_CHECK_FAILURE).toBe('health_check_failure');
    expect(monitoringThresholds.responseTime.critical).toBe(2000);
    expect(monitoringThresholds.connectionPool.usage.max).toBe(0.95);
    expect(monitoringThresholds.queue.length.warning).toBe(100);
  });
});
