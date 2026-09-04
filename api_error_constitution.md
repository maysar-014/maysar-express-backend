# API Error Constitution
**Version:** 1.0  
**Scope:** All backend services in the Maysar platform (catalog-service, auth-service, order-service, wallet-service, etc.)  
**Enforcement:** This document is normative. Any violation is a defect, not a style issue.

---

## 1. The Core Rule

**Raw internal errors MUST NEVER reach API consumers.**

This includes — without exception:

- Prisma error messages (`Invalid tx.product.create() invocation`, `Foreign key constraint violated`, `P2003`, `P2025`, etc.)
- Stack traces
- SQL query text or parameter values
- Internal file paths (`C:\Users\...`, `/app/services/...`)
- Internal model or field names (`catalog_products_supplierLocationId_fkey`)
- ORM meta-information
- `node_modules` references
- Any message containing the word `prisma`, `transaction`, `constraint`, or `invocation`

---

## 2. Canonical Error Response Shape

Every API error response MUST follow this shape exactly:

```json
{
  "success": false,
  "code": "DOMAIN_ERROR_CODE",
  "message": "Human-readable message safe for display",
  "details": []
}
```

| Field | Required | Description |
|---|---|---|
| `success` | Yes | Always `false` for errors |
| `code` | Yes | Machine-readable uppercase snake_case code |
| `message` | Yes | Safe user-facing string. No internal details. |
| `details` | No | Array of field-level validation errors (optional) |

**HTTP status codes map directly to error classes** — see §4.

---

## 3. Error Classification Taxonomy

### 3.1 Validation Errors — `400 Bad Request`
Input did not satisfy schema or business rules.

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "The request contains invalid data.",
  "details": [
    { "field": "supplierLocationId", "message": "Supplier location not found." }
  ]
}
```

### 3.2 Authentication Errors — `401 Unauthorized`
No valid token present, or token expired.

```json
{ "success": false, "code": "UNAUTHENTICATED", "message": "Authentication required." }
```

### 3.3 Authorization Errors — `403 Forbidden`
Token valid, but caller lacks permission for this resource.

```json
{ "success": false, "code": "FORBIDDEN", "message": "You do not have permission to perform this action." }
```

### 3.4 Not Found — `404 Not Found`
Resource does not exist (or caller is not allowed to know it exists).

```json
{ "success": false, "code": "NOT_FOUND", "message": "The requested resource was not found." }
```

### 3.5 Conflict / Duplicate — `409 Conflict`
Duplicate key, optimistic lock failure, or state conflict.

```json
{ "success": false, "code": "CONFLICT", "message": "A resource with this identifier already exists." }
```

### 3.6 Business Rule Violation — `422 Unprocessable Entity`
Request is syntactically valid but violates a domain rule.

```json
{ "success": false, "code": "BUSINESS_RULE_VIOLATION", "message": "Cannot delete the primary location. Set another location as primary first." }
```

### 3.7 Rate Limit — `429 Too Many Requests`

```json
{ "success": false, "code": "RATE_LIMITED", "message": "Too many requests. Please try again later." }
```

### 3.8 Internal Server Error — `500 Internal Server Error`
Unexpected errors. The message MUST be generic — never expose internals.

```json
{ "success": false, "code": "INTERNAL_ERROR", "message": "An unexpected error occurred. Please try again." }
```

---

## 4. HTTP Status → Error Code Mapping

| HTTP Status | Code | When to use |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Schema/input failures |
| 401 | `UNAUTHENTICATED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource absent |
| 409 | `CONFLICT` | Duplicate, lock failure |
| 422 | `BUSINESS_RULE_VIOLATION` | Domain rule failure |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Everything else |
| 502/503 | `SERVICE_UNAVAILABLE` | Upstream service down |

---

## 5. Error Interception Architecture

### 5.1 Global Exception Filter (NestJS / Express)

Every service MUST have a single global exception filter/middleware that:

1. Catches ALL unhandled exceptions before they reach the HTTP response
2. Logs the full error internally (with stack trace) for observability
3. Emits a sanitized response matching §2

**NestJS pattern:**

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Log the raw error internally — never suppress it
    logger.error({
      path: request.url,
      method: request.method,
      error: exception instanceof Error ? exception.message : String(exception),
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    const { status, body } = mapExceptionToResponse(exception);
    response.status(status).json(body);
  }
}
```

### 5.2 `mapExceptionToResponse` — Mandatory Mapping Function

Every service MUST implement this function. It must handle:

```typescript
function mapExceptionToResponse(exception: unknown): { status: number; body: ErrorResponse } {
  // 1. NestJS built-in HTTP exceptions — pass through status, sanitize message
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    return {
      status,
      body: { success: false, code: httpStatusToCode(status), message: safeMessage(exception) },
    };
  }

  // 2. Prisma errors — NEVER expose raw Prisma details
  if (isPrismaError(exception)) {
    return mapPrismaError(exception);
  }

  // 3. Domain / application exceptions — map to appropriate status
  if (exception instanceof DomainException) {
    return { status: 422, body: { success: false, code: 'BUSINESS_RULE_VIOLATION', message: exception.message } };
  }

  if (exception instanceof NotFoundException) {
    return { status: 404, body: { success: false, code: 'NOT_FOUND', message: exception.message } };
  }

  // 4. Everything else → generic 500
  return {
    status: 500,
    body: { success: false, code: 'INTERNAL_ERROR', message: 'An unexpected error occurred. Please try again.' },
  };
}
```

### 5.3 Prisma Error Mapping — Required Table

```typescript
function isPrismaError(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    typeof (e as any).code === 'string' &&
    (e as any).code.startsWith('P')
  );
}

function mapPrismaError(e: any): { status: number; body: ErrorResponse } {
  switch (e.code) {
    // Foreign key constraint — referenced record does not exist
    case 'P2003':
      return {
        status: 422,
        body: {
          success: false,
          code: 'INVALID_REFERENCE',
          message: 'A referenced resource does not exist. Please verify your input.',
          details: [{ field: extractField(e.meta?.field_name), message: 'Referenced record not found.' }],
        },
      };

    // Unique constraint violation
    case 'P2002':
      return {
        status: 409,
        body: {
          success: false,
          code: 'CONFLICT',
          message: 'A record with this identifier already exists.',
          details: [{ field: extractField(e.meta?.target), message: 'Duplicate value.' }],
        },
      };

    // Record not found
    case 'P2025':
      return {
        status: 404,
        body: { success: false, code: 'NOT_FOUND', message: 'The requested record was not found.' },
      };

    // Required field missing
    case 'P2011':
    case 'P2012':
      return {
        status: 400,
        body: { success: false, code: 'VALIDATION_ERROR', message: 'A required field is missing.' },
      };

    // All other Prisma errors → generic 500
    default:
      return {
        status: 500,
        body: { success: false, code: 'INTERNAL_ERROR', message: 'An unexpected error occurred. Please try again.' },
      };
  }
}

// Extract a safe public field name from Prisma meta — strip internal FK index names
function extractField(raw?: string): string {
  if (!raw) return 'unknown';
  // e.g. "catalog_products_supplierLocationId_fkey (index)" → "supplierLocationId"
  const match = raw.match(/[a-zA-Z]+(?=[A-Z]|Id|_fkey|$)/);
  return match ? toCamelCase(match[0]) : 'field';
}
```

---

## 6. Specific Violation Being Fixed

The error reported:

```
Foreign key constraint violated: `catalog_products_supplierLocationId_fkey (index)`
```

**Root cause:** A product is being created with a `supplierLocationId` that does not exist in the `seller_locations` table.

**Backend fix required in `prisma-product.repository.ts`:**

```typescript
try {
  await this.prisma.$transaction(async (tx) => {
    await tx.product.create({ data: productData });
  });
} catch (e) {
  // Let the global exception filter handle it — DO NOT re-throw raw
  // Instead, check FK violation explicitly for a better message:
  if (isPrismaError(e) && (e as any).code === 'P2003') {
    const field = (e as any).meta?.field_name ?? '';
    if (field.includes('supplierLocation')) {
      throw new DomainException(
        'The selected shop location does not exist. Please create a location before listing a product.'
      );
    }
  }
  throw e; // re-throw for global filter
}
```

**Frontend fix required in `ProductForm` / `useProductCreation`:**

Before calling `createProduct`, validate that `supplierLocationId` exists in the loaded locations list:

```typescript
if (!locations.some(l => l.id === values.supplierLocation && l.isActive())) {
  setError('The selected location is no longer available. Please select a valid location.');
  return;
}
```

---

## 7. Frontend Error Display Rules

The frontend MUST:

1. **Never render raw error strings from API responses directly in prominent UI** — always map `code` to a user-friendly message first.
2. **Check `error.code` before displaying** — if the code is unknown, show a generic fallback.
3. **Never show internal field names, stack traces, or Prisma codes** — sanitize on the frontend as a second layer.

```typescript
function resolveUserMessage(error: ApiError): string {
  const codeMessages: Record<string, string> = {
    VALIDATION_ERROR: 'Please check your input and try again.',
    NOT_FOUND: 'The requested item could not be found.',
    CONFLICT: 'This item already exists.',
    BUSINESS_RULE_VIOLATION: error.message, // domain messages are safe to show
    INVALID_REFERENCE: 'A referenced item no longer exists. Please refresh and try again.',
    FORBIDDEN: 'You do not have permission to do this.',
    UNAUTHENTICATED: 'Please sign in to continue.',
    INTERNAL_ERROR: 'Something went wrong. Please try again.',
    SERVICE_UNAVAILABLE: 'The service is temporarily unavailable. Please try again shortly.',
  };
  return codeMessages[error.code] ?? error.message ?? 'An unexpected error occurred.';
}
```

---

## 8. Logging Requirements

Every caught exception MUST be logged internally before being sanitized:

```typescript
// Required fields in every error log entry:
{
  timestamp: string,       // ISO 8601
  service: string,         // "catalog-service"
  correlationId: string,   // from X-Correlation-ID header or generated
  path: string,            // request path
  method: string,          // HTTP method
  userId?: string,         // authenticated user ID if available
  errorCode: string,       // Prisma code, HTTP status, or domain code
  errorMessage: string,    // FULL raw message — for internal use only
  stack?: string,          // Full stack trace
}
```

---

## 9. Checklist for Every Service

Before any service goes to production:

- [ ] Global exception filter registered and active
- [ ] All Prisma P2xxx codes mapped to safe responses
- [ ] No raw `error.message` passed directly to response body
- [ ] No `console.error` of raw exceptions without also mapping the response
- [ ] Repository layer wraps all Prisma calls in try/catch with domain re-throws
- [ ] Every 500 response uses `INTERNAL_ERROR` code with generic message
- [ ] FK constraint violations produce `INVALID_REFERENCE` with field context (no internal index names)
- [ ] Frontend `resolveUserMessage` function in place for all API error displays
- [ ] Pre-submission validation checks FK references before the API call

---

## 10. Ready-to-Use Shared Error Module

Drop this file into every service as `src/shared/errors/index.ts`. Nothing else needs to be written — import from here.

```typescript
// ─────────────────────────────────────────────────────────────────────────────
// src/shared/errors/index.ts
// Canonical error handling for all Maysar backend services.
// Import this — do not write your own.
// ─────────────────────────────────────────────────────────────────────────────

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ApiErrorResponse {
  success: false;
  code: string;
  message: string;
  details?: Array<{ field?: string; message: string }>;
}

export interface MappedError {
  status: number;
  body: ApiErrorResponse;
}

// ── Domain Exceptions (throw these in use-cases / repositories) ───────────────

export class DomainException extends Error {
  constructor(message: string) { super(message); this.name = 'DomainException'; }
}
export class NotFoundException extends Error {
  constructor(message = 'The requested resource was not found.') { super(message); this.name = 'NotFoundException'; }
}
export class ConflictException extends Error {
  constructor(message = 'A resource with this identifier already exists.') { super(message); this.name = 'ConflictException'; }
}
export class ForbiddenException extends Error {
  constructor(message = 'You do not have permission to perform this action.') { super(message); this.name = 'ForbiddenException'; }
}
export class ValidationException extends Error {
  constructor(
    message: string,
    public readonly details: Array<{ field?: string; message: string }> = []
  ) { super(message); this.name = 'ValidationException'; }
}

// ── Prisma detection & mapping ─────────────────────────────────────────────────

function isPrismaError(e: unknown): e is { code: string; meta?: Record<string, unknown>; message: string } {
  return (
    typeof e === 'object' && e !== null &&
    'code' in e && typeof (e as any).code === 'string' &&
    (e as any).code.startsWith('P')
  );
}

/** Strip internal FK index names down to a safe camelCase field name */
function safeFieldName(raw?: unknown): string {
  if (!raw || typeof raw !== 'string') return 'field';
  // "catalog_products_supplierLocationId_fkey (index)" → "supplierLocationId"
  const camelMatch = raw.match(/([a-z][a-zA-Z0-9]+Id)/);
  if (camelMatch) return camelMatch[1];
  const words = raw.replace(/[^a-zA-Z0-9_ ]/g, '').split(/[\s_]+/);
  return words.sort((a, b) => b.length - a.length)[0] ?? 'field';
}

function mapPrismaError(e: any): MappedError {
  switch (e.code) {
    case 'P2003':
      return {
        status: 422,
        body: {
          success: false,
          code: 'INVALID_REFERENCE',
          message: 'A referenced resource does not exist. Please verify your input and try again.',
          details: [{ field: safeFieldName(e.meta?.field_name), message: 'Referenced record not found.' }],
        },
      };
    case 'P2002':
      return {
        status: 409,
        body: {
          success: false,
          code: 'CONFLICT',
          message: 'A record with this identifier already exists.',
          details: [{ field: safeFieldName(e.meta?.target), message: 'Duplicate value.' }],
        },
      };
    case 'P2025':
      return { status: 404, body: { success: false, code: 'NOT_FOUND', message: 'The requested record was not found.' } };
    case 'P2011':
    case 'P2012':
      return { status: 400, body: { success: false, code: 'VALIDATION_ERROR', message: 'A required field is missing.' } };
    case 'P2014':
      return { status: 422, body: { success: false, code: 'BUSINESS_RULE_VIOLATION', message: 'This operation violates a required relationship.' } };
    default:
      return { status: 500, body: { success: false, code: 'INTERNAL_ERROR', message: 'An unexpected error occurred. Please try again.' } };
  }
}

// ── Main mapper — call this in your global exception filter ───────────────────

export function mapExceptionToResponse(exception: unknown): MappedError {
  if (isPrismaError(exception)) return mapPrismaError(exception);

  if (exception instanceof ValidationException)
    return { status: 400, body: { success: false, code: 'VALIDATION_ERROR', message: exception.message, details: exception.details } };
  if (exception instanceof NotFoundException)
    return { status: 404, body: { success: false, code: 'NOT_FOUND', message: exception.message } };
  if (exception instanceof ConflictException)
    return { status: 409, body: { success: false, code: 'CONFLICT', message: exception.message } };
  if (exception instanceof ForbiddenException)
    return { status: 403, body: { success: false, code: 'FORBIDDEN', message: exception.message } };
  if (exception instanceof DomainException)
    return { status: 422, body: { success: false, code: 'BUSINESS_RULE_VIOLATION', message: exception.message } };

  // NestJS HttpException
  const httpEx = exception as any;
  if (typeof httpEx?.getStatus === 'function') {
    const status: number = httpEx.getStatus();
    const res = httpEx.getResponse();
    const message = typeof res === 'string' ? res : (res as any)?.message ?? 'Request failed.';
    return { status, body: { success: false, code: httpStatusToCode(status), message: Array.isArray(message) ? message.join('. ') : message } };
  }

  return { status: 500, body: { success: false, code: 'INTERNAL_ERROR', message: 'An unexpected error occurred. Please try again.' } };
}

function httpStatusToCode(status: number): string {
  const map: Record<number, string> = {
    400: 'VALIDATION_ERROR', 401: 'UNAUTHENTICATED', 403: 'FORBIDDEN',
    404: 'NOT_FOUND', 409: 'CONFLICT', 422: 'BUSINESS_RULE_VIOLATION',
    429: 'RATE_LIMITED', 500: 'INTERNAL_ERROR', 502: 'SERVICE_UNAVAILABLE', 503: 'SERVICE_UNAVAILABLE',
  };
  return map[status] ?? 'INTERNAL_ERROR';
}
```

---

### Drop-in NestJS Global Filter

```typescript
// src/shared/errors/global-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { mapExceptionToResponse } from './index';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('GlobalExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    this.logger.error({
      path: req.url,
      method: req.method,
      userId: (req as any).user?.id,
      error: exception instanceof Error ? exception.message : String(exception),
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    const { status, body } = mapExceptionToResponse(exception);
    res.status(status).json(body);
  }
}
```

Register once in `main.ts`:

```typescript
app.useGlobalFilters(new GlobalExceptionFilter());
```

---

### Drop-in Express Middleware

```typescript
// src/shared/errors/error-middleware.ts
import { Request, Response, NextFunction } from 'express';
import { mapExceptionToResponse } from './index';

export function globalErrorMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction) {
  console.error({ path: req.url, method: req.method, error: err });
  const { status, body } = mapExceptionToResponse(err);
  res.status(status).json(body);
}
```

Register as the **last** middleware in `app.ts`:

```typescript
app.use(globalErrorMiddleware);
```

---

## 11. Specific Fix for the Reported Error

**File:** `catalog-service/src/infrastructure/repositories/prisma-product.repository.ts`

**Before (leaking internals):**
```typescript
await this.prisma.$transaction(async (tx: any) => {
  await tx.product.create({ data: productData });
});
// Error leaks: "Foreign key constraint violated: catalog_products_supplierLocationId_fkey (index)"
```

**After (compliant):**
```typescript
import { DomainException } from '../../shared/errors';

try {
  await this.prisma.$transaction(async (tx: any) => {
    await tx.product.create({ data: productData });
  });
} catch (e: any) {
  if (e?.code === 'P2003' && e?.meta?.field_name?.includes('supplierLocation')) {
    throw new DomainException(
      'The selected shop location does not exist. Please create a location before listing a product.'
    );
  }
  throw e; // re-throw — GlobalExceptionFilter handles everything else
}
```

The `GlobalExceptionFilter` picks up the re-thrown error, logs it fully internally, and sends the client a clean 422 with `BUSINESS_RULE_VIOLATION`.
