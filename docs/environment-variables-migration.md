# Environment Variables Migration

This document tracks the migration of service-level environment variables to the project root `.env.example`.

## Migration Strategy
- Variables are prefixed with the service name in uppercase: `{SERVICE_NAME}_{VARIABLE_NAME}`.
- Common variables (like `DATABASE_URL`, `REDIS_URL`) remain at the global level if they are truly shared.
- Service-specific database connections or secrets are always prefixed.

## Mappings

### Global / Shared
- `DATABASE_URL`
- `REDIS_URL`
- `LOG_LEVEL`
- `NODE_ENV`

### User Service
- `USER_SERVICE_JWT_SECRET`
- `USER_SERVICE_JWT_EXPIRES_IN`
- `USER_SERVICE_PRISMA_LOG_LEVEL`

### Auth Service
- `AUTH_SERVICE_SESSION_SECRET`
- `AUTH_SERVICE_TOKEN_EXPIRY`

### Catalog Service
- `CATALOG_SERVICE_DB_HOST`
- `CATALOG_SERVICE_DB_PORT`
- `CATALOG_SERVICE_DB_NAME`
- `CATALOG_SERVICE_DB_USER`
- `CATALOG_SERVICE_DB_PASSWORD`

### SMS Service
- `SMS_SERVICE_API_KEY`
- `SMS_SERVICE_PROVIDER`

... (and other services)

## Verification
The `src/config/env-validator.ts` will ensure all required prefixed variables are present during startup.
