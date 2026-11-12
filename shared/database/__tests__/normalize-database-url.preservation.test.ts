import fc from 'fast-check';
import { normalizeDatabaseUrl } from '../prisma-client';

/**
 * Preservation Property Tests
 *
 * These tests capture the EXISTING correct behavior of normalizeDatabaseUrl
 * for inputs UNRELATED to the statement_timeout double-encoding bug.
 * They verify that connection_limit, pool_timeout, sslmode, deduplication,
 * and fallback behaviors are preserved.
 *
 * EXPECTED OUTCOME ON UNFIXED CODE: All tests PASS (this confirms baseline behavior).
 * After the fix is applied, these tests must STILL PASS (no regressions).
 */

// ---------------------------------------------------------------------------
// Smart generators for valid PostgreSQL URLs
// Use only URL-safe characters to ensure generated URLs parse correctly.
// ---------------------------------------------------------------------------

// Alphanumeric-only strings for URL components that must not contain
// structural URL characters (?, #, @, /, :, etc.)
const safeUserArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => /^[a-zA-Z0-9]+$/.test(s));

const safePassArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => /^[a-zA-Z0-9]+$/.test(s));

const safeDbArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => /^[a-zA-Z0-9_]+$/.test(s));

// Hostnames: alphanumeric + dots + hyphens, excluding localhost variants
const nonLocalHostArb = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter(
    (s) =>
      /^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$/.test(s) &&
      s !== 'localhost' &&
      s !== '127.0.0.1' &&
      !s.startsWith('::1')
  );

const portArb = fc.integer({ min: 1, max: 65535 });

// Build a valid non-localhost PostgreSQL URL
const nonLocalUrlArb = fc
  .record({
    user: safeUserArb,
    pass: safePassArb,
    host: nonLocalHostArb,
    port: portArb,
    db: safeDbArb,
  })
  .map(({ user, pass, host, port, db }) => `postgresql://${user}:${pass}@${host}:${port}/${db}`);

// Build a valid localhost PostgreSQL URL (localhost or 127.0.0.1)
const localHostArb = fc.constantFrom('localhost', '127.0.0.1');
const localUrlArb = fc
  .record({
    user: safeUserArb,
    pass: safePassArb,
    host: localHostArb,
    port: portArb,
    db: safeDbArb,
  })
  .map(({ user, pass, host, port, db }) => `postgresql://${user}:${pass}@${host}:${port}/${db}`);

describe('normalizeDatabaseUrl - Preservation: Non-Options Parameter Behavior', () => {
  // Save and restore env vars we modify
  let savedStatementTimeout: string | undefined;
  let savedConnectionLimit: string | undefined;
  let savedPoolTimeout: string | undefined;

  beforeEach(() => {
    savedStatementTimeout = process.env.DB_STATEMENT_TIMEOUT;
    savedConnectionLimit = process.env.DB_CONNECTION_LIMIT;
    savedPoolTimeout = process.env.DB_POOL_TIMEOUT;
    // Clear all relevant env vars to ensure deterministic default behavior
    delete process.env.DB_STATEMENT_TIMEOUT;
    delete process.env.DB_CONNECTION_LIMIT;
    delete process.env.DB_POOL_TIMEOUT;
  });

  afterEach(() => {
    if (savedStatementTimeout !== undefined) {
      process.env.DB_STATEMENT_TIMEOUT = savedStatementTimeout;
    } else {
      delete process.env.DB_STATEMENT_TIMEOUT;
    }
    if (savedConnectionLimit !== undefined) {
      process.env.DB_CONNECTION_LIMIT = savedConnectionLimit;
    } else {
      delete process.env.DB_CONNECTION_LIMIT;
    }
    if (savedPoolTimeout !== undefined) {
      process.env.DB_POOL_TIMEOUT = savedPoolTimeout;
    } else {
      delete process.env.DB_POOL_TIMEOUT;
    }
  });

  // ---------------------------------------------------------------------------
  // 1. Connection Limit Preservation
  // ---------------------------------------------------------------------------

  // **Validates: Requirements 3.4**
  describe('Connection Limit Preservation', () => {
    test('default: connection_limit=50 in output URL when no env var set', () => {
      const result = normalizeDatabaseUrl('postgresql://user:pass@host:5432/db');
      expect(result.url).toBeDefined();

      const parsed = new URL(result.url!);
      expect(parsed.searchParams.get('connection_limit')).toBe('50');
    });

    test('env override: DB_CONNECTION_LIMIT=25 sets connection_limit=25 in output URL', () => {
      process.env.DB_CONNECTION_LIMIT = '25';
      const result = normalizeDatabaseUrl('postgresql://user:pass@host:5432/db');
      expect(result.url).toBeDefined();

      const parsed = new URL(result.url!);
      expect(parsed.searchParams.get('connection_limit')).toBe('25');
    });

    // Property-based: for any valid non-localhost PostgreSQL URL, connection_limit is set
    test(
      'property: for any valid non-localhost PostgreSQL URL, connection_limit is set in output',
      () => {
        fc.assert(
          fc.property(nonLocalUrlArb, (url) => {
            const result = normalizeDatabaseUrl(url);
            expect(result.url).toBeDefined();
            const parsed = new URL(result.url!);
            // connection_limit must always be set (default 50 or env override)
            expect(parsed.searchParams.has('connection_limit')).toBe(true);
          })
        );
      }
    );

    // Property-based: DB_CONNECTION_LIMIT env var value is reflected in output
    test(
      'property: DB_CONNECTION_LIMIT env var value is reflected in connection_limit output',
      () => {
        const limitArb = fc.integer({ min: 1, max: 200 }).map((n) => String(n));

        fc.assert(
          fc.property(limitArb, nonLocalUrlArb, (limit, url) => {
            process.env.DB_CONNECTION_LIMIT = limit;
            const result = normalizeDatabaseUrl(url);
            const parsed = new URL(result.url!);
            expect(parsed.searchParams.get('connection_limit')).toBe(limit);
          })
        );
      }
    );
  });

  // ---------------------------------------------------------------------------
  // 2. Pool Timeout Preservation
  // ---------------------------------------------------------------------------

  // **Validates: Requirements 3.4**
  describe('Pool Timeout Preservation', () => {
    test('default: pool_timeout=30 in output URL when no env var set', () => {
      const result = normalizeDatabaseUrl('postgresql://user:pass@host:5432/db');
      expect(result.url).toBeDefined();

      const parsed = new URL(result.url!);
      expect(parsed.searchParams.get('pool_timeout')).toBe('30');
    });

    test('env override: DB_POOL_TIMEOUT=10 sets pool_timeout=10 in output URL', () => {
      process.env.DB_POOL_TIMEOUT = '10';
      const result = normalizeDatabaseUrl('postgresql://user:pass@host:5432/db');
      expect(result.url).toBeDefined();

      const parsed = new URL(result.url!);
      expect(parsed.searchParams.get('pool_timeout')).toBe('10');
    });

    // Property-based: for any valid non-localhost PostgreSQL URL, pool_timeout is set
    test(
      'property: for any valid non-localhost PostgreSQL URL, pool_timeout is set in output',
      () => {
        fc.assert(
          fc.property(nonLocalUrlArb, (url) => {
            const result = normalizeDatabaseUrl(url);
            expect(result.url).toBeDefined();
            const parsed = new URL(result.url!);
            // pool_timeout must always be set (default 30 or env override)
            expect(parsed.searchParams.has('pool_timeout')).toBe(true);
          })
        );
      }
    );

    // Property-based: DB_POOL_TIMEOUT env var value is reflected in output
    test(
      'property: DB_POOL_TIMEOUT env var value is reflected in pool_timeout output',
      () => {
        const timeoutArb = fc.integer({ min: 1, max: 120 }).map((n) => String(n));

        fc.assert(
          fc.property(timeoutArb, nonLocalUrlArb, (timeout, url) => {
            process.env.DB_POOL_TIMEOUT = timeout;
            const result = normalizeDatabaseUrl(url);
            const parsed = new URL(result.url!);
            expect(parsed.searchParams.get('pool_timeout')).toBe(timeout);
          })
        );
      }
    );
  });

  // ---------------------------------------------------------------------------
  // 3. SSL Mode Preservation
  // ---------------------------------------------------------------------------

  // **Validates: Requirements 3.5**
  describe('SSL Mode Preservation', () => {
    test('localhost URL gets sslmode=disable in output', () => {
      const result = normalizeDatabaseUrl('postgresql://user:pass@localhost:5432/db');
      expect(result.url).toBeDefined();

      const parsed = new URL(result.url!);
      expect(parsed.searchParams.get('sslmode')).toBe('disable');
      expect(result.disableSsl).toBe(true);
    });

    test('127.0.0.1 URL gets sslmode=disable in output', () => {
      const result = normalizeDatabaseUrl('postgresql://user:pass@127.0.0.1:5432/db');
      expect(result.url).toBeDefined();

      const parsed = new URL(result.url!);
      expect(parsed.searchParams.get('sslmode')).toBe('disable');
      expect(result.disableSsl).toBe(true);
    });

    test('non-localhost URL (example.com) does NOT get sslmode added', () => {
      const result = normalizeDatabaseUrl('postgresql://user:pass@example.com:5432/db');
      expect(result.url).toBeDefined();

      const parsed = new URL(result.url!);
      expect(parsed.searchParams.has('sslmode')).toBe(false);
      expect(result.disableSsl).toBe(false);
    });

    // Property-based: localhost hosts always get sslmode=disable
    test(
      'property: localhost and 127.0.0.1 always get sslmode=disable',
      () => {
        fc.assert(
          fc.property(localUrlArb, (url) => {
            const result = normalizeDatabaseUrl(url);
            expect(result.url).toBeDefined();
            const parsed = new URL(result.url!);
            expect(parsed.searchParams.get('sslmode')).toBe('disable');
            expect(result.disableSsl).toBe(true);
          })
        );
      }
    );

    // Property-based: non-localhost hosts never get sslmode
    test(
      'property: non-localhost hosts never get sslmode added',
      () => {
        fc.assert(
          fc.property(nonLocalUrlArb, (url) => {
            const result = normalizeDatabaseUrl(url);
            expect(result.url).toBeDefined();
            const parsed = new URL(result.url!);
            expect(parsed.searchParams.has('sslmode')).toBe(false);
            expect(result.disableSsl).toBe(false);
          })
        );
      }
    );
  });

  // ---------------------------------------------------------------------------
  // 4. Deduplication Preservation
  // ---------------------------------------------------------------------------

  // **Validates: Requirements 3.3**
  describe('Deduplication Preservation', () => {
    test('URL with existing statement_timeout in options is NOT duplicated', () => {
      const result = normalizeDatabaseUrl(
        'postgresql://user:pass@host:5432/db?options=-c statement_timeout=9999'
      );
      expect(result.url).toBeDefined();

      const parsed = new URL(result.url!);
      const decodedOptions = parsed.searchParams.get('options');

      // The original statement_timeout=9999 must be preserved (not overwritten with 5000)
      expect(decodedOptions).toContain('statement_timeout=9999');
      // There should NOT be a second statement_timeout entry (no duplication)
      const timeoutCount = (decodedOptions?.match(/statement_timeout/g) || []).length;
      expect(timeoutCount).toBe(1);
    });

    // Property-based: for URLs with existing statement_timeout in options, no duplicate is added
    test(
      'property: URLs with existing statement_timeout in options have no duplicate added',
      () => {
        const timeoutValueArb = fc.integer({ min: 1, max: 999999 }).map((n) => String(n));

        fc.assert(
          fc.property(timeoutValueArb, nonLocalUrlArb, (timeoutValue, baseUrl) => {
            const url = `${baseUrl}?options=-c statement_timeout=${timeoutValue}`;
            const result = normalizeDatabaseUrl(url);
            expect(result.url).toBeDefined();
            const parsed = new URL(result.url!);
            const decodedOptions = parsed.searchParams.get('options');

            // Original value must be preserved
            expect(decodedOptions).toContain(`statement_timeout=${timeoutValue}`);
            // No duplicate - count occurrences must be exactly 1
            const timeoutCount = (decodedOptions?.match(/statement_timeout/g) || []).length;
            expect(timeoutCount).toBe(1);
          })
        );
      }
    );
  });

  // ---------------------------------------------------------------------------
  // 5. Fallback Preservation
  // ---------------------------------------------------------------------------

  // **Validates: Requirements 3.6**
  describe('Fallback Preservation', () => {
    test('unparseable URL "not-a-url" is returned unchanged', () => {
      const result = normalizeDatabaseUrl('not-a-url');
      expect(result.url).toBe('not-a-url');
    });

    test('empty string returns url as empty string (falsy input)', () => {
      const result = normalizeDatabaseUrl('');
      // Empty string is falsy, so normalizeDatabaseUrl returns { url: '' }
      expect(result.url).toBe('');
    });

    test('undefined input returns undefined url', () => {
      const result = normalizeDatabaseUrl(undefined);
      expect(result.url).toBeUndefined();
    });

    // Property-based: any unparseable string is returned unchanged
    test(
      'property: any unparseable string is returned unchanged',
      () => {
        // Generate strings that are NOT valid URLs (no protocol, no valid structure)
        const invalidUrlArb = fc
          .string({ minLength: 1, maxLength: 50 })
          .filter((s) => {
            try {
              // eslint-disable-next-line no-new
              new URL(s);
              return false;
            } catch {
              return true;
            }
          });

        fc.assert(
          fc.property(invalidUrlArb, (invalidUrl) => {
            const result = normalizeDatabaseUrl(invalidUrl);
            expect(result.url).toBe(invalidUrl);
          })
        );
      }
    );
  });
});
