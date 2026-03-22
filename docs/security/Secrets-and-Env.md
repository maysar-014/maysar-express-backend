# Security-Related Environment Variables (Project Implementation)

This document lists the security-sensitive environment variables that are actively used in the codebase.

## Core Security Variables

### `JWT_SECRET`
Used in:
- `C:\Users\abdal\Desktop\maysar-express-backend\shared\middleware\auth-context.middleware.ts`
- `C:\Users\abdal\Desktop\maysar-express-backend\services\catalog-service\src\middleware\security.middleware.ts`

Purpose:
- Verifies bearer tokens in `Authorization: Bearer <token>`

Validation:
- Required by `C:\Users\abdal\Desktop\maysar-express-backend\src\config\env-validation.ts`

### `JWT_EXPIRES_IN`
Used in:
- `C:\Users\abdal\Desktop\maysar-express-backend\src\config\env-validation.ts`

Purpose:
- Configures JWT expiration for token issuance (used by services that issue tokens)

Default:
- `7d`

### `ALLOWED_SERVICE_KEYS`
Used in:
- `C:\Users\abdal\Desktop\maysar-express-backend\shared\middleware\auth-context.middleware.ts`

Purpose:
- Enables service-to-service authentication via `x-service-key`
- Comma-separated list of valid keys

## CSRF-Related

### `NODE_ENV`
Used in:
- `C:\Users\abdal\Desktop\maysar-express-backend\shared\middleware\csrf.middleware.ts`

Purpose:
- In production, CSRF cookies are `secure`
- Test bypass is only allowed when `NODE_ENV !== 'production'`

### `CSRF_ALLOW_HEADER_ONLY`
Used in:
- `C:\Users\abdal\Desktop\maysar-express-backend\shared\middleware\csrf.middleware.ts`

Purpose:
- If set to `1`, header-only CSRF validation is allowed
- Intended for automated tests and non-browser clients

## Redis-Backed Security Controls

### `REDIS_URL`
Used in:
- `C:\Users\abdal\Desktop\maysar-express-backend\shared\middleware\idempotency.ts`
- `C:\Users\abdal\Desktop\maysar-express-backend\shared\middleware\redis-rate-limit.store.ts`
- `C:\Users\abdal\Desktop\maysar-express-backend\services\auth-service\src\api\middleware\rate-limiting.middleware.ts`

Purpose:
- Stores idempotency results and in-flight locks
- Stores rate-limit counters

Default:
- `redis://localhost:6379` in monolith env validation

## CORS

### `CORS_ORIGIN`
Used in:
- `C:\Users\abdal\Desktop\maysar-express-backend\src\app.ts`

Purpose:
- Controls allowed origins for the monolith CORS policy
- Comma-separated list

## 2FA Secrets

### `TWO_FACTOR_ENCRYPTION_KEY`
Used in:
- `C:\Users\abdal\Desktop\maysar-express-backend\services\auth-service\src\main.ts`

Purpose:
- Encrypts 2FA secrets stored by the auth service

Default:
- Falls back to `default-two-factor-encryption-key-32-chars!!` if not set

## Validation Source

Core env validation is defined in:
- `C:\Users\abdal\Desktop\maysar-express-backend\src\config\env-validation.ts`
