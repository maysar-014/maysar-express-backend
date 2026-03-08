describe('security config', () => {
  const previousEnv = { ...process.env };

  const loadConfigModule = async () => {
    jest.resetModules();
    return import('../security.config');
  };

  afterEach(() => {
    process.env = { ...previousEnv };
    jest.resetModules();
  });

  it('reads environment overrides for numeric security settings', async () => {
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.RATE_LIMIT_MAX_REQUESTS = '77';
    process.env.PASSWORD_MIN_LENGTH = '12';
    process.env.MAX_FAILED_LOGIN_ATTEMPTS = '9';

    const { securityConfig } = await loadConfigModule();

    expect(securityConfig.rateLimit.windowMs).toBe(60000);
    expect(securityConfig.rateLimit.maxRequests).toBe(77);
    expect(securityConfig.password.minLength).toBe(12);
    expect(securityConfig.account.maxFailedLoginAttempts).toBe(9);
  });

  it('exposes stable enum values for security event and risk classification', async () => {
    const { SecurityEventType, SecurityRiskLevel } = await loadConfigModule();

    expect(SecurityEventType.LOGIN_SUCCESS).toBe('login_success');
    expect(SecurityEventType.BRUTE_FORCE_ATTEMPT).toBe('brute_force_attempt');
    expect(SecurityRiskLevel.LOW).toBe('low');
    expect(SecurityRiskLevel.CRITICAL).toBe('critical');
  });

  it('uses sane defaults when environment overrides are missing', async () => {
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.JWT_ISSUER;

    const { securityConfig } = await loadConfigModule();

    expect(securityConfig.rateLimit.windowMs).toBe(900000);
    expect(securityConfig.jwt.issuer).toBe('maysar-auth-service');
  });
});
