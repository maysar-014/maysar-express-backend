// Standalone test runner for bug condition exploration
// This avoids Jest's heavy startup with @prisma/client

const Module = require('module');
const originalResolve = Module._resolveFilename;
const path = require('path');
const mockPath = path.resolve(__dirname, '..', 'shared', 'database', '__tests__', '__mocks__', 'prisma-client-mock.js');
Module._resolveFilename = function (request: string, parent: any, ...args: any[]) {
  if (request === '@prisma/client') {
    return mockPath;
  }
  return originalResolve.call(this, request, parent, ...args);
};

// Now import the function
const { normalizeDatabaseUrl } = require('../shared/database/prisma-client');

let passed = 0;
let failed = 0;
const failures: string[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e: any) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${e.message}`);
    failures.push(name);
    failed++;
  }
}

function expectEqual(actual: any, expected: any, msg: string) {
  if (actual !== expected) {
    throw new Error(`${msg}: expected "${expected}", got "${actual}"`);
  }
}

function expectContains(haystack: string, needle: string, msg: string) {
  if (!haystack.includes(needle)) {
    throw new Error(`${msg}: "${needle}" not found in "${haystack}"`);
  }
}

function expectNotContains(haystack: string, needle: string, msg: string) {
  if (haystack.includes(needle)) {
    throw new Error(`${msg}: "${needle}" should not be in "${haystack}"`);
  }
}

// Save original env
const originalEnv = { ...process.env };

console.log('\nBug Condition Exploration Tests');
console.log('Validates: Requirements 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3\n');

// Test case 1: Default branch
test('default branch: decoded options should contain raw space, not %20', () => {
  delete process.env.DB_STATEMENT_TIMEOUT;
  const result = normalizeDatabaseUrl('postgresql://user:pass@host:5432/db');
  if (!result.url) throw new Error('result.url is undefined');
  const parsed = new URL(result.url);
  const decodedOptions = parsed.searchParams.get('options');
  expectEqual(decodedOptions, '-c statement_timeout=5000', 'decoded options should be -c statement_timeout=5000');
});

// Test case 2: Env var branch
test('env var branch: decoded options should contain raw space with custom timeout', () => {
  process.env.DB_STATEMENT_TIMEOUT = '3000';
  const result = normalizeDatabaseUrl('postgresql://user:pass@host:5432/db');
  if (!result.url) throw new Error('result.url is undefined');
  const parsed = new URL(result.url);
  const decodedOptions = parsed.searchParams.get('options');
  expectEqual(decodedOptions, '-c statement_timeout=3000', 'decoded options should be -c statement_timeout=3000');
});

// Test case 3: Append branch
test('append branch: appended statement_timeout should use raw space', () => {
  delete process.env.DB_STATEMENT_TIMEOUT;
  const result = normalizeDatabaseUrl('postgresql://user:pass@host:5432/db?options=-c log_statement=all');
  if (!result.url) throw new Error('result.url is undefined');
  const parsed = new URL(result.url);
  const decodedOptions = parsed.searchParams.get('options');
  expectContains(decodedOptions || '', '-c statement_timeout=5000', 'decoded options should contain -c statement_timeout=5000');
  expectNotContains(decodedOptions || '', '%20statement_timeout', 'decoded options should not contain %20statement_timeout');
});

// Test case 4: Raw URL string should not contain %2520
test('raw URL string should not contain double-encoding artifact %2520', () => {
  delete process.env.DB_STATEMENT_TIMEOUT;
  const result = normalizeDatabaseUrl('postgresql://user:pass@host:5432/db');
  if (!result.url) throw new Error('result.url is undefined');
  expectNotContains(result.url, '%2520', 'raw URL should not contain %2520');
});

// Restore env
process.env = { ...originalEnv };

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('\nFailing tests (EXPECTED - confirms bug exists):');
  failures.forEach(f => console.log(`  - ${f}`));
  process.exit(1);
} else {
  console.log('\nAll tests passed (UNEXPECTED - bug may already be fixed)');
  process.exit(0);
}
