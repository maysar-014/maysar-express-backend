# Prisma Statement Timeout Encoding Fix Bugfix Design

## Overview

The Maysar Express Backend crashes on startup because every Prisma database query fails with `FATAL: unrecognized configuration parameter "%20statement_timeout"`. The root cause is in the `normalizeDatabaseUrl` function in `shared/database/prisma-client.ts` where the PostgreSQL `statement_timeout` connection option is set using a pre-encoded `%20` (URL-encoded space) in the `options` query parameter value: `-c%20statement_timeout=5000`. When `URLSearchParams.set()` processes this value, it treats the `%` in `%20` as a literal character and double-encodes it to `%2520`. The fix is to use a raw space character instead of the pre-encoded `%20`, letting `URLSearchParams` handle the URL encoding naturally. This is a single-line change across three code branches in the same function.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when `normalizeDatabaseUrl` uses pre-encoded `%20` in the `options` query parameter value, causing `URLSearchParams.set()` to double-encode the `%` to `%2520`
- **Property (P)**: The desired behavior - the decoded `options` parameter value should contain a raw space (`-c statement_timeout=5000`) not a literal `%20` (`-c%20statement_timeout=5000`)
- **Preservation**: Existing behaviors that must remain unchanged by the fix: default 5000ms timeout, env var override, deduplication check, connection_limit/pool_timeout handling, localhost SSL disable, and catch-block fallback
- **normalizeDatabaseUrl**: The function in `shared/database/prisma-client.ts` that normalizes the database URL by setting SSL mode, pool sizing, and statement timeout parameters
- **URLSearchParams**: The Web API class used internally by `URL` to manage query parameters; its `set()` method encodes values, so pre-encoded values get double-encoded
- **Double Encoding**: When an already URL-encoded value (e.g., `%20`) is passed to `URLSearchParams.set()`, the `%` character is treated as literal text and re-encoded to `%2520`

## Bug Details

### Bug Condition

The bug manifests when the `normalizeDatabaseUrl` function sets the `options` query parameter using a pre-encoded `%20` instead of a raw space character. The `URLSearchParams.set()` method treats the `%` in `%20` as a literal character and double-encodes it to `%2520`. When the URL string is later decoded, it produces the literal string `-c%20statement_timeout=5000` instead of `-c statement_timeout=5000`, which PostgreSQL rejects.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { url: string, envStatementTimeout: string | undefined, existingOptions: string | undefined }
  OUTPUT: boolean
  
  RETURN input.url is parseable as URL
         AND normalizeDatabaseUrl sets options parameter
         AND the options value contains pre-encoded '%20'
         AND URLSearchParams.set() double-encodes '%' to '%2520'
         AND decoded options value contains literal '%20statement_timeout'
         instead of ' statement_timeout'
END FUNCTION
```

### Examples

- **Default timeout (no env var, no existing options)**: `normalizeDatabaseUrl("postgresql://user:pass@host:5432/db")` produces options=`-c%2520statement_timeout%3D5000` in the URL string. When decoded, the options value is `-c%20statement_timeout=5000` — a literal `%20` instead of a space. PostgreSQL sees parameter name `%20statement_timeout` and fails. Expected: options value decodes to `-c statement_timeout=5000`.

- **Custom timeout via env var**: With `DB_STATEMENT_TIMEOUT=3000`, `normalizeDatabaseUrl("postgresql://user:pass@host:5432/db")` produces options value `-c%20statement_timeout=3000` when decoded. Same double-encoding artifact. Expected: decodes to `-c statement_timeout=3000`.

- **Appending to existing options**: With `DATABASE_URL` containing `?options=-c%20some_param=100`, `normalizeDatabaseUrl` appends `-c%20statement_timeout=5000` with a space separator. The appended portion still has the `%20` artifact. Expected: appends `-c statement_timeout=5000` with raw spaces.

- **Edge case - options already contains statement_timeout**: If `DATABASE_URL` already has `?options=-c%20statement_timeout=9999`, the deduplication check on line 55 skips adding a new one. This branch is unaffected by the bug but must remain functional after the fix.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Default statement_timeout of 5000ms must still be set when `DB_STATEMENT_TIMEOUT` is not set and no `options` parameter exists
- Custom timeout from `DB_STATEMENT_TIMEOUT` env var must still be respected and used as the timeout value
- Deduplication check must still skip adding `statement_timeout` when the `options` parameter already contains it
- `DB_CONNECTION_LIMIT` and `DB_POOL_TIMEOUT` env vars must still be applied to the connection URL as before
- Localhost connections must still get `sslmode=disable` and `PGSSLMODE=disable`
- Unparseable URLs must still be returned unchanged via the catch-block fallback

**Scope:**
All inputs that do NOT involve setting the `options` query parameter for `statement_timeout` should be completely unaffected by this fix. This includes:
- `connection_limit` parameter handling
- `pool_timeout` parameter handling
- `sslmode` parameter handling
- Catch-block fallback for unparseable URLs
- The singleton enforcement and global prisma client logic in `createPrismaClient`

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is confirmed:

1. **Pre-encoded `%20` in options value**: The code uses `-c%20statement_timeout=5000` as the value passed to `URLSearchParams.set('options', ...)`. The `%20` is URL-encoding for a space, but `URLSearchParams.set()` already handles encoding. It sees `%` as a literal character that needs encoding, producing `%2520` in the output.

   - Line 51 (default branch): `parsed.searchParams.set('options', '-c%20statement_timeout=5000');`
   - Line 49 (env var branch): `parsed.searchParams.set('options', \`-c%20statement_timeout=${envStatementTimeout}\`);`
   - Line 57 (append branch): `parsed.searchParams.set('options', \`${existingOptions} -c%20statement_timeout=5000\`);`

2. **Misunderstanding of URLSearchParams encoding behavior**: The developer likely assumed that `%20` would pass through `URLSearchParams.set()` unchanged, or expected the URL class to recognize it as an already-encoded value. In reality, `URLSearchParams` treats all values as raw strings and encodes special characters including `%`.

3. **No validation of output URL**: The function does not verify the final URL string for encoding correctness, so the double-encoding goes unnoticed until PostgreSQL rejects the connection.

## Correctness Properties

Property 1: Bug Condition - Statement Timeout Uses Raw Space

_For any_ input where the `normalizeDatabaseUrl` function sets the `options` query parameter for `statement_timeout` (whether via default, env var, or append branch), the fixed function SHALL produce a URL where the decoded `options` value contains a raw space character before `statement_timeout` (e.g., `-c statement_timeout=5000`), not a literal `%20`.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Non-Options Parameter Behavior

_For any_ input where the bug condition does NOT hold (inputs involving `connection_limit`, `pool_timeout`, `sslmode`, unparseable URLs, or URLs with existing `statement_timeout` in options), the fixed function SHALL produce the same result as the original function, preserving all existing functionality for connection pool sizing, SSL handling, deduplication, and fallback behavior.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `shared/database/prisma-client.ts`

**Function**: `normalizeDatabaseUrl`

**Specific Changes**:
1. **Default branch (line 51)**: Replace `-c%20statement_timeout=5000` with `-c statement_timeout=5000` (raw space instead of `%20`)
   - Before: `parsed.searchParams.set('options', '-c%20statement_timeout=5000');`
   - After: `parsed.searchParams.set('options', '-c statement_timeout=5000');`

2. **Env var branch (line 49)**: Replace `-c%20statement_timeout=${envStatementTimeout}` with `-c statement_timeout=${envStatementTimeout}` (raw space instead of `%20`)
   - Before: `parsed.searchParams.set('options', \`-c%20statement_timeout=${envStatementTimeout}\`);`
   - After: `parsed.searchParams.set('options', \`-c statement_timeout=${envStatementTimeout}\`);`

3. **Append branch (line 57)**: Replace `-c%20statement_timeout=5000` with `-c statement_timeout=5000` (raw space instead of `%20`)
   - Before: `parsed.searchParams.set('options', \`${existingOptions} -c%20statement_timeout=5000\`);`
   - After: `parsed.searchParams.set('options', \`${existingOptions} -c statement_timeout=5000\`);`

4. **Comment update (line 46)**: Update the comment that says "PostgreSQL requires options in format: `-c%20statement_timeout=5000`" to reflect the correct approach: "PostgreSQL requires options in format: `-c statement_timeout=5000` (raw space, URLSearchParams handles encoding)"

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that call `normalizeDatabaseUrl` with various inputs and inspect the output URL's `options` parameter for double-encoding artifacts (`%2520` in the raw URL string or `%20` in the decoded value). Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Default Options Test**: Call `normalizeDatabaseUrl("postgresql://user:pass@host:5432/db")` and decode the output URL's `options` parameter. On unfixed code, the decoded value will be `-c%20statement_timeout=5000` (literal `%20`) instead of `-c statement_timeout=5000` (raw space). (will fail on unfixed code)
2. **Custom Timeout Test**: Set `DB_STATEMENT_TIMEOUT=3000`, call `normalizeDatabaseUrl`, and check decoded options. On unfixed code, decoded value will be `-c%20statement_timeout=3000`. (will fail on unfixed code)
3. **Append Options Test**: Provide a URL with existing options (e.g., `?options=-c%20log_statement=all`), call `normalizeDatabaseUrl`, and check decoded options. On unfixed code, the appended portion will contain literal `%20`. (will fail on unfixed code)
4. **Raw URL String Test**: Inspect the raw output URL string for `%2520` artifact. On unfixed code, the URL string will contain `%2520statement_timeout` instead of `%20statement_timeout`. (will fail on unfixed code)

**Expected Counterexamples**:
- Output URL string contains `%2520statement_timeout` (double-encoded `%`)
- Decoded options value contains literal `%20statement_timeout` instead of ` statement_timeout`
- Possible causes: `URLSearchParams.set()` double-encoding pre-encoded values

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := normalizeDatabaseUrl_fixed(input)
  decodedOptions := decodeURIComponent(new URL(result.url).searchParams.get('options'))
  ASSERT decodedOptions CONTAINS "-c statement_timeout="
  ASSERT decodedOptions DOES NOT CONTAIN "%20statement_timeout"
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT normalizeDatabaseUrl_original(input) = normalizeDatabaseUrl_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for connection_limit, pool_timeout, sslmode, deduplication, and fallback, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Connection Limit Preservation**: Verify `connection_limit` parameter is set correctly from env var or default, unaffected by the encoding fix
2. **Pool Timeout Preservation**: Verify `pool_timeout` parameter is set correctly from env var or default, unaffected by the encoding fix
3. **SSL Mode Preservation**: Verify localhost URLs still get `sslmode=disable`, unaffected by the encoding fix
4. **Deduplication Preservation**: Verify URLs with existing `statement_timeout` in options are not duplicated, unaffected by the encoding fix
5. **Fallback Preservation**: Verify unparseable URLs are returned unchanged, unaffected by the encoding fix

### Unit Tests

- Test that default `options` parameter uses raw space (no `%20` in decoded value)
- Test that `DB_STATEMENT_TIMEOUT` env var produces correctly encoded options with raw space
- Test that appending to existing options uses raw space in the `-c` flag portion
- Test that deduplication check still works when options already contains `statement_timeout`
- Test that `connection_limit` and `pool_timeout` are still applied correctly
- Test that localhost URLs still get `sslmode=disable`
- Test that unparseable URLs return original string unchanged

### Property-Based Tests

- Generate random valid PostgreSQL URLs and verify the decoded `options` parameter always contains a raw space before `statement_timeout`, never `%20`
- Generate random `DB_STATEMENT_TIMEOUT` values (numeric strings) and verify the decoded options contain the correct timeout with raw space
- Generate random URLs with existing `connection_limit` and `pool_timeout` parameters and verify those values are preserved exactly after the fix
- Generate random localhost and non-localhost URLs and verify SSL mode handling is unchanged

### Integration Tests

- Test full `createPrismaClient` flow with a valid DATABASE_URL and verify the normalized URL passed to Prisma has correct `options` encoding
- Test that setting `DB_STATEMENT_TIMEOUT` env var produces a URL Prisma can use to connect to PostgreSQL without the `%20statement_timeout` error
- Test that services using `createPrismaClient` can successfully connect when the fix is applied (smoke test against a test database if available)
