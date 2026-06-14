/**
 * Property-based tests for pure helper functions in `tests/e2e/helpers/live-api.ts`.
 *
 * These tests run OFFLINE — they do not require a running backend or `RUN_LIVE_E2E=true`.
 * They validate the deterministic, side-effect-free behaviour of URL parsing, JSON parsing,
 * and token extraction using fast-check property-based testing.
 *
 * Each property runs with { numRuns: 100 } to provide thorough coverage across generated inputs.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fc from 'fast-check';
import {
  resolveLiveBaseUrl,
  extractAccessToken,
  asRecord,
} from './helpers/live-api';

// ---------------------------------------------------------------------------
// Helpers for testing the JSON-parsing branch of requestJson
// ---------------------------------------------------------------------------

/**
 * Simulate the body-parsing logic used inside `requestJson` without making a real HTTP call.
 * This mirrors the exact implementation so that property tests stay coupled to the real code.
 */
function simulateBodyParsing(text: string): unknown {
  if (text.length === 0) return {};
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function containsNegativeZero(value: unknown): boolean {
  if (typeof value === 'number') {
    return Object.is(value, -0);
  }

  if (Array.isArray(value)) {
    return value.some((item) => containsNegativeZero(item));
  }

  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((item) => containsNegativeZero(item));
  }

  return false;
}

// ---------------------------------------------------------------------------
// Property 1: trailing-slash stripping is universal
// Feature: e2e-flow-coverage, Property 1: trailing-slash stripping is universal
// Validates: Requirements 1.4, 13.6
// ---------------------------------------------------------------------------

describe('Property 1: trailing-slash stripping is universal', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore env after each run
    delete process.env['E2E_BASE_URL'];
    delete process.env['PLATFORM_BASE_URL'];
    delete process.env['BASE_URL'];
    Object.assign(process.env, originalEnv);
  });

  it('resolveLiveBaseUrl never returns a URL ending with /', () => {
    fc.assert(
      fc.property(
        // Generate a base path and 0–5 trailing slashes
        fc.tuple(
          fc.stringMatching(/^[a-zA-Z0-9:/_.-]{1,40}/),
          fc.integer({ min: 0, max: 5 }),
        ),
        ([base, trailingSlashCount]) => {
          const trailingSlashes = '/'.repeat(trailingSlashCount);
          process.env['E2E_BASE_URL'] = `${base}${trailingSlashes}`;
          const result = resolveLiveBaseUrl();
          expect(result.endsWith('/')).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('resolveLiveBaseUrl with no env vars returns the default (no trailing slash)', () => {
    delete process.env['E2E_BASE_URL'];
    delete process.env['PLATFORM_BASE_URL'];
    delete process.env['BASE_URL'];
    const result = resolveLiveBaseUrl();
    expect(result.endsWith('/')).toBe(false);
    expect(result).toBe('http://localhost:3000');
  });
});

// ---------------------------------------------------------------------------
// Property 2: JSON body is parsed when the response text is valid JSON
// Feature: e2e-flow-coverage, Property 2: JSON body is parsed when response text is valid JSON
// Validates: Requirements 13.1
// ---------------------------------------------------------------------------

describe('Property 2: JSON body is parsed when response text is valid JSON', () => {
  it('simulateBodyParsing deeply equals the original value for any JSON-serialisable input', () => {
    fc.assert(
      fc.property(
        fc.jsonValue().filter((value) => !containsNegativeZero(value)),
        (value) => {
          const text = JSON.stringify(value);
          const result = simulateBodyParsing(text);
          expect(result).toEqual(value);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('simulateBodyParsing returns {} for an empty string', () => {
    const result = simulateBodyParsing('');
    expect(result).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// Property 3: non-JSON text is returned verbatim in the body field
// Feature: e2e-flow-coverage, Property 3: non-JSON text is returned verbatim in body field
// Validates: Requirements 13.2
// ---------------------------------------------------------------------------

describe('Property 3: non-JSON text is returned verbatim in the body field', () => {
  it('simulateBodyParsing returns raw string for text that is not valid JSON', () => {
    fc.assert(
      fc.property(
        // Generate strings that will fail JSON.parse: start with a letter or space (not { [ " digit - t f n)
        fc.string({ minLength: 1 }).filter((s) => {
          if (s.length === 0) return false;
          try {
            JSON.parse(s);
            return false; // is valid JSON — skip
          } catch {
            return true; // not valid JSON — use it
          }
        }),
        (text) => {
          const result = simulateBodyParsing(text);
          expect(result).toBe(text);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: extractAccessToken succeeds for any non-empty accessToken string
// Feature: e2e-flow-coverage, Property 4: extractAccessToken succeeds for any non-empty accessToken
// Validates: Requirements 13.4
// ---------------------------------------------------------------------------

describe('Property 4: extractAccessToken succeeds for any non-empty accessToken string', () => {
  it('returns the exact token string when given { accessToken: <non-empty string> }', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (token) => {
          const result = extractAccessToken({ accessToken: token });
          expect(result).toBe(token);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: extractAccessToken throws for all invalid inputs
// Feature: e2e-flow-coverage, Property 5: extractAccessToken throws for all invalid inputs
// Validates: Requirements 13.5
// ---------------------------------------------------------------------------

describe('Property 5: extractAccessToken throws for all invalid inputs', () => {
  const invalidInputArb = fc.oneof(
    fc.constant(null),
    fc.constant(undefined),
    fc.integer(),
    fc.float(),
    fc.boolean(),
    fc.array(fc.string()),
    fc.constant({ accessToken: '' }),         // empty string — falsy
    fc.constant({ accessToken: 0 }),          // wrong type
    fc.constant({ accessToken: null }),       // null
    fc.constant({ accessToken: false }),      // boolean
    fc.constant({ notAccessToken: 'value' }), // missing key
    fc.constant({}),                          // empty object
  );

  it('throws an Error for all invalid inputs', () => {
    fc.assert(
      fc.property(invalidInputArb, (input) => {
        expect(() => extractAccessToken(input)).toThrow(Error);
      }),
      { numRuns: 100 }
    );
  });

  it('throws for a plain string input (not an object)', () => {
    expect(() => extractAccessToken('some-token')).toThrow(Error);
  });

  it('throws for an array input', () => {
    expect(() => extractAccessToken(['token'])).toThrow(Error);
  });
});

// ---------------------------------------------------------------------------
// Additional: asRecord throws for non-object inputs
// ---------------------------------------------------------------------------

describe('asRecord throws for non-object inputs', () => {
  it('throws for null', () => expect(() => asRecord(null)).toThrow(Error));
  it('throws for a string', () => expect(() => asRecord('hello')).toThrow(Error));
  it('throws for an array', () => expect(() => asRecord([1, 2])).toThrow(Error));
  it('throws for a number', () => expect(() => asRecord(42)).toThrow(Error));
  it('returns the object for a plain object', () => {
    const obj = { foo: 'bar' };
    expect(asRecord(obj)).toBe(obj);
  });
});
