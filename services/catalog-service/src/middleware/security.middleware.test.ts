import { SecurityMiddleware } from './security.middleware';

describe('SecurityMiddleware', () => {
  let middleware: SecurityMiddleware;

  beforeEach(() => {
    middleware = new SecurityMiddleware();
  });

  it('sanitizes user input and sensitive filenames', () => {
    expect(middleware.sanitizeInput('  <script>alert(1)</script><b>Hello</b>   world  ')).toBe('Hello world');
    expect(middleware.sanitizeFileName('../..//%2E%2E/evil<script>.pdf')).toBe('evil-.pdf');
  });

  it('validates common security-related formats', () => {
    expect(middleware.validateEmail('valid.user@maysar.com')).toBe(true);
    expect(middleware.validateEmail('double..dot@maysar.com')).toBe(false);

    expect(middleware.validatePhoneNumber('+255 (744) 123-456')).toBe(true);
    expect(middleware.validatePhoneNumber('123')).toBe(false);

    expect(middleware.validateUrl('https://maysar.com/docs')).toBe(true);
    expect(middleware.validateUrl('javascript:alert(1)')).toBe(false);
  });

  it('detects SQL injection and XSS patterns', () => {
    expect(middleware.containsSqlInjection(`' OR 1=1 --`)).toBe(true);
    expect(middleware.containsSqlInjection('safe-value')).toBe(false);

    expect(middleware.containsXss('<img src=x onerror=alert(1)>')).toBe(true);
    expect(middleware.containsXss('plain content')).toBe(false);
  });

  it('masks sensitive data and validates security headers', () => {
    const masked = middleware.sanitizeSensitiveData({
      username: 'ops-admin',
      password: 'secret',
      apiKey: 'ak_live_deadbeef'
    });

    expect(masked).toEqual({
      username: 'ops-admin',
      password: '***',
      apiKey: '***'
    });
    expect(middleware.validateSecurityHeader('X-Frame-Options', 'DENY')).toBe(true);
    expect(middleware.validateSecurityHeader('X-Frame-Options', 'SAMEORIGIN')).toBe(false);
  });

  it('validates JWT, API key, session tokens and crypto/hash primitives', () => {
    expect(middleware.validateJwtToken('eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjMifQ.signature')).toBe(true);
    expect(middleware.validateJwtToken('not-a-jwt')).toBe(false);

    expect(middleware.validateApiKey('ak_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).toBe(true);
    expect(middleware.validateApiKey('ak_test_short')).toBe(false);

    expect(middleware.validateSessionToken(`sess_${'a'.repeat(64)}`)).toBe(true);
    expect(middleware.validateSessionToken('sess_invalid')).toBe(false);

    expect(middleware.validateCryptoKey('-----BEGIN PUBLIC KEY-----\nKEYDATA')).toBe(true);
    expect(middleware.validateHashAlgorithm('SHA512')).toBe(true);
    expect(middleware.validateHashAlgorithm('md5')).toBe(false);
  });

  it('evaluates rate and abuse heuristics', () => {
    const now = Date.now();
    const attempts = [
      { ip: '1.1.1.1', timestamp: now - 1000 },
      { ip: '1.1.1.1', timestamp: now - 2000 },
      { ip: '1.1.1.1', timestamp: now - 3000 },
      { ip: '1.1.1.1', timestamp: now - 4000 },
      { ip: '1.1.1.1', timestamp: now - 5000 }
    ];

    expect(middleware.detectBruteForce('1.1.1.1', attempts)).toBe(true);
    expect(middleware.detectDdos(new Array(500).fill({ ip: '2.2.2.2', timestamp: now }))).toBe(true);
    expect(middleware.isRateLimited([now - 500, now - 800, now - 1000], 2, 2)).toBe(true);
  });

  it('validates content type, upload, request size, CORS rules and generated headers', () => {
    expect(
      middleware.validateFileUpload({
        name: 'invoice.pdf',
        size: 1024,
        type: 'application/pdf'
      })
    ).toBe(true);
    expect(middleware.validateRequestSize(512, 1024)).toBe(true);
    expect(middleware.validateContentType('application/json')).toBe(true);
    expect(middleware.validateContentType('text/plain')).toBe(false);

    expect(
      middleware.validateCorsRequest(
        {
          origin: 'https://maysar.com',
          method: 'GET',
          headers: {}
        },
        {
          origin: ['https://maysar.com'],
          methods: ['GET', 'POST'],
          allowedHeaders: ['Content-Type'],
          credentials: true
        }
      )
    ).toBe(true);

    const headers = middleware.generateSecurityHeaders();
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
  });

  it('returns expected secure middleware chain', () => {
    const chain = middleware.secure();
    expect(chain).toHaveLength(4);
    for (const item of chain) {
      expect(typeof item).toBe('function');
    }
  });
});
