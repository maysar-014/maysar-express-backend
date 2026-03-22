# Security Headers and HTTP Hardening (Project Implementation)

This document describes the security-related headers and HTTP protections as currently configured in the codebase.

## Monolith App (root `src/app.ts`)

File:
- `C:\Users\abdal\Desktop\maysar-express-backend\src\app.ts`

Applied middleware:
- `helmet()` with default configuration
- `cors({ origin: <CORS_ORIGIN or false> })`
- `compression()`
- `cookieParser()`

Notes:
- `helmet()` sets a standard set of security headers using its default policy set.
- CORS origins are derived from `CORS_ORIGIN` env, split by comma. If not provided, CORS is disabled by passing `false` to the middleware.
- The monolith does not enable `credentials` in CORS (no `credentials: true` in the current config).

## Auth Service (`services/auth-service/src/main.ts`)

File:
- `C:\Users\abdal\Desktop\maysar-express-backend\services\auth-service\src\main.ts`

Helmet configuration:
- Content Security Policy (CSP)
  - `default-src 'self'`
  - `style-src 'self' 'unsafe-inline'`
  - `script-src 'self'`
  - `img-src 'self' data: https:`
- HSTS
  - `maxAge: 31536000`
  - `includeSubDomains: true`
  - `preload: true`

Auth service CORS:
- Reads config from `config.cors`
- Allows methods: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`
- Allowed headers include `X-CSRF-Token`
- `credentials` is controlled by `config.cors.credentials`

## Logging and Security Signals

The order-service logging middleware tracks security-related signals:
- `C:\Users\abdal\Desktop\maysar-express-backend\services\order-service\src\middleware\logging.middleware.ts`

Examples:
- Logs when rate limit remaining hits zero
- Logs suspicious request patterns (XSS, SQL injection, traversal)
- Logs authentication failures (401, 403)

## Cookies

The CSRF cookie is set with:
- `httpOnly: false`
- `sameSite: 'strict'`
- `secure: NODE_ENV === 'production'`

Details in:
- `C:\Users\abdal\Desktop\maysar-express-backend\shared\middleware\csrf.middleware.ts`
