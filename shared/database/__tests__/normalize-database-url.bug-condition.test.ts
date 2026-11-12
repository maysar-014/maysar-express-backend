import { normalizeDatabaseUrl } from '../prisma-client';

/**
 * Bug Condition Exploration Tests
 *
 * These tests surface the double-encoding bug in normalizeDatabaseUrl.
 * The function uses pre-encoded `%20` (URL-encoded space) in the `options`
 * query parameter value: `-c%20statement_timeout=5000`. When URLSearchParams.set()
 * processes this, it double-encodes the `%` to `%2520`. When decoded, it produces
 * a literal `%20` instead of a raw space.
 *
 * EXPECTED OUTCOME ON UNFIXED CODE: All tests FAIL (this confirms the bug exists).
 * After the fix is applied, these tests will PASS.
 */

describe('normalizeDatabaseUrl - Bug Condition: Statement Timeout Uses Raw Space', () => {
  // Save and restore env vars we modify
  let savedStatementTimeout: string | undefined;
  let savedConnectionLimit: string | undefined;
  let savedPoolTimeout: string | undefined;

  beforeEach(() => {
    savedStatementTimeout = process.env.DB_STATEMENT_TIMEOUT;
    savedConnectionLimit = process.env.DB_CONNECTION_LIMIT;
    savedPoolTimeout = process.env.DB_POOL_TIMEOUT;
    // Clear all relevant env vars to ensure deterministic default branch behavior
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

  // **Validates: Requirements 1.1, 2.1**
  // Test case 1 (default branch): no env var, no existing options
  test('default branch: decoded options equals "-c statement_timeout=5000" (raw space, not %20)', () => {
    const result = normalizeDatabaseUrl('postgresql://user:pass@host:5432/db');
    expect(result.url).toBeDefined();

    const parsed = new URL(result.url!);
    const decodedOptions = parsed.searchParams.get('options');

    // On unfixed code: decodedOptions is "-c%20statement_timeout=5000" (literal %20) — FAILS
    // On fixed code: decodedOptions is "-c statement_timeout=5000" (raw space) — PASSES
    expect(decodedOptions).toBe('-c statement_timeout=5000');
  });

  // **Validates: Requirements 1.3, 2.2**
  // Test case 2 (env var branch): custom timeout via DB_STATEMENT_TIMEOUT
  test('env var branch: decoded options equals "-c statement_timeout=3000" when DB_STATEMENT_TIMEOUT=3000', () => {
    process.env.DB_STATEMENT_TIMEOUT = '3000';
    const result = normalizeDatabaseUrl('postgresql://user:pass@host:5432/db');
    expect(result.url).toBeDefined();

    const parsed = new URL(result.url!);
    const decodedOptions = parsed.searchParams.get('options');

    // On unfixed code: decodedOptions is "-c%20statement_timeout=3000" (literal %20) — FAILS
    // On fixed code: decodedOptions is "-c statement_timeout=3000" (raw space) — PASSES
    expect(decodedOptions).toBe('-c statement_timeout=3000');
  });

  // **Validates: Requirements 1.4, 2.3**
  // Test case 3 (append branch): URL with existing options gets statement_timeout appended
  test('append branch: decoded options contains "-c statement_timeout=5000" with raw space when appending to existing options', () => {
    const result = normalizeDatabaseUrl(
      'postgresql://user:pass@host:5432/db?options=-c log_statement=all'
    );
    expect(result.url).toBeDefined();

    const parsed = new URL(result.url!);
    const decodedOptions = parsed.searchParams.get('options');

    // On unfixed code: decodedOptions contains "-c%20statement_timeout=5000" (literal %20) — FAILS
    // On fixed code: decodedOptions contains "-c statement_timeout=5000" (raw space) — PASSES
    expect(decodedOptions).toContain('-c statement_timeout=5000');
  });

  // **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3**
  // Test case 4 (raw URL string): the raw output URL string must NOT contain %2520 (double-encoding artifact)
  test('raw URL string: output does NOT contain "%2520" (the double-encoding artifact)', () => {
    const result = normalizeDatabaseUrl('postgresql://user:pass@host:5432/db');
    expect(result.url).toBeDefined();

    const rawUrl = result.url!;

    // On unfixed code: rawUrl contains "%2520statement_timeout" (double-encoded %) — FAILS
    // On fixed code: rawUrl does NOT contain "%2520" — PASSES
    expect(rawUrl).not.toContain('%2520');
  });
});
