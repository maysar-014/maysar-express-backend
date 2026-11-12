/**
 * Maysar Engineering — Idempotency Middleware
 * 
 * Governing Document: Maysar Engineering Constitution v1.0
 *   - Article 11.11: Support idempotent execution for operations where retries could produce
 *     duplicate business effects
 *   - Article 18: Financial and Transactional Integrity — Retry mechanisms shall not cause
 *     duplicate charges, orders, credits, debits or financial settlements
 *   - Article 7: Resource Efficiency Doctrine
 * 
 * Implements Redis-backed idempotency key storage with TTL. When a request with an
 * Idempotency-Key header is received:
 * 1. If the key has been processed before, return the cached response
 * 2. If not, process the request, cache the response, then return it
 * 
 * Cache entries expire after 24 hours (86400 seconds).
 */

import { NextFunction, Request, Response } from 'express';
import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const IDEMPOTENCY_TTL_SECONDS = 86400; // 24 hours

// Idempotency is enforced on state-changing methods
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

let redisClient: ReturnType<typeof createClient> | null = null;
let redisConnected = false;

async function getRedisClient() {
    if (redisClient && redisConnected) {
        return redisClient;
    }
    try {
        redisClient = createClient({ url: REDIS_URL });
        await redisClient.connect();
        redisConnected = true;
        return redisClient;
    } catch (error) {
        console.warn('[Idempotency] Redis connection failed, idempotency checks will be skipped', error);
        redisConnected = false;
        return null;
    }
}

/**
 * Extract the idempotency key from request headers.
 * Returns undefined if no key is provided.
 */
function getIdempotencyKey(req: Request): string | undefined {
    return req.headers['idempotency-key'] as string | undefined;
}

/**
 * Idempotency middleware.
 * 
 * For state-changing requests with an Idempotency-Key header:
 * - If the key exists in cache, return the cached response (duplicate detection)
 * - If not, intercept the response, cache it, then return it
 * 
 * Requests without an idempotency key proceed without caching (non-idempotent calls).
 * Redis failures fail open (allow the request to proceed).
 */
export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Only enforce on state-changing methods
    if (!STATE_CHANGING_METHODS.has(req.method)) {
        return next();
    }

    const idempotencyKey = getIdempotencyKey(req);

    // Skip if no idempotency key provided — allow non-idempotent calls
    if (!idempotencyKey) {
        return next();
    }

    const cacheKey = `idempotent:${req.path}:${idempotencyKey}`;

    async function execute() {
        const client = await getRedisClient();

        if (client && redisConnected) {
            try {
                // Check if we already processed this request
                const cached = await client.get(cacheKey);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    res.status(parsed.statusCode).json(parsed.body);
                    return;
                }

                // Intercept the response to cache it
                const originalSend = res.send;
                res.send = function (body: any) {
                    try {
                        const cacheData = JSON.stringify({
                            statusCode: res.statusCode,
                            body: body,
                        });
                        // Fire-and-forget: cache the response, don't block the response
                        client.setEx(cacheKey, IDEMPOTENCY_TTL_SECONDS, cacheData).catch((err) => {
                            console.warn('[Idempotency] Failed to cache response', err);
                        });
                    } catch (err) {
                        console.warn('[Idempotency] Failed to serialize response for cache', err);
                    }
                    return originalSend.call(this, body);
                };

                next();
            } catch (error) {
                // Redis operation failed — fail open, allow request
                console.warn('[Idempotency] Redis operation failed, allowing request', error);
                next();
            }
        } else {
            // Redis unavailable — fail open, allow request
            console.warn('[Idempotency] Redis unavailable, idempotency check skipped');
            next();
        }
    }

    execute().catch((error) => {
        console.error('[Idempotency] Unexpected error', error);
        next();
    });
}

/**
 * Get cached idempotency response for a key (for monitoring/debugging).
 */
export async function getCachedIdempotentResponse(cacheKey: string): Promise<any> {
    const client = await getRedisClient();
    if (!client || !redisConnected) {
        return null;
    }
    try {
        const cached = await client.get(cacheKey);
        return cached ? JSON.parse(cached) : null;
    } catch {
        return null;
    }
}

/**
 * Clear an idempotency cache entry (for testing or manual invalidation).
 */
export async function clearIdempotencyCache(cacheKey: string): Promise<void> {
    const client = await getRedisClient();
    if (!client || !redisConnected) {
        return;
    }
    try {
        await client.del(cacheKey);
    } catch (error) {
        console.warn('[Idempotency] Failed to clear cache entry', error);
    }
}
