# Bugfix Requirements Document

## Introduction

The Maysar Express Backend crashes on startup because every Prisma database query fails with `FATAL: unrecognized configuration parameter "%20statement_timeout"`. The root cause is in `shared/database/prisma-client.ts` where the PostgreSQL `statement_timeout` connection option is set using a pre-encoded `%20` (URL-encoded space) in the `options` query parameter. The `URLSearchParams.set()` method treats the `%` in `%20` as a literal character and double-encodes it to `%2520`. When Prisma reads the URL and decodes the query parameter, it recovers `-c%20statement_timeout=5000` — a literal `%20` string rather than a space. PostgreSQL then interprets `%20statement_timeout` as the configuration parameter name instead of `statement_timeout`, and since no such parameter exists, every query fails. This affects all services using Prisma (analytics, wallet, order, catalog, chat, logistics, notification, payout, and shared saga infrastructure), with the notification-service failure being fatal and preventing the entire application from bootstrapping.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the `normalizeDatabaseUrl` function in `shared/database/prisma-client.ts` sets the `options` query parameter with the value `-c%20statement_timeout=5000` (or `-c%20statement_timeout=${envStatementTimeout}` when `DB_STATEMENT_TIMEOUT` is set) THEN the system double-encodes the `%` character via `URLSearchParams.set()`, producing `-c%2520statement_timeout=5000` in the URL string, which decodes to the literal string `-c%20statement_timeout=5000` instead of `-c statement_timeout=5000`

1.2 WHEN the double-encoded `options` parameter value reaches PostgreSQL through Prisma THEN the system rejects the query with `FATAL: unrecognized configuration parameter "%20statement_timeout"` because PostgreSQL interprets `%20statement_timeout` as the parameter name instead of `statement_timeout`

1.3 WHEN the `DB_STATEMENT_TIMEOUT` environment variable is set to a custom value (e.g., `3000`) THEN the system produces the same double-encoding artifact, setting the `options` parameter to `-c%20statement_timeout=3000` which decodes to the literal `-c%20statement_timeout=3000`

1.4 WHEN the existing `options` parameter already contains other options and `statement_timeout` is appended (the `else if` branch on line 57) THEN the system produces a concatenated value with a literal space separator followed by the double-encoded `-c%20statement_timeout=5000`, which still contains the `%20` artifact

1.5 WHEN any service using Prisma (analytics-service, wallet-service, order-service, catalog-service, chat-service, logistics-service, notification-service, payout-service, or shared saga infrastructure) attempts a database query THEN the system fails with the `%20statement_timeout` error, and the notification-service failure is fatal, causing the entire application bootstrap to fail

### Expected Behavior (Correct)

2.1 WHEN the `normalizeDatabaseUrl` function sets the `options` query parameter for `statement_timeout` THEN the system SHALL use a raw space character (not pre-encoded `%20`) in the value string, so `URLSearchParams` encodes it correctly and PostgreSQL receives `-c statement_timeout=5000`

2.2 WHEN the `DB_STATEMENT_TIMEOUT` environment variable is set to a custom value THEN the system SHALL set the `options` parameter with a raw space, producing `-c statement_timeout=${envStatementTimeout}` which PostgreSQL correctly interprets as `statement_timeout`

2.3 WHEN the existing `options` parameter already contains other options and `statement_timeout` needs to be appended THEN the system SHALL append with a raw space separator and use a raw space in the `-c` flag, producing a correctly formatted options string that PostgreSQL can parse

2.4 WHEN any service using Prisma attempts a database query THEN the system SHALL successfully connect to PostgreSQL and execute queries without the `%20statement_timeout` error, allowing all services including notification-service to initialize and the application to complete bootstrap

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `DB_STATEMENT_TIMEOUT` is not set and no `options` parameter exists in the DATABASE_URL THEN the system SHALL CONTINUE TO set a default `statement_timeout` of 5000ms (the existing default behavior, just with correct encoding)

3.2 WHEN `DB_STATEMENT_TIMEOUT` is set via environment variable THEN the system SHALL CONTINUE TO use that custom value as the timeout duration (the existing override behavior, just with correct encoding)

3.3 WHEN the DATABASE_URL already contains an `options` parameter that includes `statement_timeout` THEN the system SHALL CONTINUE TO skip adding a duplicate `statement_timeout` entry (the existing deduplication check on line 55)

3.4 WHEN `DB_CONNECTION_LIMIT` or `DB_POOL_TIMEOUT` environment variables are set THEN the system SHALL CONTINUE TO apply them to the connection URL as before (these parameters are unaffected by the encoding fix)

3.5 WHEN the database URL points to localhost/127.0.0.1 THEN the system SHALL CONTINUE TO set `sslmode=disable` and `PGSSLMODE=disable` for local development (unaffected by the encoding fix)

3.6 WHEN the `normalizeDatabaseUrl` function encounters an unparseable URL THEN the system SHALL CONTINUE TO return the original URL unchanged (the existing catch-block fallback behavior)
