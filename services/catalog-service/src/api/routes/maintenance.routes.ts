import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

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

export const createMaintenanceRoutes = (prisma: PrismaClient): Router => {
  const router = Router();

  router.use(requireServiceKey);

  router.post('/cleanup/outbox/report', async (_req: Request, res: Response) => {
    const start = Date.now();

    const batchSize = parseEnvInt('CLEANUP_BATCH_SIZE', 1000);
    const sentRetentionDays = parseEnvInt('OUTBOX_SENT_RETENTION_DAYS', 7);
    const failedRetentionDays = parseEnvInt('OUTBOX_FAILED_RETENTION_DAYS', 30);

    const now = Date.now();
    const sentCutoff = new Date(now - sentRetentionDays * DAY_MS);
    const failedCutoff = new Date(now - failedRetentionDays * DAY_MS);

    const processedStatuses = ['SENT', 'PROCESSED'];
    const failedStatuses = ['FAILED'];

    try {
      const [catalogProcessed, catalogFailed, campaignProcessed, campaignFailed] = await Promise.all([
        prisma.catalogOutboxEvent.count({
          where: { status: { in: processedStatuses }, createdAt: { lt: sentCutoff } }
        }),
        prisma.catalogOutboxEvent.count({
          where: { status: { in: failedStatuses }, createdAt: { lt: failedCutoff } }
        }),
        prisma.campaign_OutboxEvent.count({
          where: { status: { in: processedStatuses }, createdAt: { lt: sentCutoff } }
        }),
        prisma.campaign_OutboxEvent.count({
          where: { status: { in: failedStatuses }, createdAt: { lt: failedCutoff } }
        })
      ]);

      const estimateBatches = (count: number) => (count === 0 ? 0 : Math.ceil(count / batchSize));

      return res.status(200).json({
        success: true,
        batchSize,
        retentionDays: {
          sent: sentRetentionDays,
          failed: failedRetentionDays
        },
        cutoffs: {
          sent: sentCutoff,
          failed: failedCutoff
        },
        counts: {
          catalog: {
            processed: catalogProcessed,
            failed: catalogFailed
          },
          campaigns: {
            processed: campaignProcessed,
            failed: campaignFailed
          }
        },
        estimatedBatches: {
          catalog: {
            processed: estimateBatches(catalogProcessed),
            failed: estimateBatches(catalogFailed)
          },
          campaigns: {
            processed: estimateBatches(campaignProcessed),
            failed: estimateBatches(campaignFailed)
          }
        },
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

  router.post('/cleanup/outbox', async (req: Request, res: Response) => {
    const start = Date.now();

    const batchSize = parseEnvInt('CLEANUP_BATCH_SIZE', 1000);
    const maxRuntimeMs = parseEnvInt('CLEANUP_MAX_RUNTIME_MS', 20_000);
    const sleepMs = parseEnvInt('CLEANUP_SLEEP_MS', 200);
    const dryRun = parseEnvBool('CLEANUP_DRY_RUN', false) || Boolean(req.body?.dryRun);

    const sentRetentionDays = parseEnvInt('OUTBOX_SENT_RETENTION_DAYS', 7);
    const failedRetentionDays = parseEnvInt('OUTBOX_FAILED_RETENTION_DAYS', 30);

    const now = Date.now();
    const sentCutoff = new Date(now - sentRetentionDays * DAY_MS);
    const failedCutoff = new Date(now - failedRetentionDays * DAY_MS);

    const processedStatuses = ['SENT', 'PROCESSED'];
    const failedStatuses = ['FAILED'];

    const shouldStop = () => Date.now() - start >= maxRuntimeMs;

    const deleteOutboxInBatches = async (
      delegate: any,
      statuses: string[],
      cutoff: Date
    ): Promise<CleanupResult> => {
      let deleted = 0;
      let batches = 0;

      while (!shouldStop()) {
        const rows = await delegate.findMany({
          where: { status: { in: statuses }, createdAt: { lt: cutoff } },
          select: { id: true },
          orderBy: { createdAt: 'asc' },
          take: batchSize
        });

        if (rows.length === 0) break;

        batches += 1;
        const ids = rows.map((row: any) => row.id);

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
      const catalogProcessed = await deleteOutboxInBatches(prisma.catalogOutboxEvent, processedStatuses, sentCutoff);
      const catalogFailed = await deleteOutboxInBatches(prisma.catalogOutboxEvent, failedStatuses, failedCutoff);
      const campaignProcessed = await deleteOutboxInBatches(prisma.campaign_OutboxEvent, processedStatuses, sentCutoff);
      const campaignFailed = await deleteOutboxInBatches(prisma.campaign_OutboxEvent, failedStatuses, failedCutoff);

      return res.status(200).json({
        success: true,
        dryRun,
        batchSize,
        maxRuntimeMs,
        sleepMs,
        retentionDays: {
          sent: sentRetentionDays,
          failed: failedRetentionDays
        },
        cutoffs: {
          sent: sentCutoff,
          failed: failedCutoff
        },
        results: {
          catalog: { processed: catalogProcessed, failed: catalogFailed },
          campaigns: { processed: campaignProcessed, failed: campaignFailed }
        },
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

  router.post('/cleanup/event-store/report', async (_req: Request, res: Response) => {
    const start = Date.now();

    const batchSize = parseEnvInt('CLEANUP_BATCH_SIZE', 1000);
    const retentionDays = parseEnvInt('EVENT_STORE_RETENTION_DAYS', 365);
    const cutoff = new Date(Date.now() - retentionDays * DAY_MS);

    try {
      const count = await prisma.eventStore.count({
        where: { timestamp: { lt: cutoff } }
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

  router.post('/cleanup/event-store', async (req: Request, res: Response) => {
    const start = Date.now();

    const batchSize = parseEnvInt('CLEANUP_BATCH_SIZE', 1000);
    const maxRuntimeMs = parseEnvInt('CLEANUP_MAX_RUNTIME_MS', 20_000);
    const sleepMs = parseEnvInt('CLEANUP_SLEEP_MS', 200);
    const dryRun = parseEnvBool('CLEANUP_DRY_RUN', false) || Boolean(req.body?.dryRun);

    const retentionDays = parseEnvInt('EVENT_STORE_RETENTION_DAYS', 365);
    const cutoff = new Date(Date.now() - retentionDays * DAY_MS);

    const shouldStop = () => Date.now() - start >= maxRuntimeMs;

    const deleteInBatches = async (): Promise<CleanupResult> => {
      let deleted = 0;
      let batches = 0;

      while (!shouldStop()) {
        const rows = await prisma.eventStore.findMany({
          where: { timestamp: { lt: cutoff } },
          select: { id: true },
          orderBy: { timestamp: 'asc' },
          take: batchSize
        });

        if (rows.length === 0) break;

        batches += 1;
        const ids = rows.map(row => row.id);

        if (!dryRun) {
          const result = await prisma.eventStore.deleteMany({
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
