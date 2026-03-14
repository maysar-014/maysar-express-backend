describe('config/environment', () => {
  const originalEnv = process.env;

  afterEach(() => {
    jest.resetModules();
    process.env = originalEnv;
  });

  it('builds config from environment variables', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      PORT: '8080',
      DATABASE_URL: 'postgres://db',
      REDIS_URL: 'redis://cache',
      REDIS_PASSWORD: 'pw',
      JWT_SECRET: 'jwt-secret',
      JWT_EXPIRES_IN: '2d',
      SMTP_HOST: 'smtp.local',
      SMTP_PORT: '465',
      SMTP_USER: 'mailer',
      SMTP_PASS: 'pass'
    };

    const { config } = require('./environment');

    expect(config).toEqual({
      env: 'production',
      port: 8080,
      database: { url: 'postgres://db' },
      redis: { url: 'redis://cache', password: 'pw' },
      jwt: { secret: 'jwt-secret', expiresIn: '2d' },
      email: {
        host: 'smtp.local',
        port: 465,
        user: 'mailer',
        pass: 'pass'
      }
    });
  });

  it('falls back to defaults when optional env vars are missing', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: '',
      PORT: '',
      JWT_SECRET: '',
      JWT_EXPIRES_IN: '',
      SMTP_PORT: ''
    };

    const { config } = require('./environment');

    expect(config.env).toBe('development');
    expect(config.port).toBe(3000);
    expect(config.jwt.secret).toBe('secret');
    expect(config.jwt.expiresIn).toBe('1d');
    expect(config.email.port).toBe(587);
  });
});

