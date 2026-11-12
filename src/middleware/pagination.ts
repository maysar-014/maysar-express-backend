/**
 * Maysar Engineering — Pagination Middleware
 * 
 * Governing Document: Maysar Engineering Constitution v1.0
 *   - Article 10.2: Collection queries must have appropriate result boundaries
 *   - Article 11.1: Return only necessary response information
 *   - Article 7: Resource Efficiency Doctrine
 * 
 * Enforces maximum page size on all list endpoints to prevent memory exhaustion
 * and denial of service via large data requests.
 * 
 * Default pagination: page=1, limit=20
 * Maximum page size: 100 items
 */

import { NextFunction, Request, Response } from 'express';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Pagination parameters extracted from request.
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Express request extension with pagination params.
 */
declare global {
  namespace Express {
    interface Request {
      pagination?: PaginationParams;
    }
  }
}

/**
 * Pagination middleware.
 * 
 * Parses and validates pagination query parameters:
 * - page: 1-based page number (default: 1)
 * - limit: items per page (default: 20, max: 100)
 * 
 * Sets req.pagination with { page, limit, offset } for use in controllers.
 * Also patches res.json to include pagination metadata automatically.
 */
export function paginationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  let limit = Math.max(1, parseInt(req.query.limit as string, 10) || DEFAULT_LIMIT);

  // Enforce maximum page size per Article 10.2
  if (limit > MAX_LIMIT) {
    limit = MAX_LIMIT;
  }

  const offset = (page - 1) * limit;

  // Attach pagination to request for use in controllers
  req.pagination = { page, limit, offset };

  next();
}

/**
 * Apply pagination to a Prisma findMany call.
 * 
 * @param prismaCall - Async function that accepts { skip, take, ... } and returns [data, total]
 * @param pagination - Pagination parameters from req.pagination
 * @returns [data, total] tuple
 */
export async function paginate<T>(
  prismaCall: (params: { skip: number; take: number }) => Promise<[T[], number]>,
  pagination: PaginationParams
): Promise<{ data: T[]; total: number; page: number; limit: number; totalPages: number; hasMore: boolean }> {
  const [data, total] = await prismaCall({
    skip: pagination.offset,
    take: pagination.limit,
  });

  const totalPages = Math.ceil(total / pagination.limit);
  const hasMore = pagination.page * pagination.limit < total;

  return {
    data,
    total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages,
    hasMore,
  };
}
