# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Statement Timeout Uses Raw Space
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the double-encoding bug in `normalizeDatabaseUrl`
  - **Scoped PBT Approach**: Scope the property to concrete failing cases: default timeout (no env var, no existing options), custom timeout via env var, and appending to existing options
  - Create test file `shared/database/__tests__/normalize-database-url.bug-condition.test.ts` using Jest + fast-check
  - Test case 1 (default branch): call `normalizeDatabaseUrl("postgresql://user:pass@host:5432/db")`, decode the output URL's `options` parameter via `new URL(result.url).searchParams.get('options')`, assert the decoded value equals `-c statement_timeout=5000` (raw space, not `%20`)
  - Test case 2 (env var branch): set `process.env.DB_STATEMENT_TIMEOUT = '3000'`, call `normalizeDatabaseUrl`, assert decoded options equals `-c statement_timeout=3000`
  - Test case 3 (append branch): provide URL with existing options `postgresql://user:pass@host:5432/db?options=-c log_statement=all`, call `normalizeDatabaseUrl`, assert decoded options contains `-c statement_timeout=5000` with raw space
  - Test case 4 (raw URL string): assert the raw output URL string does NOT contain `%2520` (the double-encoding artifact)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "decoded options is `-c%20statement_timeout=5000` instead of `-c statement_timeout=5000`")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Options Parameter Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (cases where isBugCondition returns false)
  - Create test file `shared/database/__tests__/normalize-database-url.preservation.test.ts` using Jest + fast-check
  - Observe: `normalizeDatabaseUrl("postgresql://user:pass@host:5432/db")` sets `connection_limit=50` and `pool_timeout=30` on unfixed code (defaults when env vars not set)
  - Observe: setting `DB_CONNECTION_LIMIT=25` makes `connection_limit=25` in output URL on unfixed code
  - Observe: setting `DB_POOL_TIMEOUT=10` makes `pool_timeout=10` in output URL on unfixed code
  - Observe: localhost URLs (localhost, 127.0.0.1, ::1) get `sslmode=disable` on unfixed code
  - Observe: URLs with existing `statement_timeout` in options are NOT duplicated (deduplication check) on unfixed code
  - Observe: unparseable URLs (e.g., `"not-a-url"`) are returned unchanged on unfixed code
  - Write property-based tests: for all valid non-localhost PostgreSQL URLs, verify `connection_limit` and `pool_timeout` are set correctly; for localhost URLs, verify `sslmode=disable` is set; for URLs with existing statement_timeout in options, verify no duplicate is added; for unparseable URLs, verify original string is returned unchanged
  - Property-based testing generates many test cases for stronger preservation guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix for statement_timeout double-encoding in normalizeDatabaseUrl

  - [x] 3.1 Implement the fix
    - In `shared/database/prisma-client.ts`, replace `-c%20statement_timeout=` with `-c statement_timeout=` (raw space instead of pre-encoded `%20`) in three branches of `normalizeDatabaseUrl`:
      - Env var branch (line 49): `parsed.searchParams.set('options', \`-c statement_timeout=${envStatementTimeout}\`);`
      - Default branch (line 51): `parsed.searchParams.set('options', '-c statement_timeout=5000');`
      - Append branch (line 57): `parsed.searchParams.set('options', \`${existingOptions} -c statement_timeout=5000\`);`
    - Update the comment on line 46: change "PostgreSQL requires options in format: `-c%20statement_timeout=5000`" to "PostgreSQL requires options in format: `-c statement_timeout=5000` (raw space, URLSearchParams handles encoding)"
    - _Bug_Condition: isBugCondition(input) where input.url is parseable, normalizeDatabaseUrl sets options, and options value contains pre-encoded '%20' which URLSearchParams double-encodes to '%2520'_
    - _Expected_Behavior: decoded options value contains '-c statement_timeout=' (raw space) not '-c%20statement_timeout=' (literal %20)_
    - _Preservation: default 5000ms timeout, env var override, deduplication check, connection_limit/pool_timeout handling, localhost SSL disable, catch-block fallback — all unchanged_
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Statement Timeout Uses Raw Space
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: Expected Behavior Properties from design (2.1, 2.2, 2.3)_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Options Parameter Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
