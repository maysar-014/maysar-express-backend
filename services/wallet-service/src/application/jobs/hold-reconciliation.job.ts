import { ReleaseHoldUseCase } from '../use-cases/release-hold.use-case';
import { CaptureHoldUseCase } from '../use-cases/capture-hold.use-case';
import { IHoldRepository } from '../../domain/repositories/hold.repository';
import { logger } from '../../infrastructure/services/logger.service';

/**
 * Order states that make a COD commitment hold permanently un-actionable.
 *
 * DELIVERED is a settlement, not a cancellation: the money is owed, so the hold
 * is captured rather than released. Every other terminal state means the order
 * will never progress and the buyer's funds must come back.
 */
const TERMINAL_RELEASED = new Set(['CANCELLED', 'REFUNDED', 'REJECTED', 'FAILED', 'EXPIRED']);
const TERMINAL_CAPTURED = new Set(['DELIVERED', 'COMPLETED']);

interface OrderStateReader {
    findMany(ids: string[]): Promise<Array<{ id: string; status: string }>>;
}

export interface HoldReconciliationReport {
    inspected: number;
    released: number;
    captured: number;
    skipped: number;
    failed: number;
    details: Array<{ holdId: string; orderId: string | null; action: string; reason?: string }>;
}

/**
 * Reconciliation safety net for COD commitment holds.
 *
 * Why this exists: a hold is released only as a side effect of order
 * cancellation and captured only on delivery confirmation. If either call fails
 * — network error, wallet outage, restart mid-flow — the hold stays ACTIVE and
 * the buyer's funds are frozen with no path back. That is exactly what happened
 * (DEF-034/DEF-035): real funds were stranded with no support path, and the
 * hold-expiry job that should have been the backstop was constructed but never
 * started.
 *
 * This closes the gap deterministically: for every ACTIVE hold whose order has
 * reached a terminal state, the hold is settled in the direction the order
 * demands. It is deliberately conservative — an order still in progress is left
 * to the normal flow and the expiry TTL.
 *
 * Orders are read from the shared `orders` table. The monolith runs a single
 * Postgres instance; this mirrors the existing precedent in order-service's
 `CatalogProductRepository`, which reads `products` for cross-service checks.
 * The access here is read-only.
 */
export class HoldReconciliationJob {
    private running = false;
    private timer: ReturnType<typeof setInterval> | null = null;

    constructor(
        private readonly holdRepository: IHoldRepository,
        private readonly orderStateReader: OrderStateReader,
        private readonly releaseHoldUseCase: ReleaseHoldUseCase,
        private readonly captureHoldUseCase: CaptureHoldUseCase,
        private readonly options: { batchSize?: number; intervalMs?: number } = {}
    ) { }

    /** Starts recurring reconciliation. Safe to call more than once. */
    start(): void {
        if (this.timer) return;
        const intervalMs = this.options.intervalMs ?? 5 * 60_000;
        // Run once on boot so stranded funds are recovered promptly after a
        // restart, rather than only on the first tick.
        void this.runOnce();
        this.timer = setInterval(() => {
            void this.runOnce();
        }, intervalMs);
        this.timer.unref?.();
        logger.info(`[HoldReconciliation] started (interval ${intervalMs}ms)`);
    }

    stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            logger.info('[HoldReconciliation] stopped');
        }
    }

    async runOnce(): Promise<HoldReconciliationReport> {
        const report: HoldReconciliationReport = {
            inspected: 0, released: 0, captured: 0, skipped: 0, failed: 0, details: [],
        };

        if (this.running) {
            logger.warn('[HoldReconciliation] previous run still in progress — skipping this tick');
            return report;
        }
        this.running = true;

        try {
            const batchSize = this.options.batchSize ?? 200;
            const holds = await this.holdRepository.findReconciliationCandidates(batchSize);
            report.inspected = holds.length;

            const orderIds = holds
                .map((h) => this.resolveOrderId(h))
                .filter((id): id is string => Boolean(id));

            const orders = orderIds.length
                ? await this.orderStateReader.findMany(Array.from(new Set(orderIds)))
                : [];
            const statusByOrderId = new Map(orders.map((o) => [o.id, String(o.status).toUpperCase()]));

            for (const hold of holds) {
                const orderId = this.resolveOrderId(hold);
                const entry = { holdId: hold.id, orderId: orderId ?? null, action: 'skipped' as string };

                if (!orderId) {
                    report.skipped++;
                    report.details.push({ ...entry, reason: 'no structured order reference' });
                    continue;
                }

                const status = statusByOrderId.get(orderId);
                if (!status) {
                    // The reference points at an order we cannot see. Left for
                    // review rather than auto-released: a wrong release is
                    // reversible by support, whereas a silent freeze strands a
                    // customer's funds indefinitely.
                    report.skipped++;
                    report.details.push({ ...entry, reason: 'referenced order not found' });
                    continue;
                }

                if (TERMINAL_RELEASED.has(status)) {
                    try {
                        await this.releaseHoldUseCase.execute({
                            holdId: hold.id,
                            userId: hold.userId,
                            reason: `Reconciliation: order ${orderId} is ${status}`,
                            // Stable per hold, so a retried reconciliation is a
                            // no-op rather than a second release.
                            idempotencyKey: `reconcile-release-${hold.id}`,
                            auditInfo: {
                                actor: 'system',
                                actorType: 'system',
                                ipAddress: 'internal',
                            } as never,
                        });
                        report.released++;
                        report.details.push({ ...entry, action: 'released' });
                    } catch (error: any) {
                        report.failed++;
                        report.details.push({ ...entry, action: 'release-failed', reason: error?.message });
                    }
                    continue;
                }

                if (TERMINAL_CAPTURED.has(status)) {
                    try {
                        await this.captureHoldUseCase.execute({
                            holdId: hold.id,
                            userId: hold.userId,
                            reason: `Reconciliation: order ${orderId} is ${status}`,
                            idempotencyKey: `reconcile-capture-${hold.id}`,
                            correlationId: require('crypto').randomUUID(),
                            auditInfo: {
                                actor: 'system',
                                actorType: 'system',
                                ipAddress: 'internal',
                            } as never,
                        });
                        report.captured++;
                        report.details.push({ ...entry, action: 'captured' });
                    } catch (error: any) {
                        report.failed++;
                        report.details.push({ ...entry, action: 'capture-failed', reason: error?.message });
                    }
                    continue;
                }

                // Still in progress — the normal flow owns this hold; the expiry
                // TTL remains the backstop.
                report.skipped++;
                report.details.push({ ...entry, reason: `order in progress (${status})` });
            }

            if (report.released || report.captured || report.failed) {
                logger.info(
                    `[HoldReconciliation] inspected=${report.inspected} released=${report.released} ` +
                    `captured=${report.captured} skipped=${report.skipped} failed=${report.failed}`
                );
            }
            // A failure that does not say why is not actionable, and this job is
            // the last line of defence for stranded customer funds.
            for (const failure of report.details.filter((d) => d.action.endsWith('-failed'))) {
                logger.error(
                    `[HoldReconciliation] ${failure.action} hold=${failure.holdId} ` +
                    `order=${failure.orderId}: ${failure.reason}`
                );
            }
            return report;
        } catch (error: any) {
            logger.error('[HoldReconciliation] run failed', error);
            report.failed++;
            return report;
        } finally {
            this.running = false;
        }
    }

    private resolveOrderId(hold: { metadata?: Record<string, unknown> }): string | null {
        const referenceId = hold.metadata?.['referenceId'];
        return typeof referenceId === 'string' && referenceId ? referenceId : null;
    }
}
