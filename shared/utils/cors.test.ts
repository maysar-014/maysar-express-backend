import {
  createTrustedCorsOptions,
  createTrustedCorsOriginDelegate,
  getTrustedCorsOrigins,
  isTrustedCorsOrigin
} from './cors';

describe('shared/utils/cors', () => {
  const previousEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...previousEnv };
    jest.restoreAllMocks();
  });

  it('allows trusted app origins and rejects untrusted ones', () => {
    process.env.CORS_ORIGIN = 'https://dashboard.example.com';

    const allowedOrigins = getTrustedCorsOrigins(['https://extra.example.com']);

    expect(allowedOrigins).toEqual(
      expect.arrayContaining([
        'https://maysar-web-app-maysar-014-maysar-014s-projects.vercel.app',
        'https://dashboard.example.com',
        'https://extra.example.com',
        'http://localhost:3000'
      ])
    );
    expect(isTrustedCorsOrigin('https://maysar.co.tz', allowedOrigins)).toBe(true);
    expect(isTrustedCorsOrigin('https://maysar-web-app-maysar-014-maysar-014s-projects.vercel.app', allowedOrigins)).toBe(true);
    expect(isTrustedCorsOrigin('https://app-staging.maysar.co.tz', allowedOrigins)).toBe(true);
    expect(isTrustedCorsOrigin('http://localhost:3000', allowedOrigins)).toBe(true);
    expect(isTrustedCorsOrigin('https://evil.example.com', allowedOrigins)).toBe(false);
  });

  it('creates a credentialed CORS delegate for trusted origins', () => {
    const corsOptions = createTrustedCorsOptions(['https://extra.example.com']);

    expect(corsOptions.credentials).toBe(true);
    expect(typeof corsOptions.origin).toBe('function');

    const originDelegate = createTrustedCorsOriginDelegate(['https://extra.example.com']);

    originDelegate('https://extra.example.com', (error, allow) => {
      expect(error).toBeNull();
      expect(allow).toBe(true);
    });

    originDelegate('https://evil.example.com', (error, allow) => {
      expect(error).toBeInstanceOf(Error);
      expect(allow).toBeUndefined();
    });

    originDelegate(undefined, (error, allow) => {
      expect(error).toBeNull();
      expect(allow).toBe(true);
    });
  });
});
