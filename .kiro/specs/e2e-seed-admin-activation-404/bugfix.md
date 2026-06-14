# Bugfix Requirements Document

## Introduction

The E2E seed script (`scripts/seed-e2e-users.ts`) and the live E2E test helper (`tests/e2e/helpers/live-api.ts`) both call `PATCH /api/v1/admin/users/:userId/status` to activate users. This path is the standalone auth-service path (used when auth-service runs on its own port) and does not exist in the monolith. The monolith mounts auth-service routes at `/api/auth`, so the correct path is `PATCH /api/auth/admin/users/:userId/status`. As a result, every invocation of `activateUser()` / `activateUserViaAdmin()` against the monolith returns HTTP 404, causing the seed script to fail immediately and E2E tests to be unable to unlock locked test accounts.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the seed script calls `activateUser(adminToken, userId)` against the monolith THEN the system returns HTTP 404 `{"error":"Not Found"}` because the request is sent to `/api/v1/admin/users/:userId/status`

1.2 WHEN the live E2E helper calls `activateUserViaAdmin(adminToken, userId)` against the monolith THEN the system returns HTTP 404 `{"error":"Not Found"}` because the request is sent to `/api/v1/admin/users/:userId/status`

1.3 WHEN the seed script encounters the 404 response from `activateUser()` THEN the system throws `"Seed failed: Failed to activate usr_ADMIN000000000000000000001: HTTP 404 {"error":"Not Found"}"` and exits with a non-zero status code

### Expected Behavior (Correct)

2.1 WHEN the seed script calls `activateUser(adminToken, userId)` against the monolith THEN the system SHALL send the request to `/api/auth/admin/users/:userId/status` and receive a successful HTTP 2xx response

2.2 WHEN the live E2E helper calls `activateUserViaAdmin(adminToken, userId)` against the monolith THEN the system SHALL send the request to `/api/auth/admin/users/:userId/status` and receive a successful HTTP 2xx response

2.3 WHEN the seed script completes all user activations without a 404 error THEN the system SHALL print "Seed complete." and exit with status code 0

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the seed script registers a new user via `/api/auth/register` THEN the system SHALL CONTINUE TO create the user and return HTTP 201 or 409

3.2 WHEN the seed script logs in a user via `/api/auth/login` THEN the system SHALL CONTINUE TO authenticate the user and return an `accessToken`

3.3 WHEN the live E2E helper logs in a user via `loginAs()` THEN the system SHALL CONTINUE TO return a valid access token for use in subsequent test requests

3.4 WHEN the live E2E helper calls `getAdminToken()` THEN the system SHALL CONTINUE TO return a cached admin access token after the first successful login

3.5 WHEN a user's wallet balance is below the target in the seed script THEN the system SHALL CONTINUE TO top up the wallet via `/api/wallet/wallets/:userId/credit`
