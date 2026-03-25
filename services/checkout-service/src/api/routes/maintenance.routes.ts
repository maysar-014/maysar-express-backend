import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../infrastructure/database/prisma-client';

type CleanupResult = {
  deleted: number;
  batches: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const parseEnvInt = (key: string, fallback: number): number => {
  const raw = process.env[key];
  const value = raw ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(value) || value < 0) {
    return fallback;
  }
  return value;
};

const parseEnvBool = (key: string, fallback: boolean): boolean => {
  const raw = process.env[key];
  if (!raw) return fallback;
  return ['true', '1', 'yes', 'y'].includes(raw.toLowerCase());
};

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));
const getCheckoutDelegate = (): any | null => (prisma as any).checkout_CheckoutSession || null;

const requireServiceKey = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.headers['x-service-key'];
  const serviceKey = Array.isArray(header) ? header[0] : header;
  const allowed = process.env.ALLOWED_SERVICE_KEYS?.split(',').map(v => v.trim()).filter(Boolean) || [];

  if (!serviceKey) {
    res.status(401).json({ success: false, error: 'Service key required' });
    return;
  }
  if (!allowed.includes(serviceKey)) {
    res.status(401).json({ success: false, error: 'Invalid service key' });
    return;
  }
  next();
};

export const createMaintenanceRoutes = (): Router => {
  const router = Router();

  router.use(requireServiceKey);

  router.post('/cleanup/checkout-sessions/report', async (_req: Request, res: Response) => {
    const start = Date.now();

    const batchSize = parseEnvInt('CLEANUP_BATCH_SIZE', 1000);
    const retentionDays = parseEnvInt('CHECKOUT_SESSION_RETENTION_DAYS', 7);
    const cutoff = new Date(Date.now() - retentionDays * DAY_MS);

    try {
      const delegate = getCheckoutDelegate();
      if (!delegate || typeof delegate.count !== 'function') {
        return res.status(200).json({
          success: true,
          batchSize,
          retentionDays,
          cutoff,
          count: 0,
          estimatedBatches: 0,
          durationMs: Date.now() - start,
          note: 'checkout_CheckoutSession delegate unavailable; using empty report'
        });
      }

      const count = await delegate.count({
        where: { expiresAt: { lt: cutoff } }
      });

      return res.status(200).json({
        success: true,
        batchSize,
        retentionDays,
        cutoff,
        count,
        estimatedBatches: count === 0 ? 0 : Math.ceil(count / batchSize),
        durationMs: Date.now() - start
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: Date.now() - start
      });
    }
  });

  router.post('/cleanup/checkout-sessions', async (req: Request, res: Response) => {
    const start = Date.now();

    const batchSize = parseEnvInt('CLEANUP_BATCH_SIZE', 1000);
    const maxRuntimeMs = parseEnvInt('CLEANUP_MAX_RUNTIME_MS', 20_000);
    const sleepMs = parseEnvInt('CLEANUP_SLEEP_MS', 200);
    const dryRun = parseEnvBool('CLEANUP_DRY_RUN', false) || Boolean(req.body?.dryRun);

    const retentionDays = parseEnvInt('CHECKOUT_SESSION_RETENTION_DAYS', 7);
    const cutoff = new Date(Date.now() - retentionDays * DAY_MS);

    const shouldStop = () => Date.now() - start >= maxRuntimeMs;

    const deleteInBatches = async (): Promise<CleanupResult> => {
      const delegate = getCheckoutDelegate();
      if (!delegate || typeof delegate.findMany !== 'function') {
        return { deleted: 0, batches: 0 };
      }

      let deleted = 0;
      let batches = 0;

      while (!shouldStop()) {
        const rows = await delegate.findMany({
          where: { expiresAt: { lt: cutoff } },
          select: { id: true },
          orderBy: { expiresAt: 'asc' },
          take: batchSize
        });

        if (rows.length === 0) break;

        batches += 1;
        const ids = rows.map((row: { id: string }) => row.id);

        if (!dryRun) {
          const result = await delegate.deleteMany({
            where: { id: { in: ids } }
          });
          deleted += result.count || 0;
        } else {
          deleted += ids.length;
        }

        if (sleepMs > 0) {
          await sleep(sleepMs);
        }
      }

      return { deleted, batches };
    };

    try {
      const result = await deleteInBatches();
      return res.status(200).json({
        success: true,
        dryRun,
        batchSize,
        maxRuntimeMs,
        sleepMs,
        retentionDays,
        cutoff,
        result,
        durationMs: Date.now() - start
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: Date.now() - start
      });
    }
  });

  return router;
};
