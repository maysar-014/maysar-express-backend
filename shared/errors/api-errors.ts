/**
 * Canonical API Error Classes
 *
 * Every error thrown in a controller or use case must be one of these typed
 * errors. The global error handler maps each class to the correct HTTP status
 * code and machine-readable error code per the API documentation constitution.
 *
 * Error response shape (all responses):
 * {
 *   "success": false,
 *   "error": {
 *     "code": "MACHINE_READABLE_CODE",
 *     "message": "Human-readable explanation",
 *     "details": { ...optional context... },
 *     "timestamp": "ISO-8601",
 *     "path": "/api/..."
 *   }
 * }
 */

// ── Base ─────────────────────────────────────────────────────────────────────

export abstract class BaseApiError extends Error {
  abstract readonly httpStatus: number;
  abstract readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ── 400 Bad Request ───────────────────────────────────────────────────────────

export class ValidationError extends BaseApiError {
  readonly httpStatus = 400;
  readonly code = 'VALIDATION_ERROR';

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
  }
}

export class MalformedRequestError extends BaseApiError {
  readonly httpStatus = 400;
  readonly code = 'MALFORMED_REQUEST';
}

// ── 401 Unauthorized ─────────────────────────────────────────────────────────

export class UnauthorizedError extends BaseApiError {
  readonly httpStatus = 401;
  readonly code: string;

  constructor(
    message = 'Authentication required',
    code: 'MISSING_TOKEN' | 'INVALID_TOKEN' | 'TOKEN_EXPIRED' = 'MISSING_TOKEN',
    details?: Record<string, unknown>,
  ) {
    super(message, details);
    this.code = code;
  }
}

// ── 403 Forbidden ────────────────────────────────────────────────────────────

export class ForbiddenError extends BaseApiError {
  readonly httpStatus = 403;
  readonly code = 'INSUFFICIENT_PERMISSIONS';
}

// ── 404 Not Found ────────────────────────────────────────────────────────────

export class NotFoundError extends BaseApiError {
  readonly httpStatus = 404;
  readonly code = 'RESOURCE_NOT_FOUND';
}

// ── 409 Conflict ─────────────────────────────────────────────────────────────

export class ConflictError extends BaseApiError {
  readonly httpStatus = 409;
  readonly code = 'RESOURCE_CONFLICT';
}

// ── 422 Unprocessable ─────────────────────────────────────────────────────────

export class BusinessRuleError extends BaseApiError {
  readonly httpStatus = 422;
  readonly code: string;

  constructor(message: string, code = 'BUSINESS_RULE_VIOLATION', details?: Record<string, unknown>) {
    super(message, details);
    this.code = code;
  }
}

// ── 429 Too Many Requests ────────────────────────────────────────────────────

export class RateLimitError extends BaseApiError {
  readonly httpStatus = 429;
  readonly code = 'RATE_LIMIT_EXCEEDED';
}

// ── 503 Service Unavailable ──────────────────────────────────────────────────

export class ServiceUnavailableError extends BaseApiError {
  readonly httpStatus = 503;
  readonly code = 'SERVICE_UNAVAILABLE';
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalise any thrown value into an HTTP status + code + message triple.
 * Used by the global error handler and per-controller catch blocks.
 */
export function normaliseError(err: unknown): {
  httpStatus: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
} {
  if (err instanceof BaseApiError) {
    return {
      httpStatus: err.httpStatus,
      code: err.code,
      message: err.message,
      details: err.details,
    };
  }

  // Legacy AppError from shared/errors/app-error.ts
  if (err instanceof Error && (err as any).statusCode) {
    const status = (err as any).statusCode as number;
    return {
      httpStatus: status,
      code: httpStatusToCode(status),
      message: err.message,
    };
  }

  // Plain Error
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes('not found') || msg.includes('does not exist')) {
      return { httpStatus: 404, code: 'RESOURCE_NOT_FOUND', message: err.message };
    }
    if (msg.includes('forbidden') || msg.includes('not allowed')) {
      return { httpStatus: 403, code: 'INSUFFICIENT_PERMISSIONS', message: err.message };
    }
    if (msg.includes('unauthorized') || msg.includes('unauthenticated')) {
      return { httpStatus: 401, code: 'MISSING_TOKEN', message: err.message };
    }
    if (msg.includes('already exists') || msg.includes('unique constraint')) {
      return { httpStatus: 409, code: 'RESOURCE_CONFLICT', message: err.message };
    }
    if (
      msg.includes('invalid') ||
      msg.includes('required') ||
      msg.includes('must be') ||
      msg.includes('cannot be negative') ||
      msg.includes('bounds')
    ) {
      return { httpStatus: 422, code: 'VALIDATION_ERROR', message: err.message };
    }
  }

  return {
    httpStatus: 500,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  };
}

function httpStatusToCode(status: number): string {
  const map: Record<number, string> = {
    400: 'VALIDATION_ERROR',
    401: 'MISSING_TOKEN',
    403: 'INSUFFICIENT_PERMISSIONS',
    404: 'RESOURCE_NOT_FOUND',
    409: 'RESOURCE_CONFLICT',
    422: 'BUSINESS_RULE_VIOLATION',
    429: 'RATE_LIMIT_EXCEEDED',
    503: 'SERVICE_UNAVAILABLE',
  };
  return map[status] ?? 'INTERNAL_SERVER_ERROR';
}
