import { EnvironmentConfiguration } from './environment.config';

const ORIGINAL_ENV = process.env;

describe('EnvironmentConfiguration', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete (EnvironmentConfiguration as any).instance;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
    delete (EnvironmentConfiguration as any).instance;
  });

  it('warns when required environment variables are missing and falls back to defaults', () => {
    delete process.env.DATABASE_URL;
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    const config = EnvironmentConfiguration.getInstance().getConfig();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('DATABASE_URL'));
    expect(config.database.url).toContain('postgresql://');
    warnSpy.mockRestore();
  });

  it('uses supplied env values and environment helper flags', () => {
    process.env.NODE_ENV = 'production';
    process.env.PORT = '4020';
    process.env.DATABASE_URL = 'postgresql://db';
    process.env.DB_MAX_CONNECTIONS = '33';
    process.env.REDIS_HOST = 'cache.local';
    process.env.REDIS_PORT = '6381';
    process.env.JWT_SECRET = 'jwt-secret';
    process.env.JWT_EXPIRES_IN = '4h';

    const configuration = EnvironmentConfiguration.getInstance();
    const config = configuration.getConfig();

    expect(config.nodeEnv).toBe('production');
    expect(config.port).toBe(4020);
    expect(config.database.url).toBe('postgresql://db');
    expect(config.database.maxConnections).toBe(33);
    expect(config.redis.host).toBe('cache.local');
    expect(config.redis.port).toBe(6381);
    expect(config.jwt.secret).toBe('jwt-secret');
    expect(config.jwt.expiresIn).toBe('4h');
    expect(configuration.isProduction()).toBe(true);
    expect(configuration.isDevelopment()).toBe(false);
  });
});
