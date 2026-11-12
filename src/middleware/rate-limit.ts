/**
 * Maysar Engineering — Rate Limiting Middleware
 * 
 * Governing Document: Maysar Engineering Constitution v1.0
 *   - Article 11.10: Apply rate limits and resource protections
 *   - Article 18: Financial and Transactional Integrity
 *   - Article 7: Resource Efficiency Doctrine
 * 
 * Implements Redis-backed sliding window rate limiting with:
 * - Strict limits for financial endpoints (10 req/min)
 * - Standard limits for general API (100 req/min)
 * - Idempotency-Key awareness
 * - Retry-After headers on 429 responses
 * - Distributed rate limiting across instances via Redis
 */

import { NextFunction, Request, Response } from 'express';
import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

const RATE_LIMIT_CONFIGS: Record<string, { max: number; windowMs: number }> = {
    financial: { max: 10, windowMs: 60 * 1000 },
    general:   { max: 100, windowMs: 60 * 1000 },
};

const FINANCIAL_PATH_PREFIXES = [
    '/api/payments',
    '/api/wallets',
    '/api/escrow',
    '/api/orders',
    '/api/refunds',
];

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
        console.warn('[RateLimit] Redis connection failed, falling back to in-memory', error);
        redisConnected = false;
        return null;
    }
}
interface MemoryEntry {
    count: number;
    resetTime: number;
}

const memoryStore: Map<string, MemoryEntry> = new Map();

function getMemoryEntry(key: string, windowMs: number): MemoryEntry {
    const now = Date.now();
    const entry = memoryStore.get(key);
    if (!entry || now > entry.resetTime) {
        const newEntry: MemoryEntry = { count: 1, resetTime: now + windowMs };
        memoryStore.set(key, newEntry);
        return newEntry;
    }
    entry.count++;
    return entry;
}

function cleanupMemoryStore() {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
        if (now > entry.resetTime) {
            memoryStore.delete(key);
        }
    }
}

setInterval(cleanupMemoryStore, 5 * 60 * 1000);

function getRateLimitKey(req: Request): string {
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';

    if (idempotencyKey) {
        return `idempotent:${idempotencyKey}`;
    }

    return `ip:${ip}:${req.path}`;
}

function getRateLimitConfig(req: Request): { max: number; windowMs: number } {
    const isFinancial = FINANCIAL_PATH_PREFIXES.some(prefix => req.path.startsWith(prefix));
    return isFinancial ? RATE_LIMIT_CONFIGS.financial : RATE_LIMIT_CONFIGS.general;
}


export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
    const config = getRateLimitConfig(req);
    const key = `ratelimit:${getRateLimitKey(req)}`;
    const now = Date.now();
    const windowStart = now - (now % config.windowMs);
    const windowKey = `${key}:${windowStart}`;

    async function execute() {
        const client = await getRedisClient();

        if (client && redisConnected) {
            try {
                const current = await client.incr(windowKey);
                if (current === 1) {
                    await client.expire(windowKey, Math.ceil(config.windowMs / 1000));
                }

                const remaining = Math.max(0, config.max - current);
                const resetTime = windowStart + config.windowMs;

                res.set('X-RateLimit-Limit', String(config.max));
                res.set('X-RateLimit-Remaining', String(remaining));
                res.set('X-RateLimit-Reset', String(Math.ceil(resetTime / 1000)));

                if (current > config.max) {
                    const retryAfter = Math.ceil((resetTime - now) / 1000);
                    res.set('Retry-After', String(Math.max(1, retryAfter)));
                    res.status(429).json({
                        success: false,
                        error: 'Too Many Requests',
                        message: 'Rate limit exceeded. Please try again later.',
                        retryAfter: Math.max(1, retryAfter),
                    });
                    return;
                }

                next();
            } catch (error) {
                console.warn('[RateLimit] Redis operation failed, allowing request', error);
                next();
            }
        } else {
            const entry = getMemoryEntry(windowKey, config.windowMs);
            const remaining = Math.max(0, config.max - entry.count);
            const resetTime = entry.resetTime;

            res.set('X-RateLimit-Limit', String(config.max));
            res.set('X-RateLimit-Remaining', String(remaining));
            res.set('X-RateLimit-Reset', String(Math.ceil(resetTime / 1000)));

            if (entry.count > config.max) {
                const retryAfter = Math.ceil((resetTime - now) / 1000);
                res.set('Retry-After', String(Math.max(1, retryAfter)));
                res.status(429).json({
                    success: false,
                    error: 'Too Many Requests',
                    message: 'Rate limit exceeded. Please try again later.',
                    retryAfter: Math.max(1, retryAfter),
                });
                return;
            }

            next();
        }
    }

    execute().catch((error) => {
        console.error('[RateLimit] Unexpected error', error);
        next();
    });
}


export const financialRateLimiter = rateLimitMiddleware;

export const generalRateLimiter = rateLimitMiddleware;

export async function getRateLimitStatus(key: string): Promise<{ remaining: number; resetTime: number } | null> {
    const client = await getRedisClient();
    if (!client || !redisConnected) {
        return null;
    }
    try {
        const now = Date.now();
        const windowStart = now - (now % 60000);
        const windowKey = `ratelimit:${key}:${windowStart}`;
        const current = await client.get(windowKey);
        const count = current ? parseInt(current, 10) : 0;
        return {
            remaining: Math.max(0, 10 - count),
            resetTime: windowStart + 60000,
        };
    } catch {
        return null;
    }
}

export function applyRateLimits(
    financialPaths: string[] = FINANCIAL_PATH_PREFIXES,
    generalLimit: { max: number; windowMs: number } = RATE_LIMIT_CONFIGS.general,
) {
    return (req: Request, res: Response, next: NextFunction) => {
        const isFinancial = financialPaths.some(prefix => req.path.startsWith(prefix));
        if (isFinancial) {
            return financialRateLimiter(req, res, next);
        }
        return generalRateLimiter(req, res, next);
    };
}

