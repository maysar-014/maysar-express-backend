# CSRF Protection (Project Implementation)

This document describes the exact CSRF behavior implemented in this repo, including where it is wired, how tokens are issued and validated, and what headers and cookies are required.

## Where CSRF Is Enforced

### Shared middleware (primary)
The canonical CSRF implementation lives in `C:\Users\abdal\Desktop\maysar-express-backend\shared\middleware\csrf.middleware.ts`.

It is mounted in:
- Monolith app: `C:\Users\abdal\Desktop\maysar-express-backend\src\app.ts`
- Auth service: `C:\Users\abdal\Desktop\maysar-express-backend\services\auth-service\src\main.ts`
- Auth routes explicitly validate CSRF: `C:\Users\abdal\Desktop\maysar-express-backend\services\auth-service\src\api\routes\auth.routes.ts`

### Catalog service (secondary / separate)
There is a separate SecurityMiddleware with a JWT-based CSRF check in `C:\Users\abdal\Desktop\maysar-express-backend\services\catalog-service\src\middleware\security.middleware.ts`.

This is not wired into the runtime app in this repo; it is used by tests and is separate from the shared CSRF middleware described below.

## Token Issuance Flow (Shared Middleware)

### Cookie name and options
The shared middleware uses a cookie named `csrf-token`.

Cookie options from `setCsrfCookie`:
- `httpOnly: false` so frontend JS can read it
- `sameSite: 'strict'`
- `secure: process.env.NODE_ENV === 'production'`
- `maxAge: 8 hours`

### How the cookie is set
The `csrfTokenMiddleware` sets the cookie only on `GET` or `HEAD` requests if it is missing:
```ts
app.use(csrfTokenMiddleware);
```

### Explicit CSRF endpoint (monolith only)
The monolith exposes a dedicated endpoint that always issues a token:
- `GET /csrf`

Implementation (from `src/app.ts`):
Creates or reuses the cookie token via `getOrCreateCsrfToken`, returns JSON `{ csrfToken: <token> }`, sets the `X-CSRF-Token` response header, and adds `Cache-Control: no-store`.

This endpoint is intended for non-browser clients and automated tests.

## Validation Flow (Shared Middleware)

The `csrfValidationMiddleware` enforces CSRF on `POST`, `PUT`, `PATCH`, and `DELETE`. Safe methods (`GET`, `HEAD`, `OPTIONS`) bypass validation.

Validation steps:
1. Read cookie token from `req.cookies['csrf-token']`. If missing, parse raw `Cookie` header (`req.headers.cookie`).
2. Read header token from `x-csrf-token`, or `req.get('x-csrf-token')`, or `req.get('X-CSRF-Token')`.
3. Require both tokens. If either is missing, returns `{ "success": false, "message": "CSRF token missing" }`.
4. Validate format. If either is not a string, returns `{ "success": false, "message": "Invalid CSRF token format" }`.
5. Validate equality. Length mismatch returns `{ "success": false, "message": "Invalid CSRF token" }`. The comparison uses `crypto.timingSafeEqual`. A mismatch returns `{ "success": false, "message": "CSRF token mismatch" }`.

All validation failures return HTTP `403`.

## Test and Automation Bypass (Shared Middleware)

For non-production test runners, a header-only bypass exists.

Allowed when `NODE_ENV !== 'production'` and the request includes `X-Test-CSRF: 1` or `X-CSRF-Bypass: 1`.

Behavior: if a header token exists but the cookie is missing, validation passes.

Additionally, `CSRF_ALLOW_HEADER_ONLY=1` forces header-only acceptance in any environment.

## Client Usage Examples

### Browser or SPA flow (recommended)
1. Call `GET /csrf` (monolith) or any GET endpoint that sets the cookie.
2. Read the cookie (`csrf-token`) in frontend JS.
3. Send it as `X-CSRF-Token` on all unsafe requests.

Example:
```ts
await fetch('/csrf', { credentials: 'include' });
const token = document.cookie
  .split('; ')
  .find(c => c.startsWith('csrf-token='))
  ?.split('=')[1];

await fetch('/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': token || ''
  },
  credentials: 'include',
  body: JSON.stringify(payload)
});
```

### Postman or Newman
The Postman generation script in `C:\Users\abdal\Desktop\maysar-express-backend\scripts\postman\generate-monolith-e2e-collection.js` automatically injects a `csrf-token` cookie and `X-CSRF-Token` header when missing.

### Dredd or Contract Tests
The Dredd hooks in `C:\Users\abdal\Desktop\maysar-express-backend\tests\contract\dredd.hooks.js` perform `GET /csrf` to fetch the token, add `X-CSRF-Token` and `Cookie`, and add `X-Test-CSRF: 1` to enable header-only bypass in non-prod.

## Common Failure Modes

1. **403 CSRF token missing**: cookie or header is missing on an unsafe request. Common cause is skipping `/csrf` or not sending cookies.
2. **403 CSRF token mismatch**: header token does not match cookie token. Often caused by a stale token in the client.
3. **403 Invalid CSRF token format**: header token is not a string (array or other type).

## Notes on the Catalog Service CSRF

The catalog service `SecurityMiddleware.csrfProtection()` differs from the shared middleware. It expects `x-csrf-token` to be a JWT, optionally accepts `req.body._csrf`, and validates via `jwt.verify(token, JWT_SECRET)`.
