import { AppConfiguration } from './app.config';

const ORIGINAL_ENV = process.env;

describe('AppConfiguration', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete (AppConfiguration as any).instance;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
    delete (AppConfiguration as any).instance;
  });

  it('loads defaults when environment variables are absent', () => {
    delete process.env.PORT;
    delete process.env.NODE_ENV;
    delete process.env.SERVICE_NAME;
    delete process.env.CORS_ORIGINS;
    delete process.env.CORS_CREDENTIALS;

    const config = AppConfiguration.getInstance().getConfig();

    expect(config.port).toBe(3007);
    expect(config.environment).toBe('development');
    expect(config.serviceName).toBe('logistics-service');
    expect(config.cors.origin).toEqual(['http://localhost:3000']);
    expect(config.cors.credentials).toBe(false);
  });

  it('reads env values and exposes helper methods', () => {
    process.env.PORT = '4010';
    process.env.NODE_ENV = 'production';
    process.env.SERVICE_NAME = 'logistics-x';
    process.env.SERVICE_VERSION = '2.5.0';
    process.env.CORS_ORIGINS = 'https://a.test,https://b.test';
    process.env.CORS_CREDENTIALS = 'true';

    const configuration = AppConfiguration.getInstance();
    const config = configuration.getConfig();

    expect(config.port).toBe(4010);
    expect(config.environment).toBe('production');
    expect(config.serviceName).toBe('logistics-x');
    expect(config.version).toBe('2.5.0');
    expect(config.cors.origin).toEqual(['https://a.test', 'https://b.test']);
    expect(config.cors.credentials).toBe(true);
    expect(configuration.isProduction()).toBe(true);
    expect(configuration.isDevelopment()).toBe(false);
    expect(configuration.getServiceInfo()).toEqual({
      name: 'logistics-x',
      version: '2.5.0',
      environment: 'production',
      port: 4010
    });
  });
});
