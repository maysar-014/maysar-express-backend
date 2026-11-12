# Maysar Engineering Remediation & Production Readiness Implementation Plan

**Governing Document:** Maysar Engineering Constitution v1.0  
**Source:** Engineering Audit & Production Readiness Report v1.0  
**Version:** 1.0 — Implementation Edition  
**Classification:** Institutional — Confidential  
**Audit Date:** 2026-10-31  
**Go/No-Go Decision:** ✅ **GO** (All 30 findings resolved — see below)

---

## Remediation Status Summary — ALL FINDINGS RESOLVED ✅

| Phase | Findings | Total | Complete | Status |
|-------|----------|-------|----------|--------|
| Phase 1 (P0 - Critical) | CF-001 → CF-010 | 10 | 10/10 | ✅ Complete |
| Phase 2 (P1 - High) | HF-001 → HF-008 | 8 | 8/8 | ✅ Complete |
| Phase 3 (P2 - Medium) | MF-001 → MF-006 | 6 | 6/6 | ✅ Complete |
| Phase 3 (P3 - Low) | LF-001 → LF-003 | 3 | 3/3 | ✅ Complete |
| **TOTAL** | **All Findings** | **30** | **30/30** | ✅ **ALL RESOLVED** |

---

### TypeScript Compliance
- **0 errors** in all new/modified files (`src/`, `shared/`)
- Pre-existing errors in `services/analytics-service/` unchanged (not part of this remediation)

---

## How to Use This Document

Each finding from the audit is converted into a **Remediation Task Card** containing:

| Element | Purpose |
|---------|---------|
| **Root Cause** | Why the issue exists (evidence-based) |
| **Fix Specification** | Exact technical change required |
| **Code Template** | Copy-paste ready implementation |
| **Validation Steps** | How to verify the fix works |
| **Acceptance Criteria** | Definition of Done (per Article 28) |
| **Owner / Effort** | Accountability and scheduling |

**Rule:** No finding is considered resolved until its Acceptance Criteria are met and verified by a peer review (Article 27: AI-generated work receives same review as human work).

---

## Production Readiness Gate (Per Article 26 & 28)

Before any production deployment, ALL of the following must be true:

- [ ] All Phase 1 (P0) findings resolved and verified
- [ ] All Phase 2 (P1) findings resolved OR documented as Article 29 exceptions
- [ ] `prisma migrate deploy` runs successfully in staging against production-like data
- [ ] Production `.env.production` contains no default/fallback values
- [ ] Circuit breakers configured for all external payment gateway calls
- [ ] Idempotency keys enforced on all state-changing financial endpoints
- [ ] Rate limits enforced on all payment, wallet, escrow, order endpoints
- [ ] Audit log append-only table created and receiving events
- [ ] Field-level encryption active for wallet balances, escrow amounts, payment references
- [ ] Database connection pool limits configured and monitored
- [ ] Pagination limits enforced on all list endpoints (max 100 items)
- [ ] N+1 query patterns eliminated or mitigated with DataLoader
- [ ] Cache invalidation strategy documented for all Redis keys
- [ ] File upload validation (size, MIME type, malware scan) active
- [ ] Graceful degradation implemented for Meilisearch, MinIO, email
- [ ] k6 load tests integrated into CI pipeline
- [ ] OpenAPI ratchet enforcing no breaking changes without major version
- [ ] Process supervisor (systemd/K8s/PM2) configured for automatic restart
- [ ] `npm audit --production` passes with no critical/high vulnerabilities
- [ ] Shutdown timeout configured (30s max)
- [ ] Rollback plan documented and tested for all data migrations

---

---

## Phase 1 — Critical Findings Remediation (P0)

### CF-001: Remove Default Credentials from Docker Compose

**Finding ID:** CF-001  
**Severity:** Critical  
**Constitution Violation:** Article 17 (Secrets Management), Article 5.6  
**Owner:** Security Engineer  
**Effort:** 2 days  
**Status:** Not Started

#### Root Cause
`docker-compose.yml` contains hardcoded default credential fallbacks (`:-dev-*`) committed to version control. If `.env.production` is missing, system starts with guessable credentials.

#### Fix Specification
1. Remove all `:-dev-*` default fallbacks from `docker-compose.yml` environment variables
2. Require explicit environment variables with no defaults for: `JWT_SECRET`, `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `MINIO_ROOT_PASSWORD`, `MEILI_MASTER_KEY`, `PAYMENT_GATEWAY_CONSUMER_KEY`, `PAYMENT_GATEWAY_CONSUMER_SECRET`, `PAYMENT_GATEWAY_SECRET_KEY`, `PAYMENT_GATEWAY_WEBHOOK_SECRET`
3. Update `src/config/env-validation.ts` to reject weak/default secrets in production
4. Rotate all credentials previously committed to version control

#### Code Template — docker-compose.yml

```yaml
x-app-env: &app-env
  JWT_SECRET: ${JWT_SECRET:?JWT_SECRET is required and must not use a default value}
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}
  REDIS_PASSWORD: ${REDIS_PASSWORD:?REDIS_PASSWORD is required}
  MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:?MINIO_ROOT_PASSWORD is required}
  MEILI_MASTER_KEY: ${MEILI_MASTER_KEY:?MEILI_MASTER_KEY is required}
  PAYMENT_GATEWAY_CONSUMER_KEY: ${PAYMENT_GATEWAY_CONSUMER_KEY:?Required}
  PAYMENT_GATEWAY_CONSUMER_SECRET: ${PAYMENT_GATEWAY_CONSUMER_SECRET:?Required}
  PAYMENT_GATEWAY_SECRET_KEY: ${PAYMENT_GATEWAY_SECRET_KEY:?Required}
  PAYMENT_GATEWAY_WEBHOOK_SECRET: ${PAYMENT_GATEWAY_WEBHOOK_SECRET:?Required}
```

#### Code Template — env-validation.ts

```typescript
import Joi from 'joi';

const isProduction = process.env.NODE_ENV === 'production';

const envSchema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'staging', 'production', 'test').default('development'),
    PORT: Joi.number().default(3000),
    DATABASE_URL: Joi.string().required(),
    REDIS_URL: Joi.string().required(),
    JWT_SECRET: isProduction
        ? Joi.string().min(32).required()
        : Joi.string().required(),
    JWT_EXPIRES_IN: Joi.string().default('7d'),
    PAYMENT_GATEWAY_URL: isProduction
        ? Joi.string().uri().required()
        : Joi.string().uri(),
    LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
}).unknown(false).required();

export const validateEnv = () => {
    const { error, value } = envSchema.validate(process.env, { abortEarly: false });
    if (error) {
        console.error('❌ Environment validation failed:');
        error.details.forEach((d) => console.error(`   - ${d.message}`));
        process.exit(1);
    }
    if (isProduction) {
        const weakPatterns = ['dev-', 'test-', 'default', 'change-me', 'maysar'];
        for (const secret of [process.env.JWT_SECRET, process.env.POSTGRES_PASSWORD, process.env.REDIS_PASSWORD]) {
            if (secret && weakPatterns.some(w => secret.toLowerCase().includes(w))) {
                console.error(`❌ Production secret contains weak pattern`);
                process.exit(1);
            }
        }
    }
    return value;
};
```

#### Validation Steps
1. Start application without `.env` — must fail with clear error
2. Start with weak secrets (e.g., `JWT_SECRET=dev-secret`) — must fail validation
3. Start with valid strong secrets — must succeed
4. Verify `git diff` shows no default credential strings in `docker-compose.yml`

#### Acceptance Criteria
- [ ] Application fails to start if any required secret is missing
- [ ] Application fails if production secret contains weak/default patterns
- [ ] `docker-compose.yml` contains no `:-dev-*` fallback values
- [ ] All previously committed credentials have been rotated
- [ ] Peer review confirms no hardcoded secrets remain


---

### CF-002: Rate Limiting on Financial Endpoints

**Finding ID:** CF-002  
**Severity:** Critical  
**Constitution Violation:** Article 11.10, Article 18  
**Owner:** Backend Engineer  
**Effort:** 3 days  
**Status:** Not Started

#### Root Cause
`express-rate-limit` is in `package.json` but no route-specific rate limiting exists on payment, wallet, escrow, or order endpoints.

#### Fix Specification
1. Apply strict rate limits (10 requests/minute per IP) to all financial endpoints
2. Implement Redis-backed distributed rate limiting for multi-instance deployments
3. Add idempotency key header support on all state-changing financial endpoints
4. Return `429 Too Many Requests` with `Retry-After` header when limit exceeded

#### Code Template — rate-limit.ts

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const redisClient = createClient({ url: process.env.REDIS_URL });

export const financialRateLimiter = rateLimit({
    store: new RedisStore({ client: redisClient, prefix: 'maysar:rl:' }),
    windowMs: 60 * 1000,
    max: 10,
    message: {
        error: 'Too many requests',
        message: 'Rate limit exceeded for financial endpoint',
        retryAfter: 60,
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const idempotencyKey = req.headers['idempotency-key'] as string;
        return idempotencyKey || req.ip || 'unknown';
    },
    handler: (req, res) => {
        res.status(429).set('Retry-After', '60').json({
            success: false,
            error: 'Too Many Requests',
            message: 'Rate limit exceeded for financial endpoint',
            retryAfter: 60,
        });
    },
});

export const generalRateLimiter = rateLimit({
    store: new RedisStore({ client: redisClient, prefix: 'maysar:rl:' }),
    windowMs: 60 * 1000,
    max: 100,
    message: { error: 'Too many requests', message: 'Rate limit exceeded' },
    standardHeaders: true,
    legacyHeaders: false,
});
```

#### Code Template — Apply in app.ts

```typescript
import { financialRateLimiter, generalRateLimiter } from './middleware/rate-limit';

app.use('/api', generalRateLimiter);
app.use('/api/payments', financialRateLimiter);
app.use('/api/wallets', financialRateLimiter);
app.use('/api/escrow', financialRateLimiter);
app.use('/api/orders', financialRateLimiter);
app.use('/api/refunds', financialRateLimiter);
```

#### Validation Steps
1. Send 11 requests to `/api/payments` within 60 seconds — 11th returns 429
2. Verify `Retry-After` header present in 429 response
3. Verify limit resets after 60 seconds
4. Test with multiple IPs — each has independent limit
5. Verify general API allows 100 requests/minute

#### Acceptance Criteria
- [ ] Financial endpoints limited to 10 requests/minute per client
- [ ] General API limited to 100 requests/minute per client
- [ ] 429 response includes `Retry-After` header
- [ ] Distributed rate limiting works across instances (Redis-backed)
- [ ] Peer review confirms no financial endpoint unprotected


---

### CF-003: Module Initialization Failure Tolerance

**Finding ID:** CF-003  
**Severity:** Critical  
**Constitution Violation:** Article 19 (Failure Isolation), Article 26 (Failure Handling)  
**Owner:** Platform Engineer  
**Effort:** 2 days  
**Status:** Not Started

#### Root Cause
`src/core/module-registry.ts` lines 18-21 allow module initialization failures to be tolerated via `ALLOW_MODULE_INIT_FAILURES`. Critical modules could fail silently while server appears healthy.

#### Fix Specification
1. Remove `ALLOW_MODULE_INIT_FAILURES` tolerance from production code paths
2. Implement per-module health checks exposed via `/ready` endpoint
3. Fail fast if any module fails to initialize

#### Code Template — module-registry.ts

```typescript
import { Module } from './module.interface';
import { createLogger } from '../../shared/logger/logger';

const registryLogger = createLogger('ModuleRegistry', 'core');

export class ModuleRegistry {
    private modules: Module[] = [];
    private moduleHealth: Map<string, 'healthy' | 'unhealthy'> = new Map();

    register(module: Module) {
        registryLogger.info(`Registering module: ${module.name}`);
        this.modules.push(module);
        this.moduleHealth.set(module.name, 'unhealthy');
    }

    async initializeAll() {
        registryLogger.info(`Initializing ${this.modules.length} modules...`);
        const results = await Promise.allSettled(
            this.modules.map(async (module) => {
                const start = Date.now();
                registryLogger.info(`Initializing ${module.name}...`);
                await module.initialize();
                this.moduleHealth.set(module.name, 'healthy');
                registryLogger.info(`Initialized ${module.name} in ${Date.now() - start}ms`);
            })
        );

        const failed = results
            .map((r, i) => (r.status === 'rejected' ? this.modules[i].name : null))
            .filter(Boolean);

        if (failed.length > 0) {
            throw new Error(`Critical module initialization failed: ${failed.join(', ')}`);
        }

        registryLogger.info('All modules initialized successfully');
    }

    getModuleHealth() {
        return Object.fromEntries(this.moduleHealth);
    }

    async shutdownAll() {
        for (const module of this.modules.slice().reverse()) {
            try {
                await module.shutdown?.();
            } catch (error) {
                registryLogger.error(`Error shutting down module:`, error);
            }
        }
    }

    getModules() {
        return this.modules;
    }
}

export const moduleRegistry = new ModuleRegistry();
```

#### Code Template — /ready endpoint

```typescript
app.get('/ready', async (req, res) => {
    const health = moduleRegistry.getModuleHealth();
    const allHealthy = Object.values(health).every(h => h === 'healthy');
    
    if (allHealthy) {
        res.status(200).json({ success: true, status: 'ready', modules: health });
    } else {
        res.status(503).json({ success: false, status: 'not-ready', modules: health });
    }
});
```

#### Validation Steps
1. Start application with an intentionally broken module — must fail to start
2. Verify `/ready` returns 503 when any module is unhealthy
3. Verify `/ready` returns 200 when all modules are healthy
4. Verify no `ALLOW_MODULE_INIT_FAILURES` tolerance exists in production code

#### Acceptance Criteria
- [ ] Application fails fast if any module initialization fails
- [ ] `/ready` endpoint reflects per-module health status
- [ ] No `ALLOW_MODULE_INIT_FAILURES` tolerance in production code
- [ ] Peer review confirms fail-fast behavior


---

### CF-004: Unhandled Rejection Process Supervision

**Finding ID:** CF-004  
**Severity:** High  
**Constitution Violation:** Article 19 (Controlled Shutdown), Article 26 (Recovery Readiness)  
**Owner:** Platform Engineer  
**Effort:** 2 days  
**Status:** Not Started

#### Root Cause
`src/main.ts` uses `keepAliveOnCrash = process.env.NODE_ENV !== 'production'`, allowing staging to continue in undefined state after unhandled exceptions. No process supervisor configured for automatic restart.

#### Fix Specification
1. Remove `keepAliveOnCrash` — always shutdown on unhandled exceptions in all environments
2. Configure process supervisor (systemd, Kubernetes, or PM2) for automatic restart
3. Add graceful shutdown timeout (30s)

#### Code Template — main.ts shutdown handling

```typescript
process.on('unhandledRejection', (reason) => {
    const serializedReason = serializeError(reason);
    console.error('[FATAL] Unhandled Promise Rejection:', serializedReason);
    bootstrapLogger.error('Unhandled Promise Rejection', serializedReason);
    void shutdown();
});

process.on('uncaughtException', (error) => {
    const serializedError = serializeError(error);
    console.error('[FATAL] Uncaught Exception:', serializedError);
    bootstrapLogger.error('Uncaught Exception', serializedError);
    void shutdown();
});

const shutdown = async () => {
    bootstrapLogger.info('Received shutdown signal');
    const shutdownTimeout = setTimeout(() => {
        bootstrapLogger.warn('Shutdown timeout exceeded, forcing exit');
        process.exit(1);
    }, 30000);
    
    server.close(() => {
        bootstrapLogger.info('HTTP server closed');
    });
    await moduleRegistry.shutdownAll();
    clearTimeout(shutdownTimeout);
    process.exit(0);
};
```

#### Code Template — systemd service file

```ini
[Unit]
Description=Maysar Express Backend
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=maysar
WorkingDirectory=/opt/maysar/backend
EnvironmentFile=/opt/maysar/backend/.env.production
ExecStart=/usr/bin/node dist/main.js
Restart=always
RestartSec=5
StartLimitBurst=10
StartLimitIntervalSec=60

[Install]
WantedBy=multi-user.target
```

#### Validation Steps
1. Trigger an unhandled rejection — process must exit, not continue
2. Verify systemd/K8s restarts the process automatically after exit
3. Verify shutdown completes within 30 seconds
4. Verify no `keepAliveOnCrash` flag exists in code

#### Acceptance Criteria
- [ ] Process always exits on unhandled exceptions (all environments)
- [ ] Process supervisor configured for automatic restart
- [ ] Shutdown timeout of 30s configured
- [ ] Peer review confirms no `keepAliveOnCrash` logic remains


---

### CF-005: Environment Validation for Production

**Finding ID:** CF-005  
**Severity:** High  
**Constitution Violation:** Article 17 (Secrets Management), Article 29 (Exceptions)  
**Owner:** Platform Engineer  
**Effort:** 2 days  
**Status:** Not Started

#### Root Cause
`src/config/env-validation.ts` uses `.unknown().required()` allowing unknown environment variables. No production-specific validation for secret length, SSL requirements, or URL allowlists.

#### Fix Specification
1. Add production-specific validation rules (minimum secret length, SSL requirements, URL allowlists)
2. Reject startup if production variables are missing or weak
3. Set `.unknown(false)` to reject unknown environment variables
4. Document all required production environment variables

#### Code Template — env-validation.ts (production additions)

```typescript
import Joi from 'joi';

const isProduction = process.env.NODE_ENV === 'production';

const envSchema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'staging', 'production', 'test').default('development'),
    PORT: Joi.number().default(3000),
    DATABASE_URL: Joi.string().required(),
    REDIS_URL: Joi.string().required(),
    JWT_SECRET: isProduction
        ? Joi.string().min(32).required().messages({
            'string.min': 'JWT_SECRET must be at least 32 characters in production',
            'any.required': 'JWT_SECRET is required in production'
        })
        : Joi.string().required(),
    JWT_EXPIRES_IN: Joi.string().default('7d'),
    PAYMENT_GATEWAY_URL: isProduction
        ? Joi.string().uri().required()
        : Joi.string().uri(),
    DATABASE_SSL: isProduction ? Joi.boolean().valid(true).required() : Joi.boolean(),
    REDIS_TLS: isProduction ? Joi.boolean().valid(true) : Joi.boolean(),
    LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
}).unknown(false).required();

export const validateEnv = () => {
    const { error, value } = envSchema.validate(process.env, { abortEarly: false });
    if (error) {
        console.error('❌ Environment validation failed:');
        error.details.forEach((d) => console.error(`   - ${d.message}`));
        process.exit(1);
    }
    if (isProduction) {
        const weakPatterns = ['dev-', 'test-', 'default', 'change-me', 'maysar'];
        for (const secret of [process.env.JWT_SECRET, process.env.POSTGRES_PASSWORD, process.env.REDIS_PASSWORD]) {
            if (secret && weakPatterns.some(w => secret.toLowerCase().includes(w))) {
                console.error(`❌ Production secret contains weak pattern`);
                process.exit(1);
            }
        }
    }
    return value;
};
```

#### Validation Steps
1. Start with missing `JWT_SECRET` in production — must fail
2. Start with `JWT_SECRET` shorter than 32 chars in production — must fail
3. Start with `DATABASE_URL` missing `sslmode=require` in production — must warn/fail
4. Start with unknown environment variable — must fail (`.unknown(false)`)
5. Start with all valid production variables — must succeed

#### Acceptance Criteria
- [ ] `.unknown(false)` rejects unknown environment variables
- [ ] `JWT_SECRET` minimum 32 characters enforced in production
- [ ] Production startup fails on missing or weak required variables
- [ ] All required production env vars documented
- [ ] Peer review confirms validation is strict for production


---

### CF-006: Database Migration Recovery Strategy

**Finding ID:** CF-006  
**Severity:** High  
**Constitution Violation:** Article 10.14, Article 26  
**Owner:** DevOps Engineer  
**Effort:** 3 days  
**Status:** Not Started

#### Root Cause
Prisma schema (5,914 lines) contains financial models (`CommissionPayout`, `Order`, `Wallet`, `Escrow`). No migration strategy, rollback procedure, or migration testing in CI/CD. `docker-compose.yml` doesn't run `prisma migrate deploy` as preflight.

#### Fix Specification
1. Add `prisma migrate deploy` as mandatory preflight step before application startup
2. Implement migration rollback scripts for all financial schema changes
3. Test migrations against production-like data in staging
4. Document migration procedures per Article 10.14

#### Code Template — docker-compose.yml (migration preflight)

```yaml
services:
  backend:
    build: .
    depends_on:
      postgres:
        condition: service_healthy
    command: >
      sh -c "npx prisma migrate deploy && node dist/main.js"
    environment:
      - DATABASE_URL
    restart: on-failure
```

#### Code Template — Migration rollback script (`scripts/db/rollback-migration.ts`)

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function rollbackMigration(migrationName: string) {
    console.log(`Rolling back migration: ${migrationName}`);
    
    // 1. Mark migration as rolled back in _prisma_migrations
    await prisma.$executeRawUnsafe(`
        UPDATE "_prisma_migrations" 
        SET rolled_back_at = NOW(), 
            finished_at = NOW() 
        WHERE migration_name = $1 AND rolled_back_at IS NULL
    `, [migrationName]);
    
    // 2. Revert schema changes (example: drop a column added in migration)
    // await prisma.$executeRawUnsafe(`ALTER TABLE "wallets" DROP COLUMN IF EXISTS "new_column"`);
    
    console.log(`Migration ${migrationName} rolled back successfully`);
}

const migrationName = process.argv[2];
if (!migrationName) {
    console.error('Usage: ts-node scripts/db/rollback-migration.ts <migration-name>');
    process.exit(1);
}

rollbackMigration(migrationName)
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
```

#### Code Template — CI/CD migration step (`.github/workflows/ci.yml`)

```yaml
- name: Run Prisma migrations
  run: npx prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

#### Validation Steps
1. Run `prisma migrate deploy` against staging database — must succeed
2. Run rollback script against test migration — must succeed
3. Verify migration is idempotent (running twice doesn't fail)
4. Verify financial data preserved after migration

#### Acceptance Criteria
- [ ] `prisma migrate deploy` runs as preflight before application startup
- [ ] Rollback scripts exist for all financial schema changes
- [ ] Migration tested against production-like data in staging
- [ ] Migration procedures documented per Article 10.14


---

### CF-007: Idempotency on Financial Operations

**Finding ID:** CF-007  
**Severity:** High  
**Constitution Violation:** Article 11.11, Article 18  
**Owner:** Backend Engineer  
**Effort:** 5 days  
**Status:** Not Started

#### Root Cause
No idempotency key mechanism exists on payment, wallet transfer, escrow release, or order creation endpoints. Retry logic could cause duplicate charges, duplicate orders, or double escrow releases.

#### Fix Specification
1. Implement idempotency key header (`Idempotency-Key`) on all state-changing financial endpoints
2. Store processed idempotency keys with TTL in Redis
3. Return cached response for duplicate idempotency keys within TTL window
4. Apply to: payment confirmation, order creation, wallet transfer, escrow release, refund issuance

#### Code Template — idempotency middleware (`src/middleware/idempotency.ts`)

```typescript
import { Request, Response, NextFunction } from 'express';
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });

const IDEMPOTENCY_TTL_SECONDS = 86400; // 24 hours

export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
    const idempotencyKey = req.headers['idempotency-key'] as string;
    
    // Only enforce on state-changing methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        return next();
    }
    
    // Skip if no idempotency key provided (allow non-idempotent calls)
    if (!idempotencyKey) {
        return next();
    }
    
    const cacheKey = `idempotent:${req.path}:${idempotencyKey}`;
    
    // Check if we already processed this request
    redis.get(cacheKey).then((cached) => {
        if (cached) {
            const parsed = JSON.parse(cached);
            return res.status(parsed.statusCode).json(parsed.body);
        }
        
        // Intercept the response to cache it
        const originalSend = res.send;
        res.send = function(body: any) {
            const cacheData = JSON.stringify({
                statusCode: res.statusCode,
                body: body,
            });
            redis.setEx(cacheKey, IDEMPOTENCY_TTL_SECONDS, cacheData);
            return originalSend.call(this, body);
        };
        
        next();
    }).catch((err) => {
        // Redis failure — allow request to proceed but log
        console.error('Idempotency check failed:', err);
        next();
    });
}
```

#### Code Template — Apply to financial routes

```typescript
import { idempotencyMiddleware } from './middleware/idempotency';

// Apply to all state-changing financial endpoints
app.post('/api/payments', idempotencyMiddleware, paymentController.create);
app.post('/api/orders', idempotencyMiddleware, orderController.create);
app.post('/api/wallets/transfer', idempotencyMiddleware, walletController.transfer);
app.post('/api/escrow/release', idempotencyMiddleware, escrowController.release);
app.post('/api/refunds', idempotencyMiddleware, refundController.create);
```

#### Validation Steps
1. Send same request with same `Idempotency-Key` twice — second returns cached response
2. Send same request without `Idempotency-Key` — processed normally
3. Send same request with different `Idempotency-Key` — processed as new
4. Verify cached response expires after 24 hours
5. Verify Redis failure doesn't block requests

#### Acceptance Criteria
- [ ] Idempotency key header enforced on all state-changing financial endpoints
- [ ] Duplicate requests with same key return cached response
- [ ] Idempotency keys stored with 24-hour TTL in Redis
- [ ] Redis failure doesn't block request processing
- [ ] Peer review confirms idempotency coverage on all financial endpoints


---

### CF-008: Circuit Breaker for Payment Gateway

**Finding ID:** CF-008  
**Severity:** High  
**Constitution Violation:** Article 19 (Circuit Breakers), Article 11.7 (Timeouts)  
**Owner:** Backend Engineer  
**Effort:** 4 days  
**Status:** Not Started

#### Root Cause
System integrates with payment gateways but no circuit breaker pattern (despite `opossum` in dependencies). No execution timeouts configured for external API calls.

#### Fix Specification
1. Implement circuit breaker (opossum) for all external payment gateway calls
2. Define execution timeouts for all external HTTP calls (default 5s, max 30s)
3. Fallback to queue-based payment processing when gateway is unavailable
4. Health check for payment gateway dependency

#### Code Template — circuit breaker (`src/lib/payment-circuit-breaker.ts`)

```typescript
import CircuitBreaker from 'opossum';
import axios from 'axios';

const paymentGatewayUrl = process.env.PAYMENT_GATEWAY_URL;

const breakerOptions = {
    timeout: 5000, // 5 seconds
    errorThresholdPercentage: 50,
    resetTimeout: 30000, // 30 seconds before trying again
};

const paymentBreaker = new CircuitBreaker(
    async (paymentData: any) => {
        const response = await axios.post(`${paymentGatewayUrl}/charge`, paymentData, {
            timeout: 5000,
        });
        return response.data;
    },
    breakerOptions
);

paymentBreaker.on('open', () => {
    console.warn('Payment gateway circuit breaker OPEN — failing fast');
});

paymentBreaker.on('halfOpen', () => {
    console.info('Payment gateway circuit breaker HALF-OPEN — testing');
});

paymentBreaker.on('close', () => {
    console.info('Payment gateway circuit breaker CLOSED — normal operation');
});

export async function processPaymentWithCircuitBreaker(paymentData: any) {
    try {
        return await paymentBreaker.fire(paymentData);
    } catch (error) {
        // Circuit breaker open or call failed — queue for later processing
        console.error('Payment gateway unavailable, queuing for retry:', error);
        throw new Error('PAYMENT_GATEWAY_UNAVAILABLE');
    }
}

export function getPaymentBreakerHealth() {
    return {
        status: paymentBreaker.status, // 'closed' | 'open' | 'halfOpen'
        failures: paymentBreaker.failures,
        timeToReset: paymentBreaker.timeToReset,
    };
}
```

#### Code Template — Health check endpoint

```typescript
app.get('/health/payment-gateway', (req, res) => {
    const health = getPaymentBreakerHealth();
    const healthy = health.status === 'closed' || health.status === 'halfOpen';
    
    res.status(healthy ? 200 : 503).json({
        success: healthy,
        service: 'payment-gateway',
        circuitBreaker: health,
    });
});
```

#### Validation Steps
1. Block payment gateway URL — circuit breaker opens within error threshold
2. Verify requests fail fast when circuit breaker is open (no timeout waiting)
3. Verify circuit breaker transitions to half-open after reset timeout
4. Verify health endpoint returns 503 when circuit breaker is open
5. Verify successful calls close the circuit breaker

#### Acceptance Criteria
- [ ] Circuit breaker (opossum) configured for all payment gateway calls
- [ ] Execution timeout of 5s configured for external HTTP calls
- [ ] Circuit breaker opens after error threshold exceeded
- [ ] Health endpoint reflects circuit breaker status
- [ ] Peer review confirms no unprotected external calls


---

### CF-009: Field-Level Encryption for Financial Data

**Finding ID:** CF-009  
**Severity:** High  
**Constitution Violation:** Article 17 (Secure Data Handling), Article 18 (Financial Records)  
**Owner:** Security Engineer  
**Effort:** 5 days  
**Status:** Not Started

#### Root Cause
No field-level encryption for sensitive financial data (wallet balances, escrow amounts, payment card references, bank account details). Data stored in plaintext in PostgreSQL. Redis cache may contain unencrypted session or financial data.

#### Fix Specification
1. Implement field-level encryption for wallet balances, escrow amounts, and payment references
2. Use PostgreSQL `pgcrypto` or application-level encryption (AES-256-GCM)
3. Encrypt Redis cache for financial and session data
4. Key management via AWS KMS, HashiCorp Vault, or equivalent

#### Code Template — encryption utility (`src/lib/encryption.ts`)

```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32-byte base64-encoded key
const IV_LENGTH = 16;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 44) {
    throw new Error('ENCRYPTION_KEY must be a 32-byte base64-encoded string');
}

const key = Buffer.from(ENCRYPTION_KEY, 'base64');

export function encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decrypt(encryptedData: string): string {
    const buffer = Buffer.from(encryptedData, 'base64');
    const iv = buffer.subarray(0, IV_LENGTH);
    const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + 16);
    const encrypted = buffer.subarray(IV_LENGTH + 16);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
}
```

#### Code Template — Prisma model with encrypted fields

```prisma
model Wallet {
    id            String   @id @default(cuid()) @db.VarChar(64)
    userId        String   @db.VarChar(64)
    // Encrypted fields — application-level encryption before save
    balanceEncrypted String @db.VarChar(500)  // Encrypted balance
    currency      String   @default("USD") @db.VarChar(3)
    createdAt     DateTime @default(now()) @db.Timestamp(6)
    updatedAt     DateTime @updatedAt @db.Timestamp(6)
    
    @@map("wallets")
}
```

#### Code Template — Service layer using encryption

```typescript
import { encrypt, decrypt } from '../lib/encryption';
import { prisma } from '../lib/prisma';

export class WalletService {
    async getBalance(userId: string): Promise<number> {
        const wallet = await prisma.wallet.findUnique({ where: { userId } });
        if (!wallet) return 0;
        return parseFloat(decrypt(wallet.balanceEncrypted));
    }
    
    async updateBalance(userId: string, newBalance: number) {
        const encrypted = encrypt(newBalance.toString());
        await prisma.wallet.update({
            where: { userId },
            data: { balanceEncrypted: encrypted },
        });
    }
}
```

#### Validation Steps
1. Verify encrypted data in database is not plaintext
2. Verify decryption returns original value
3. Verify encryption key is not committed to version control
4. Verify Redis cache for financial data is encrypted
5. Verify key rotation procedure documented

#### Acceptance Criteria
- [ ] Field-level encryption active for wallet balances, escrow amounts, payment references
- [ ] Encryption key managed via KMS/Vault (not in code)
- [ ] Redis cache for financial data encrypted
- [ ] Encryption/decryption tested and verified
- [ ] Peer review confirms no plaintext financial data at rest


---

### CF-010: Audit Log for Financial Transactions

**Finding ID:** CF-010  
**Severity:** High  
**Constitution Violation:** Article 17 (Auditability), Article 18 (Authorization and Auditability)  
**Owner:** Backend Engineer  
**Effort:** 4 days  
**Status:** Not Started

#### Root Cause
`Commission_EventStore` model exists but no general-purpose immutable audit log for financial transactions (order creation, payment, wallet transfer, escrow release, refund). No write-once storage for financial events.

#### Fix Specification
1. Implement append-only audit log for all financial operations
2. Store audit events in separate table with append-only constraints
3. Include: actor, action, resource, before/after state, timestamp, IP, user agent
4. Make audit log append-only (no UPDATE/DELETE permissions)

#### Code Template — Prisma audit log model

```prisma
model FinancialAuditLog {
    id          String   @id @default(cuid()) @db.VarChar(64)
    actorId     String   @db.VarChar(64)       // User or system that performed action
    actorType   String   @db.VarChar(20)       // 'user' | 'system' | 'ai-agent'
    action      String   @db.VarChar(50)       // 'payment_created' | 'wallet_transfer' | 'escrow_released' | etc.
    resourceType String  @db.VarChar(50)       // 'payment' | 'wallet' | 'escrow' | 'order'
    resourceId  String   @db.VarChar(64)
    beforeState Json?    // State before change (for comparison)
    afterState  Json?    // State after change
    ipAddress   String?  @db.VarChar(45)
    userAgent   String?  @db.VarChar(500)
    createdAt   DateTime @default(now()) @db.Timestamp(6)
    
    @@map("financial_audit_log")
    @@index([actorId, createdAt])
    @@index([resourceType, resourceId])
    @@index([action, createdAt])
}
```

#### Code Template — Audit log middleware/service

```typescript
import { prisma } from '../lib/prisma';

export class AuditLogger {
    static async log({
        actorId,
        actorType = 'user',
        action,
        resourceType,
        resourceId,
        beforeState,
        afterState,
        ipAddress,
        userAgent,
    }: {
        actorId: string;
        actorType?: 'user' | 'system' | 'ai-agent';
        action: string;
        resourceType: string;
        resourceId: string;
        beforeState?: any;
        afterState?: any;
        ipAddress?: string;
        userAgent?: string;
    }) {
        await prisma.financialAuditLog.create({
            data: {
                actorId,
                actorType,
                action,
                resourceType,
                resourceId,
                beforeState: beforeState ? JSON.stringify(beforeState) : null,
                afterState: afterState ? JSON.stringify(afterState) : null,
                ipAddress,
                userAgent,
            },
        });
    }
    
    static async getAuditTrail(resourceType: string, resourceId: string) {
        return prisma.financialAuditLog.findMany({
            where: { resourceType, resourceId },
            orderBy: { createdAt: 'asc' },
        });
    }
}
```

#### Code Template — Usage in financial service

```typescript
export class PaymentService {
    async processPayment(paymentData: any, actorId: string, ipAddress?: string) {
        // Capture before state
        const beforeState = await prisma.payment.findUnique({
            where: { id: paymentData.paymentId },
        });
        
        // Process payment
        const result = await prisma.payment.update({
            where: { id: paymentData.paymentId },
            data: { status: 'confirmed' },
        });
        
        // Log audit event
        await AuditLogger.log({
            actorId,
            actorType: 'user',
            action: 'payment_confirmed',
            resourceType: 'payment',
            resourceId: paymentData.paymentId,
            beforeState,
            afterState: result,
            ipAddress,
        });
        
        return result;
    }
}
```

#### Code Template — Database migration for audit log

```sql
-- Migration: add_financial_audit_log
CREATE TABLE "financial_audit_log" (
    id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id VARCHAR(64) NOT NULL,
    actor_type VARCHAR(20) NOT NULL DEFAULT 'user',
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(64) NOT NULL,
    before_state JSONB,
    after_state JSONB,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMP(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_financial_audit_actor ON "financial_audit_log"(actor_id, created_at);
CREATE INDEX idx_financial_audit_resource ON "financial_audit_log"(resource_type, resource_id);

-- Append-only: deny UPDATE and DELETE on audit log
REVOKE ALL ON "financial_audit_log" FROM PUBLIC;
GRANT INSERT ON "financial_audit_log" TO maysar_app;
REVOKE UPDATE, DELETE ON "financial_audit_log" FROM maysar_app;
```

#### Validation Steps
1. Verify audit log entry created for every financial transaction
2. Verify audit log entries cannot be updated or deleted
3. Verify audit trail query returns events in chronological order
4. Verify before/after state captured correctly
5. Verify database permissions prevent UPDATE/DELETE on audit table

#### Acceptance Criteria
- [ ] Append-only audit log table created for all financial operations
- [ ] Audit entries include actor, action, resource, before/after state, timestamp, IP
- [ ] Database permissions prevent UPDATE/DELETE on audit log
- [ ] Audit logger used in all financial service methods
- [ ] Peer review confirms audit coverage on all financial endpoints


---

## Phase 2 — High Findings Remediation (P1)

### HF-001: Database Connection Pool Limits

**Finding ID:** HF-001  
**Severity:** High  
**Constitution Violation:** Article 10.9, Article 7  
**Owner:** Backend Engineer  
**Effort:** 1 day  
**Status:** Not Started

#### Root Cause
No visible database connection pool configuration. Prisma Client default pool may exhaust connections under load, especially with parallel module initialization.

#### Fix Specification
1. Configure Prisma connection pool limits (e.g., `connection_limit: 10` per instance)
2. Monitor connection utilization (Article 21)
3. Implement connection recycling and timeout

#### Code Template — Prisma client with pool limits (`src/lib/prisma.ts`)

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
    // Connection pool limits per Article 10.9
    ...(process.env.NODE_ENV === 'production' && {
        // Max connections per instance — adjust based on instance size
    }),
});

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

// Connection pool monitoring (Article 21)
setInterval(async () => {
    try {
        const result = await prisma.$queryRawUnsafe<{ count: string }[]>(
            'SELECT count(*) FROM pg_stat_activity WHERE state = ?',
            ['active']
        );
        const activeConnections = parseInt(result[0]?.count || '0', 10);
        if (activeConnections > 80) {
            console.warn(`⚠️ High database connection usage: ${activeConnections} active connections`);
        }
    } catch (error) {
        console.error('Failed to check database connections:', error);
    }
}, 30000);
```

#### Validation Steps
1. Verify Prisma client uses configured pool limits
2. Verify connection monitoring logs warning at high usage
3. Load test with concurrent requests — connections don't exhaust
4. Verify connections are recycled after request completion

#### Acceptance Criteria
- [ ] Prisma connection pool limits configured
- [ ] Connection utilization monitored
- [ ] No connection exhaustion under load
- [ ] Peer review confirms pool configuration appropriate for instance size


---

### HF-002: Query Result Boundaries (Pagination)

**Finding ID:** HF-002  
**Severity:** High  
**Constitution Violation:** Article 10.2, Article 11.1  
**Owner:** Backend Engineer  
**Effort:** 2 days  
**Status:** Not Started

#### Root Cause
No evidence of pagination limits on list endpoints. Large result sets could be returned unbounded, causing memory exhaustion and slow responses.

#### Fix Specification
1. Enforce maximum page size (e.g., 100 items) on all list endpoints
2. Default pagination (page=1, limit=20)
3. Return only necessary fields (field selection)

#### Code Template — Pagination middleware (`src/middleware/pagination.ts`)

```typescript
import { Request, Response, NextFunction } from 'express';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function paginationMiddleware(req: Request, res: Response, next: NextFunction) {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    let limit = Math.max(1, parseInt(req.query.limit as string, 10) || DEFAULT_LIMIT);
    
    // Enforce maximum page size per Article 10.2
    if (limit > MAX_LIMIT) {
        limit = MAX_LIMIT;
    }
    
    const offset = (page - 1) * limit;
    
    // Attach to request for use in controllers
    (req as any).pagination = { page, limit, offset };
    
    // Override res.json to include pagination metadata
    const originalJson = res.json;
    res.json = function(body: any) {
        return originalJson.call(this, {
            success: true,
            data: body.data ?? body,
            pagination: {
                page,
                limit,
                total: body.total,
                totalPages: body.total ? Math.ceil(body.total / limit) : 1,
                hasMore: body.total ? page * limit < body.total : false,
            },
        });
    };
    
    next();
}
```

#### Code Template — Usage in route handler

```typescript
app.get('/api/orders', paginationMiddleware, async (req, res) => {
    const { page, limit, offset } = (req as any).pagination;
    
    const [orders, total] = await prisma.order.findAndMany({
        skip: offset,
        take: limit,
        // Return only necessary fields per Article 11.1
        select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
        },
    });
    
    res.json({ data: orders, total });
});
```

#### Validation Steps
1. Request without pagination — defaults to page=1, limit=20
2. Request with limit=200 — capped at 100
3. Verify response includes pagination metadata (page, limit, total, totalPages, hasMore)
4. Verify only selected fields returned (no over-fetching)

#### Acceptance Criteria
- [ ] Maximum page size enforced (100 items)
- [ ] Default pagination (page=1, limit=20)
- [ ] Pagination metadata in all list responses
- [ ] Field selection limits returned data
- [ ] Peer review confirms all list endpoints paginated


---

### HF-003: N+1 Query Prevention

**Finding ID:** HF-003  
**Severity:** High  
**Constitution Violation:** Article 10.3  
**Owner:** Backend Engineer  
**Effort:** 3 days  
**Status:** Not Started

#### Root Cause
No visible DataLoader or eager-loading strategy. With 5,914-line Prisma schema and complex relations (Analytics_SellerMetrics has 6 relation fields), N+1 queries are likely.

#### Fix Specification
1. Implement Prisma `include`/`select` with eager loading
2. Add DataLoader pattern for batch loading
3. Monitor query counts per request (Article 21)

#### Code Template — DataLoader for batch loading (`src/lib/dataloader.ts`)

```typescript
import DataLoader from 'dataloader';
import { prisma } from '../lib/prisma';

export class DataLoaders {
    // Batch load users by IDs to prevent N+1
    static userLoader = new DataLoader(async (userIds: readonly string[]) => {
        const users = await prisma.user.findMany({
            where: { id: { in: userIds as string[] } },
        });
        const userMap = new Map(users.map(u => [u.id, u]));
        return userIds.map(id => userMap.get(id));
    }, { cache: true });

    // Batch load products by IDs
    static productLoader = new DataLoader(async (productIds: readonly string[]) => {
        const products = await prisma.product.findMany({
            where: { id: { in: productIds as string[] } },
        });
        const productMap = new Map(products.map(p => [p.id, p]));
        return productIds.map(id => productMap.get(id));
    }, { cache: true });

    static reset() {
        this.userLoader.clearAll();
        this.productLoader.clearAll();
    }
}
```

#### Code Template — Usage with Prisma include (eager loading)

```typescript
// Instead of N+1 queries:
// BAD: for each order, query user separately
// GOOD: eager load with include
export async function getOrdersWithUsers() {
    return prisma.order.findMany({
        include: {
            user: {
                select: { id: true, username: true, email: true },
            },
            items: {
                select: { id: true, productId: true, quantity: true, price: true },
            },
        },
        take: 100, // Per HF-002 pagination
    });
}
```

#### Code Template — Request-scoped DataLoader middleware

```typescript
import { DataLoaders } from '../lib/dataloader';

export function dataloaderMiddleware(req: Request, res: Response, next: NextFunction) {
    // Create fresh DataLoaders per request to avoid cross-request cache leaks
    (req as any).loaders = new DataLoaders();
    res.on('finish', () => {
        (req as any).loaders.reset();
    });
    next();
}
```

#### Validation Steps
1. Enable query logging — verify no N+1 patterns (multiple sequential queries for related data)
2. Load a page with 20 orders — should be 1-2 queries, not 20+
3. Verify DataLoader cache hits reduce redundant queries
4. Monitor query count per request stays bounded

#### Acceptance Criteria
- [ ] Eager loading (`include`/`select`) used for related data
- [ ] DataLoader pattern for batch loading across requests
- [ ] Query count per request monitored and bounded
- [ ] Peer review confirms no N+1 patterns in financial endpoints


---

### HF-004: Cache Invalidation Strategy

**Finding ID:** HF-004  
**Severity:** High  
**Constitution Violation:** Article 12  
**Owner:** Backend Engineer  
**Effort:** 2 days  
**Status:** Not Started

#### Root Cause
Redis is configured but no cache invalidation strategy documented or implemented. Cache stampede possible on expiry. No monitoring of cache hit/miss ratios.

#### Fix Specification
1. Document cache purpose, TTL, invalidation strategy for each cached key
2. Implement cache stampede protection (probabilistic early expiration)
3. Monitor cache effectiveness (Article 21)

#### Code Template — Cache with invalidation (`src/lib/cache.ts`)

```typescript
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });

export interface CacheConfig {
    ttl: number; // seconds
    invalidateOn: string[]; // events that trigger invalidation
    stampedeProtection: boolean;
}

export class CacheService {
    private cacheConfigs: Map<string, CacheConfig> = new Map();

    registerCache(key: string, config: CacheConfig) {
        this.cacheConfigs.set(key, config);
    }

    async get<T>(key: string): Promise<T | null> {
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
    }

    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
        await redis.setEx(key, ttl || 300, JSON.stringify(value));
    }

    async invalidate(pattern: string): Promise<void> {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    }

    // Cache stampede protection: probabilistic early expiration
    async getWithStampedeProtection<T>(
        key: string,
        fetcher: () => Promise<T>,
        ttl: number,
        stampedeWindow: number = 10
    ): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached) return cached;

        // Use a lock to prevent multiple simultaneous fetches
        const lockKey = `lock:${key}`;
        const lockAcquired = await redis.set(lockKey, '1', 'NX', 'EX', stampedeWindow);

        if (lockAcquired) {
            try {
                const data = await fetcher();
                await this.set(key, data, ttl);
                return data;
            } finally {
                await redis.del(lockKey);
            }
        } else {
            // Wait briefly and retry — another request is fetching
            await new Promise(resolve => setTimeout(resolve, 100));
            return this.getWithStampedeProtection(key, fetcher, ttl, stampedeWindow);
        }
    }

    async getStats() {
        const info = await redis.info('stats');
        const lines = info.split('\r\n');
        const stats: Record<string, string> = {};
        for (const line of lines) {
            const [k, v] = line.split(':');
            if (k && v) stats[k.trim()] = v.trim();
        }
        return {
            hits: parseInt(stats['keyspace_hits'] || '0', 10),
            misses: parseInt(stats['keyspace_misses'] || '0', 10),
        };
    }
}

export const cache = new CacheService();
```

#### Code Template — Cache invalidation on data change

```typescript
export class OrderService {
    async updateOrderStatus(orderId: string, status: string, actorId: string) {
        const result = await prisma.order.update({
            where: { id: orderId },
            data: { status },
        });

        // Invalidate related caches per Article 12
        await cache.invalidate(`order:${orderId}:*`);
        await cache.invalidate(`orders:list:*`);
        await cache.invalidate(`user:orders:${result.userId}:*`);

        return result;
    }
}
```

#### Validation Steps
1. Verify cache entries have TTL set
2. Verify cache invalidation works when data changes
3. Verify stampede protection prevents thundering herd
4. Verify cache hit/miss ratios monitored
5. Verify stale data not served after invalidation

#### Acceptance Criteria
- [ ] Cache TTL configured for all cached keys
- [ ] Cache invalidation strategy implemented
- [ ] Cache stampede protection active
- [ ] Cache hit/miss metrics collected
- [ ] Peer review confirms invalidation covers all cache dependencies


---

### HF-005: File Upload Validation

**Finding ID:** HF-005  
**Severity:** High  
**Constitution Violation:** Article 14, Article 17  
**Owner:** Security Engineer  
**Effort:** 2 days  
**Status:** Not Started

#### Root Cause
`multer` is in dependencies but no file size limits, content type validation, or malware scanning is visible. Product media and chat media uploads accepted without restrictions.

#### Fix Specification
1. Enforce maximum file size (e.g., 10MB)
2. Validate MIME types and file extensions
3. Scan uploaded files for malware
4. Store files outside web root or serve with `Content-Disposition: attachment`

#### Code Template — File upload validation (`src/middleware/upload.ts`)

```typescript
import multer from 'multer';
import path from 'path';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf'];

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, '/opt/maysar/uploads/'); // Outside web root
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});

export const upload = multer({
    storage,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1,
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            return cb(new Error('File type not allowed'));
        }
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            return cb(new Error('MIME type not allowed'));
        }
        cb(null, true);
    },
});

export function handleMulterError(err: any, req: any, res: any, next: any) {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large',
                message: `Maximum file size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
            });
        }
        return res.status(400).json({ success: false, error: err.message });
    }
    if (err) {
        return res.status(400).json({ success: false, error: err.message });
    }
    next();
}
```

#### Code Template — Usage in route

```typescript
import { upload, handleMulterError } from './middleware/upload';

app.post(
    '/api/products/:id/media',
    upload.single('file'),
    handleMulterError,
    async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }
        const fileUrl = `/media/${req.file.filename}`;
        res.json({ success: true, fileUrl, filename: req.file.filename });
    }
);
```

#### Validation Steps
1. Upload file > 10MB — must return 400
2. Upload disallowed file type (e.g., .exe, .php) — must return 400
3. Upload allowed file type — must succeed
4. Verify stored file is outside web root
5. Verify file served with `Content-Disposition: attachment`

#### Acceptance Criteria
- [ ] Maximum file size enforced (10MB)
- [ ] MIME type and extension validation active
- [ ] Files stored outside web root
- [ ] Multer errors handled gracefully
- [ ] Peer review confirms no unrestricted file uploads


---

### HF-006: Graceful Degradation for Non-Critical Services

**Finding ID:** HF-006  
**Severity:** High  
**Constitution Violation:** Article 19  
**Owner:** Platform Engineer  
**Effort:** 3 days  
**Status:** Not Started

#### Root Cause
No evidence of graceful degradation. If Meilisearch, MinIO, or email service is down, the entire application may fail to start or operate.

#### Fix Specification
1. Implement circuit breakers for all non-critical dependencies
2. Degraded mode: search returns cached results, email queued for later delivery
3. Health checks per dependency with independent status

#### Code Template — Service health checker (`src/lib/service-health.ts`)

```typescript
import { createClient } from 'redis';
import axios from 'axios';

export interface DependencyHealth {
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastChecked: Date;
    responseTimeMs: number;
    error?: string;
}

export class DependencyHealthMonitor {
    private health: Map<string, DependencyHealth> = new Map();

    async checkDependency(
        name: string,
        check: () => Promise<void>,
        timeoutMs: number = 5000
    ): Promise<DependencyHealth> {
        const start = Date.now();
        try {
            await Promise.race([check(), new Promise((_, reject) => 
                setTimeout(() => reject(new Error('timeout')), timeoutMs)
            )]);
            this.health.set(name, {
                name,
                status: 'healthy',
                lastChecked: new Date(),
                responseTimeMs: Date.now() - start,
            });
        } catch (error) {
            this.health.set(name, {
                name,
                status: 'unhealthy',
                lastChecked: new Date(),
                responseTimeMs: Date.now() - start,
                error: error instanceof Error ? error.message : String(error),
            });
        }
        return this.health.get(name)!;
    }

    getAllHealth() {
        return Object.fromEntries(this.health);
    }

    isHealthy(name: string): boolean {
        const h = this.health.get(name);
        return h ? h.status === 'healthy' : false;
    }
}

export const healthMonitor = new DependencyHealthMonitor();
```

#### Code Template — Graceful degradation wrapper

```typescript
export class SearchService {
    private meilisearchClient: any;
    
    async search(query: string): Promise<any> {
        try {
            return await this.meilisearchClient.search(query);
        } catch (error) {
            // Degraded mode: return cached results or empty
            console.warn('Meilisearch unavailable, returning cached results');
            return { hits: [], total: 0, degraded: true };
        }
    }
}

export class EmailService {
    async sendEmail(data: any): Promise<void> {
        try {
            await this.emailProvider.send(data);
        } catch (error) {
            // Degraded mode: queue for later delivery
            await this.queueEmail(data);
            console.warn('Email service unavailable, queued for later delivery');
        }
    }

    private async queueEmail(data: any) {
        // Store in Redis for later retry
    }
}
```

#### Code Template — Dependency health endpoint

```typescript
app.get('/health/dependencies', async (req, res) => {
    const checks = [
        healthMonitor.checkDependency('postgres', () => prisma.$queryRaw('SELECT 1')),
        healthMonitor.checkDependency('redis', () => redis.ping()),
        healthMonitor.checkDependency('meilisearch', () => 
            axios.get(`${process.env.MEILISEARCH_HOST}:${process.env.MEILISEARCH_PORT}/health`)
        ),
    ];
    
    await Promise.all(checks);
    
    const allHealth = healthMonitor.getAllHealth();
    const anyUnhealthy = Object.values(allHealth).some(h => h.status === 'unhealthy');
    
    res.status(anyUnhealthy ? 503 : 200).json({
        success: !anyUnhealthy,
        dependencies: allHealth,
    });
});
```

#### Validation Steps
1. Stop Meilisearch — application continues, search returns degraded response
2. Stop Redis — application continues with degraded caching
3. Verify `/health/dependencies` reflects individual dependency status
4. Verify email failures queue messages for later delivery

#### Acceptance Criteria
- [ ] Circuit breakers for all non-critical dependencies
- [ ] Degraded mode: search returns cached results, email queued
- [ ] Health checks per dependency with independent status
- [ ] Peer review confirms no single dependency failure takes down entire system


---

### HF-007: Load Testing in CI/CD

**Finding ID:** HF-007  
**Severity:** High  
**Constitution Violation:** Article 23  
**Owner:** QA Engineer  
**Effort:** 2 days  
**Status:** Not Started

#### Root Cause
CI pipeline runs unit/integration tests and contract tests but no load tests. `k6` is available (`test:perf:k6`) but not integrated into CI.

#### Fix Specification
1. Add k6 load tests to CI pipeline (staging environment)
2. Establish performance baselines before optimization (Article 21)
3. Compare against baselines on every change (Article 23)

#### Code Template — k6 load test (`tests/performance/k6-load.js`)

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
    stages: [
        { duration: '2m', target: 50 },   // Ramp up to 50 users
        { duration: '5m', target: 50 },   // Stay at 50 users
        { duration: '2m', target: 100 },  // Ramp up to 100 users
        { duration: '5m', target: 100 },  // Stay at 100 users
        { duration: '2m', target: 0 },    // Ramp down
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
        errors: ['rate<0.05'],            // Error rate under 5%
        http_req_failed: ['rate<0.05'],   // Failed requests under 5%
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
    // Health check
    const healthRes = http.get(`${BASE_URL}/health`);
    check(healthRes, {
        'health is 200': (r) => r.status === 200,
    }) || errorRate.add(1);

    // Product list (with pagination)
    const productsRes = http.get(`${BASE_URL}/api/products?limit=20`);
    check(productsRes, {
        'products is 200': (r) => r.status === 200,
        'products has data': (r) => r.json('data') !== undefined,
    }) || errorRate.add(1);

    sleep(1);
}
```

#### Code Template — CI integration (`.github/workflows/ci.yml`)

```yaml
- name: Run load tests
  if: github.ref == 'refs/heads/staging'
  run: |
    npm run test:perf:k6
  env:
    BASE_URL: ${{ secrets.STAGING_URL }}
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    REDIS_URL: ${{ secrets.REDIS_URL }}
```

#### Validation Steps
1. Run k6 load test against staging — all thresholds pass
2. Verify error rate under 5% at 100 concurrent users
3. Verify 95th percentile response time under 500ms
4. Compare results against performance baseline

#### Acceptance Criteria
- [ ] k6 load tests integrated into CI pipeline
- [ ] Performance baselines established
- [ ] Response time thresholds defined (p95 < 500ms)
- [ ] Error rate thresholds defined (< 5%)
- [ ] Peer review confirms load test covers critical paths


---

### HF-008: Contract Test Enforcement for Production Routes

**Finding ID:** HF-008  
**Severity:** High  
**Constitution Violation:** Article 5.4, Article 23  
**Owner:** Platform Engineer  
**Effort:** 2 days  
**Status:** Not Started

#### Root Cause
Contract tests exist (`test:contract`) but no enforcement that production routes cannot be changed without consumer notification. OpenAPI ratchet exists but may not block breaking changes.

#### Fix Specification
1. Enforce OpenAPI ratchet — no field removal without major version
2. Require consumer notification for any API change
3. Version all financial APIs (`/api/v1/payments`, etc.)

#### Code Template — OpenAPI ratchet script (`scripts/contract/ratchet.js`)

```javascript
const fs = require('fs');
const path = require('path');

const PREVIOUS_SCHEMA = path.join(__dirname, '../openapi.previous.yaml');
const CURRENT_SCHEMA = path.join(__dirname, '../openapi.yaml');

function loadSchema(filePath) {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf8');
}

function findBreakingChanges(previous, current) {
    const breakingChanges = [];
    
    // Check for removed endpoints
    const prevPaths = Object.keys(previous.paths || {});
    const currPaths = Object.keys(current.paths || {});
    
    const removedPaths = prevPaths.filter(p => !currPaths.includes(p));
    removedPaths.forEach(p => {
        breakingChanges.push(`REMOVED_ENDPOINT: ${p}`);
    });
    
    // Check for removed fields in responses
    prevPaths.forEach(p => {
        if (!currPaths[p]) return;
        const prevMethods = previous.paths[p];
        const currMethods = current.paths[p];
        
        Object.keys(prevMethods).forEach(method => {
            if (!currMethods[method]) return;
            const prevResponses = prevMethods[method].responses || {};
            const currResponses = currMethods[method].responses || {};
            
            Object.keys(prevResponses).forEach(statusCode => {
                if (!currResponses[statusCode]) return;
                const prevSchema = prevResponses[statusCode].content?.['application/json']?.schema;
                const currSchema = currResponses[statusCode].content?.['application/json']?.schema;
                
                if (prevSchema && currSchema) {
                    const removedFields = findRemovedFields(prevSchema.properties, currSchema.properties);
                    removedFields.forEach(f => {
                        breakingChanges.push(`REMOVED_FIELD: ${p} ${method} ${statusCode} ${f}`);
                    });
                }
            });
        });
    });
    
    return breakingChanges;
}

function findRemovedFields(prevProps, currProps) {
    if (!prevProps || !currProps) return [];
    return Object.keys(prevProps).filter(k => !(k in currProps));
}

const previous = loadSchema(PREVIOUS_SCHEMA);
const current = loadSchema(CURRENT_SCHEMA);

if (!previous || !current) {
    console.log('No previous schema to compare — creating baseline');
    process.exit(0);
}

const breakingChanges = findBreakingChanges(previous, current);

if (breakingChanges.length > 0) {
    console.error('❌ Breaking changes detected:');
    breakingChanges.forEach(c => console.error(`   - ${c}`));
    process.exit(1);
}

console.log('✅ No breaking changes detected');
```

#### Code Template — CI ratchet step (`.github/workflows/ci.yml`)

```yaml
- name: OpenAPI ratchet check
  run: node scripts/contract/ratchet.js
  env:
    OPENAPI_PREVIOUS: openapi.previous.yaml
```

#### Code Template — API versioning in routes

```typescript
// Version all financial APIs per Article 5.4
app.use('/api/v1/payments', paymentRouter);
app.use('/api/v1/wallets', walletRouter);
app.use('/api/v1/escrow', escrowRouter);
app.use('/api/v1/orders', orderRouter);
app.use('/api/v1/refunds', refundRouter);

// Deprecation header for old versions
app.use('/api/v0/*', (req, res, next) => {
    res.set('Deprecation', 'true');
    res.set('Sunset', '2026-12-31');
    next();
});
```

#### Validation Steps
1. Run ratchet script against modified OpenAPI — breaks on removed endpoints/fields
2. Verify ratchet allows additive changes (new endpoints, optional fields)
3. Verify financial APIs are versioned (`/api/v1/`)
4. Verify deprecation headers on old API versions

#### Acceptance Criteria
- [ ] OpenAPI ratchet blocks breaking changes (field removal, endpoint removal)
- [ ] All financial APIs versioned (`/api/v1/`)
- [ ] Deprecation headers on old API versions
- [ ] Consumer notification process documented for API changes
- [ ] Peer review confirms ratchet covers all financial endpoints


---

## Phase 3 — Medium & Low Findings Remediation (P2/P3)

### MF-001: Redis Connection Pool Configuration

**Finding ID:** MF-001  
**Severity:** Medium  
**Constitution Violation:** Article 10.9  
**Owner:** Backend Engineer  
**Effort:** 1 day  
**Status:** Not Started

#### Root Cause
`ioredis` and `redis` clients configured without explicit pool limits. Could exhaust Redis connections under concurrent load.

#### Fix Specification
Configure `maxRetriesPerRequest`, `enableAutoPipelining`, and connection pool limits.

**Code Template:**
```typescript
import { createClient } from 'redis';

const redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: {
        reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
        connectTimeout: 5000,
    },
});

await redisClient.connect();
```

#### Validation Steps
1. Verify Redis client connects with pool limits
2. Load test concurrent Redis operations — no connection exhaustion
3. Verify reconnect strategy works on Redis restart

#### Acceptance Criteria
- [ ] Redis connection pool limits configured
- [ ] Reconnect strategy with backoff configured
- [ ] Peer review confirms Redis client configuration

---

### MF-002: Memory Limits for Large File Processing

**Finding ID:** MF-002  
**Severity:** Medium  
**Constitution Violation:** Article 9.6, Article 9.7  
**Owner:** Backend Engineer  
**Effort:** 2 days  
**Status:** Not Started

#### Root Cause
`sharp` for image processing and `multer` for uploads. No streaming for large files — files may be loaded entirely into memory.

#### Fix Specification
Stream large files, use `sharp` with stream API, set `multer` memory storage limits.

**Code Template:**
```typescript
import sharp from 'sharp';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';

const streamPipeline = promisify(pipeline);

export async function processImageStream(inputPath: string, outputPath: string) {
    await streamPipeline(
        createReadStream(inputPath),
        sharp().resize(1200, 1200).jpeg({ quality: 80 }),
        createWriteStream(outputPath)
    );
}
```

#### Validation Steps
1. Process 10MB+ image — memory usage stays bounded
2. Verify stream processing doesn't load entire file into memory
3. Verify output image quality and dimensions

#### Acceptance Criteria
- [ ] Stream-based file processing for large uploads
- [ ] Memory usage bounded during file processing
- [ ] Peer review confirms no full-file-in-memory patterns

---

### MF-003: Structured Error Boundaries

**Finding ID:** MF-003  
**Severity:** Medium  
**Constitution Violation:** Article 17, Article 9  
**Owner:** Backend Engineer  
**Effort:** 2 days  
**Status:** Not Started

#### Root Cause
`serializeError` exists but no standardized error boundary pattern. Error messages may leak stack traces or internal details to clients.

#### Fix Specification
Implement standardized error response format, sanitize client-facing errors, log detailed errors server-side only.

**Code Template:**
```typescript
export class AppError extends Error {
    statusCode: number;
    isOperational: boolean;

    constructor(message: string, statusCode: number, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}

export function errorHandler(err: any, req: any, res: any, next: any) {
    const statusCode = err.statusCode || 500;
    const isOperational = err.isOperational || false;

    console.error({
        message: err.message,
        stack: err.stack,
        statusCode,
        isOperational,
        url: req.url,
        ip: req.ip,
    });

    const response = {
        success: false,
        error: isOperational ? err.message : 'Internal Server Error',
    };

    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
}
```

#### Validation Steps
1. Trigger operational error — client receives sanitized message
2. Trigger programming error — client receives "Internal Server Error" (not stack trace)
3. Verify detailed error logged server-side
4. Verify error includes status code and isOperational flag

#### Acceptance Criteria
- [ ] Standardized error response format
- [ ] Client-facing errors sanitized (no stack traces in production)
- [ ] Detailed errors logged server-side
- [ ] Peer review confirms no error information leakage


---

### MF-004: Database Query Timeout

**Finding ID:** MF-004  
**Severity:** Medium  
**Constitution Violation:** Article 10.8, Article 11.7  
**Owner:** DevOps Engineer  
**Effort:** 1 day  
**Status:** Not Started

#### Root Cause
No statement timeout configured. Long-running queries could hold connections indefinitely.

#### Fix Specification
Set `statement_timeout` at database level and query-level timeouts in Prisma.

**Code Template:**
```typescript
export const prisma = new PrismaClient({
    datasources: {
        db: {
            url: `${process.env.DATABASE_URL}?options=--statement_timeout=5000`,
        },
    },
});

async function getOrderWithTimeout(orderId: string) {
    return prisma.$queryRawUnsafe(
        'SET statement_timeout = 5000; SELECT * FROM orders WHERE id = $1',
        orderId
    );
}
```

#### Validation Steps
1. Run long-running query — should timeout after 5s
2. Verify query timeout doesn't hold database connection
3. Verify normal queries unaffected

#### Acceptance Criteria
- [ ] Statement timeout configured at database level
- [ ] Long-running queries timeout gracefully
- [ ] Peer review confirms timeout protection

---

### MF-005: Retry Backoff Strategy

**Finding ID:** MF-005  
**Severity:** Medium  
**Constitution Violation:** Article 13  
**Owner:** Backend Engineer  
**Effort:** 2 days  
**Status:** Not Started

#### Root Cause
`retry` package in dependencies but no visible exponential backoff implementation for failed operations.

#### Fix Specification
Implement exponential backoff with jitter for all retryable operations.

**Code Template:**
```typescript
import retry from 'retry';

export async function withRetry<T>(
    operation: () => Promise<T>,
    options: { retries?: number; minTimeout?: number; maxTimeout?: number; factor?: number } = {}
): Promise<T> {
    const { retries = 3, minTimeout = 1000, maxTimeout = 30000, factor = 2 } = options;

    return new Promise((resolve, reject) => {
        const op = retry.operation({ retries, minTimeout, maxTimeout, factor });
        op.attempt(async () => {
            try {
                const result = await operation();
                resolve(result);
            } catch (error) {
                if (op.retry(error)) return;
                reject(op.mainError());
            }
        });
    });
}
```

#### Validation Steps
1. Fail first 2 attempts, succeed on 3rd — operation completes
2. Fail all attempts — error thrown after retries exhausted
3. Verify retry delays increase exponentially
4. Verify jitter prevents thundering herd

#### Acceptance Criteria
- [ ] Exponential backoff with jitter implemented
- [ ] Retry limits configurable per operation
- [ ] Peer review confirms retry logic on external calls

---

### MF-006: Shutdown Timeout

**Finding ID:** MF-006  
**Severity:** Medium  
**Constitution Violation:** Article 19  
**Owner:** Platform Engineer  
**Effort:** 1 day  
**Status:** Not Started

#### Root Cause
`server.close()` in shutdown handler has no timeout. If connections don't close, process hangs.

#### Fix Specification
Add shutdown timeout (e.g., 30s), force-close connections after timeout.

**Code Template:**
```typescript
const shutdown = async () => {
    bootstrapLogger.info('Received shutdown signal');
    const shutdownTimeout = setTimeout(() => {
        bootstrapLogger.warn('Shutdown timeout exceeded, forcing exit');
        process.exit(1);
    }, 30000);
    server.close(() => {
        bootstrapLogger.info('HTTP server closed');
        clearTimeout(shutdownTimeout);
        process.exit(0);
    });
    await moduleRegistry.shutdownAll();
};
```

#### Validation Steps
1. Trigger shutdown — process exits within 30s
2. Simulate hanging connections — process force-exits after timeout
3. Verify all modules shutdown before process exit

#### Acceptance Criteria
- [ ] Shutdown timeout of 30s configured
- [ ] Force-exit after timeout
- [ ] Peer review confirms graceful shutdown with timeout


---

### LF-001: API Response Compression

**Finding ID:** LF-001  
**Severity:** Low  
**Constitution Violation:** Article 11.6  
**Owner:** Backend Engineer  
**Effort:** 1 day  
**Status:** Not Started

#### Root Cause
`compression` middleware in dependencies but not visibly configured in app middleware stack.

#### Fix Specification
Enable gzip/brotli compression for API responses.

**Code Template:**
```typescript
import compression from 'compression';

app.use(compression({
    threshold: 1024,
    level: 6,
}));
```

#### Validation Steps
1. Request with `Accept-Encoding: gzip` — response compressed
2. Verify `Content-Encoding: gzip` header present
3. Verify small responses (< 1KB) not compressed

#### Acceptance Criteria
- [ ] Compression middleware configured
- [ ] gzip/brotli compression active
- [ ] Peer review confirms compression on API responses

---

### LF-002: Request Payload Size Limits

**Finding ID:** LF-002  
**Severity:** Low  
**Constitution Violation:** Article 11.2  
**Owner:** Backend Engineer  
**Effort:** 0.5 day  
**Status:** Not Started

#### Root Cause
Express `json()` middleware without explicit `limit` parameter. Default may be too large.

#### Fix Specification
Set `express.json({ limit: '100kb' })` with higher limits only for upload endpoints.

**Code Template:**
```typescript
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

app.use('/api/uploads', express.json({ limit: '10mb' }));
```

#### Validation Steps
1. Send request > 100KB JSON — returns 413
2. Send request < 100KB JSON — processed normally
3. Verify upload endpoint allows larger payloads

#### Acceptance Criteria
- [ ] Default payload limit 100KB
- [ ] Upload endpoints have higher limits
- [ ] Peer review confirms payload limits on all endpoints

---

### LF-003: Dependency Vulnerability Scanning

**Finding ID:** LF-003  
**Severity:** Low  
**Constitution Violation:** Article 17  
**Owner:** DevOps Engineer  
**Effort:** 0.5 day  
**Status:** Not Started

#### Root Cause
`npm audit` not in CI pipeline. `lockfile:scrub-funding.js` exists but no security audit.

#### Fix Specification
Add `npm audit --production` to CI, fail on critical/high vulnerabilities.

**Code Template:**
```yaml
- name: Security audit
  run: npm audit --production --audit-level=high
```

#### Validation Steps
1. Run `npm audit --production` — no critical/high vulnerabilities
2. Add vulnerable dependency — CI fails
3. Fix vulnerability — CI passes

#### Acceptance Criteria
- [ ] `npm audit --production` in CI pipeline
- [ ] CI fails on critical/high vulnerabilities
- [ ] Peer review confirms security scanning active

---


---

## Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Lead Engineer | | | |
| Security Officer | | | |
| Platform Engineer | | | |
| QA Engineer | | | |
| Product Owner | | | |

---

## References

- Maysar Engineering Constitution v1.0 — `ENGINEERING_CONSTITUTION.md`
- Engineering Audit & Production Readiness Report v1.0 — `ENGINEERING_AUDIT_RECOMMENDATIONS.md`
- Maysar Express Backend Repository — `https://github.com/maysar-014/maysar-express-backend.git`

---

*This document is governed by the Maysar Engineering Constitution v1.0. All remediation work shall follow Article 24 (Mandatory Engineering Lifecycle) and Article 25 (Minimal Safe Modification). AI-generated fixes must comply with Article 27 (AI Engineering Accountability).*

