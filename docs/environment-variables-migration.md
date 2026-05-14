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

### Chat Service (MinIO / S3)

These variables configure the chat-service media storage. In development they point to the local MinIO container. In staging/production they point to AWS S3 or equivalent.

| Variable | Dev default | Purpose |
|---|---|---|
| `S3_ENDPOINT` | `http://localhost:9000` | MinIO API endpoint (omit for AWS S3) |
| `S3_REGION` | `us-east-1` | S3 region |
| `S3_ACCESS_KEY_ID` | `maysar` | MinIO root user / AWS access key |
| `S3_SECRET_ACCESS_KEY` | `maysar2026` | MinIO root password / AWS secret key |
| `S3_BUCKET_CHAT_MEDIA` | `chat-media` | Bucket for images and voice notes |
| `S3_FORCE_PATH_STYLE` | `true` | Must be `true` for MinIO, `false` for AWS S3 |
| `MINIO_ROOT_USER` | `maysar` | MinIO container root user (Docker Compose only) |
| `MINIO_ROOT_PASSWORD` | `maysar2026` | MinIO container root password (Docker Compose only) |
| `NOTIFICATION_SERVICE_URL` | `http://localhost:3000/api/notifications` | Internal notification service URL |
