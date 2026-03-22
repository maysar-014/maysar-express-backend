# Authentication and Authorization (Project Implementation)

This document describes the authentication context, role checks, and service-key access as implemented in this repo.

## Core Implementation

Primary source:
- `C:\Users\abdal\Desktop\maysar-express-backend\shared\middleware\auth-context.middleware.ts`

Mounted in the monolith app:
- `C:\Users\abdal\Desktop\maysar-express-backend\src\app.ts`
  - `attachAuthContext` is mounted globally, which **attaches** context but does not enforce auth by itself.

Enforcement in services:
- Auth service admin routes use `requireRoleOrService`:
  - `C:\Users\abdal\Desktop\maysar-express-backend\services\auth-service\src\main.ts`

## How Auth Context Is Resolved

Resolution order in `resolveAuthContext`:
1. **Bearer token** in `Authorization: Bearer <token>`
2. **Header-based user** via `x-user-id` (and optional roles/email)
3. **Service key** via `x-service-key` and `ALLOWED_SERVICE_KEYS`

If none are valid:
- returns `{ code: 'UNAUTHORIZED', message: 'Authentication required' }`

## Bearer Token Validation

File: `shared/middleware/auth-context.middleware.ts`

Behavior:
- Requires `JWT_SECRET` to be set
- Uses `jwt.verify(token, JWT_SECRET)`
- Accepts roles from:
  - `payload.roles` (array)
  - `payload.role` (single value)
- User id resolved from:
  - `payload.userId` or `payload.sub`

Resulting `req.user` shape:
```ts
{
  userId: string;
  email?: string;
  roles: string[];
  token?: string;
}
```

If `JWT_SECRET` is missing, the error code is:
- `JWT_SECRET_MISSING`

If token verification fails:
- `INVALID_TOKEN`

## Header-Based User Context

Headers supported:
- `x-user-id` (required)
- `x-user-roles` (comma-separated list)
- `x-user-email` (optional)

Behavior:
- If `x-user-roles` is missing, roles default to `['user']`
- Values are trimmed and parsed from comma-separated strings

Example:
```
x-user-id: usr_123
x-user-roles: admin, seller
x-user-email: user@example.com
```

## Service-Key Context

Header:
- `x-service-key`

Environment:
- `ALLOWED_SERVICE_KEYS` (comma-separated)

Behavior:
- If `x-service-key` is present and matches an allowed key, a service context is created
- Service context includes:
  - `serviceKey`
  - `serviceId: 'service'`

## Enforcement Helpers

### `requireAuth`
File: `shared/middleware/auth-context.middleware.ts`

Behavior:
- Allows requests with either user or service context
- On failure, returns HTTP `401` with:
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

### `requireRole`
Behavior:
- Requires user context and at least one required role
- Service keys are **not** sufficient
- If user lacks roles, returns HTTP `403`:
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}
```
- If not authenticated, returns HTTP `401`

### `requireRoleOrService`
Behavior:
- Allows service key **or** user with required role
- If user lacks role, returns HTTP `403`
- If not authenticated, returns HTTP `401`

## Notes

- `attachAuthContext` never blocks a request; it only attaches `req.user` or `req.service` for later use.
- Role checks are case-insensitive; roles are normalized to lowercase before comparison.
