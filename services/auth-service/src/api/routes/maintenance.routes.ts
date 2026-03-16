import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticationMiddlewareFactory } from '../middleware/authentication.middleware';

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

export const createMaintenanceRoutes = (prisma: PrismaClient): Router => {
  const router = Router();

  const serviceAuth = AuthenticationMiddlewareFactory.createServiceAuth();
  router.use(serviceAuth);

  router.post('/cleanup/auth/report', async (req: Request, res: Response) => {
    const start = Date.now();

    const batchSize = parseEnvInt('CLEANUP_BATCH_SIZE', 1000);
    const sessionRetentionDays = parseEnvInt('AUTH_SESSION_RETENTION_DAYS', 30);
    const passwordResetRetentionDays = parseEnvInt('AUTH_PASSWORD_RESET_RETENTION_DAYS', 7);
    const emailVerificationRetentionDays = parseEnvInt('AUTH_EMAIL_VERIFICATION_RETENTION_DAYS', 7);

    const now = new Date();
    const sessionCutoff = new Date(now.getTime() - sessionRetentionDays * DAY_MS);
    const passwordResetCutoff = new Date(now.getTime() - passwordResetRetentionDays * DAY_MS);
    const emailVerificationCutoff = new Date(now.getTime() - emailVerificationRetentionDays * DAY_MS);

    try {
      const [
        sessionCount,
        passwordResetCount,
        emailVerificationCount
      ] = await Promise.all([
        prisma.session.count({ where: { expiresAt: { lt: sessionCutoff } } }),
        prisma.auth_PasswordResetToken.count({ where: { expiresAt: { lt: passwordResetCutoff } } }),
        prisma.auth_EmailVerificationToken.count({ where: { expiresAt: { lt: emailVerificationCutoff } } })
      ]);

      const estimateBatches = (count: number) => (count === 0 ? 0 : Math.ceil(count / batchSize));

      return res.status(200).json({
        success: true,
        batchSize,
        retentionDays: {
          sessions: sessionRetentionDays,
          passwordResetTokens: passwordResetRetentionDays,
          emailVerificationTokens: emailVerificationRetentionDays
        },
        cutoffs: {
          sessions: sessionCutoff,
          passwordResetTokens: passwordResetCutoff,
          emailVerificationTokens: emailVerificationCutoff
        },
        counts: {
          sessions: sessionCount,
          passwordResetTokens: passwordResetCount,
          emailVerificationTokens: emailVerificationCount
        },
        estimatedBatches: {
          sessions: estimateBatches(sessionCount),
          passwordResetTokens: estimateBatches(passwordResetCount),
          emailVerificationTokens: estimateBatches(emailVerificationCount)
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

  router.post('/cleanup/outbox/report', async (_req: Request, res: Response) => {
    const start = Date.now();

    const batchSize = parseEnvInt('CLEANUP_BATCH_SIZE', 1000);
    const sentRetentionDays = parseEnvInt('OUTBOX_SENT_RETENTION_DAYS', 7);
    const failedRetentionDays = parseEnvInt('OUTBOX_FAILED_RETENTION_DAYS', 30);

    const now = Date.now();
    const sentCutoff = new Date(now - sentRetentionDays * DAY_MS);
    const failedCutoff = new Date(now - failedRetentionDays * DAY_MS);

    const processedStatuses = ['PROCESSED', 'SENT'];
    const failedStatuses = ['FAILED'];

    try {
      const [processedCount, failedCount] = await Promise.all([
        prisma.sharedOutboxEvent.count({
          where: {
            status: { in: processedStatuses },
            createdAt: { lt: sentCutoff }
          }
        }),
        prisma.sharedOutboxEvent.count({
          where: {
            status: { in: failedStatuses },
            createdAt: { lt: failedCutoff }
          }
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
          processed: processedCount,
          failed: failedCount
        },
        estimatedBatches: {
          processed: estimateBatches(processedCount),
          failed: estimateBatches(failedCount)
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

    const processedStatuses = ['PROCESSED', 'SENT'];
    const failedStatuses = ['FAILED'];

    const shouldStop = () => Date.now() - start >= maxRuntimeMs;

    const deleteOutboxInBatches = async (
      statuses: string[],
      cutoff: Date
    ): Promise<CleanupResult> => {
      let deleted = 0;
      let batches = 0;

      while (!shouldStop()) {
        const rows = await prisma.sharedOutboxEvent.findMany({
          where: {
            status: { in: statuses },
            createdAt: { lt: cutoff }
          },
          select: { id: true },
          orderBy: { createdAt: 'asc' },
          take: batchSize
        });

        if (rows.length === 0) break;

        batches += 1;
        const ids = rows.map(row => row.id);

        if (!dryRun) {
          const result = await prisma.sharedOutboxEvent.deleteMany({
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
      const processed = await deleteOutboxInBatches(processedStatuses, sentCutoff);
      const failed = await deleteOutboxInBatches(failedStatuses, failedCutoff);

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
          processed,
          failed
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

  router.post('/cleanup/auth', async (req: Request, res: Response) => {
    const start = Date.now();

    const batchSize = parseEnvInt('CLEANUP_BATCH_SIZE', 1000);
    const maxRuntimeMs = parseEnvInt('CLEANUP_MAX_RUNTIME_MS', 20_000);
    const sleepMs = parseEnvInt('CLEANUP_SLEEP_MS', 200);
    const dryRun = parseEnvBool('CLEANUP_DRY_RUN', false) || Boolean(req.body?.dryRun);

    const sessionRetentionDays = parseEnvInt('AUTH_SESSION_RETENTION_DAYS', 30);
    const passwordResetRetentionDays = parseEnvInt('AUTH_PASSWORD_RESET_RETENTION_DAYS', 7);
    const emailVerificationRetentionDays = parseEnvInt('AUTH_EMAIL_VERIFICATION_RETENTION_DAYS', 7);

    const now = new Date();
    const sessionCutoff = new Date(now.getTime() - sessionRetentionDays * DAY_MS);
    const passwordResetCutoff = new Date(now.getTime() - passwordResetRetentionDays * DAY_MS);
    const emailVerificationCutoff = new Date(now.getTime() - emailVerificationRetentionDays * DAY_MS);

    const shouldStop = () => Date.now() - start >= maxRuntimeMs;

    const deleteInBatches = async (
      delegate: any,
      where: Record<string, unknown>,
      orderBy: Record<string, 'asc' | 'desc'>,
      idField: string = 'id'
    ): Promise<CleanupResult> => {
      let deleted = 0;
      let batches = 0;

      while (!shouldStop()) {
        const rows = await delegate.findMany({
          where,
          select: { [idField]: true },
          orderBy,
          take: batchSize
        });

        if (rows.length === 0) break;

        batches += 1;
        const ids = rows.map((row: any) => row[idField]);
        if (!dryRun) {
          const result = await delegate.deleteMany({
            where: { [idField]: { in: ids } }
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
      const sessions = await deleteInBatches(
        prisma.session,
        { expiresAt: { lt: sessionCutoff } },
        { expiresAt: 'asc' }
      );

      const passwordResetTokens = await deleteInBatches(
        prisma.auth_PasswordResetToken,
        { expiresAt: { lt: passwordResetCutoff } },
        { expiresAt: 'asc' }
      );

      const emailVerificationTokens = await deleteInBatches(
        prisma.auth_EmailVerificationToken,
        { expiresAt: { lt: emailVerificationCutoff } },
        { expiresAt: 'asc' }
      );

      return res.status(200).json({
        success: true,
        dryRun,
        batchSize,
        maxRuntimeMs,
        sleepMs,
        cutoffs: {
          sessions: sessionCutoff,
          passwordResetTokens: passwordResetCutoff,
          emailVerificationTokens: emailVerificationCutoff
        },
        results: {
          sessions,
          passwordResetTokens,
          emailVerificationTokens
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

  return router;
};
