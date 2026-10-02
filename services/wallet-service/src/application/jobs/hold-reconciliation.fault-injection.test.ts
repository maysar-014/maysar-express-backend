import { HoldReconciliationJob, HoldReconciliationReport } from './hold-reconciliation.job';

/**
 * Fault injection for the COD commitment hold safety net (BLG-004).
 *
 * The existing `hold-reconciliation.job.test.ts` proves the job makes the RIGHT
 * decision for a given order status. It does not prove what happens when the
 * wallet itself is unhealthy — the scenario that actually stranded real money
 * (DEF-034/DEF-036), and the one no test exercised.
 *
 * The properties asserted here are money-safety invariants, not per-method
 * expectations. Each is phrased so that violating it costs a customer money:
 *
 *  - a failed settlement is RETRIED, and the next sweep recovers the funds
 *  - a hold is never settled twice (double release = free money, double capture
 *    = charged twice)
 *  - a transient failure never flips the direction the money moves
 *  - concurrent sweeps cannot both settle the same hold
 *  - every failure is attributable to a specific hold, or nobody can act on it
 *
 * These are written against the *job*, not the wallet HTTP client. Unit-testing a
 * 500 response would only prove the mock returns a 500.
 */
describe('HoldReconciliationJob — reconciliation under failure', () => {
    const makeHold = (id: string, orderId: string) => ({
        id,
        userId: `user-for-${id}`,
        metadata: { referenceId: orderId, referenceType: 'ORDER' },
    });

    /**
     * Builds a job over a mutable hold store, so a hold that fails to settle
     * stays ACTIVE and is offered to the next sweep — which is what really
     * happens, and what makes the retry tests meaningful.
     */
    function buildJob(orderStatuses: Record<string, string>) {
        const activeHolds = new Map<string, any>();

        const holdRepository = {
            findReconciliationCandidates: jest.fn(async () => [...activeHolds.values()]),
        };

        // A wallet outage is modelled by the two use-case stubs rejecting.
        const releaseHoldUseCase = { execute: jest.fn().mockResolvedValue(undefined) };
        const captureHoldUseCase = {
            execute: jest.fn().mockResolvedValue({ captured: true, transactionId: 't1' }),
        };

        const orderStateReader = {
            findMany: jest.fn(async (ids: string[]) =>
                ids
                    .filter((id) => orderStatuses[id] !== undefined)
                    .map((id) => ({ id, status: orderStatuses[id] })),
            ),
        };

        const job = new HoldReconciliationJob(
            holdRepository as never,
            orderStateReader as never,
            releaseHoldUseCase as never,
            captureHoldUseCase as never,
            { intervalMs: 999_999 },
        );

        return { job, activeHolds, releaseHoldUseCase, captureHoldUseCase, holdRepository };
    }

    // ── Recovery: the headline requirement ────────────────────────────────────

    it('retries a hold whose release failed and recovers the buyer funds on the next sweep', async () => {
        const ctx = buildJob({ 'ORD-1': 'CANCELLED' });
        ctx.activeHolds.set('h1', makeHold('h1', 'ORD-1'));

        // Sweep 1: the wallet is unreachable.
        ctx.releaseHoldUseCase.execute.mockRejectedValueOnce(new Error('wallet timeout'));
        const first: HoldReconciliationReport = await ctx.job.runOnce();

        expect(first.failed).toBe(1);
        expect(first.released).toBe(0);

        // The hold is still ACTIVE, so it is offered to the next sweep.
        expect(await ctx.holdRepository.findReconciliationCandidates()).toHaveLength(1);

        // Sweep 2: the wallet is healthy again. The buyer's money must come back.
        const second: HoldReconciliationReport = await ctx.job.runOnce();

        expect(second.released).toBe(1);
        expect(second.failed).toBe(0);
        expect(ctx.releaseHoldUseCase.execute).toHaveBeenCalledTimes(2);
    });

    it('retries a failed capture rather than leaving the seller unpaid', async () => {
        const ctx = buildJob({ 'ORD-2': 'DELIVERED' });
        ctx.activeHolds.set('h2', makeHold('h2', 'ORD-2'));

        ctx.captureHoldUseCase.execute.mockRejectedValueOnce(new Error('gateway 503'));
        const first = await ctx.job.runOnce();
        expect(first.failed).toBe(1);
        expect(first.captured).toBe(0);

        const second = await ctx.job.runOnce();
        expect(second.captured).toBe(1);
        expect(second.failed).toBe(0);
    });

    // ── Idempotency: never settle the same money twice ────────────────────────

    it('uses a stable idempotency key so a retry cannot double-settle', async () => {
        const ctx = buildJob({ 'ORD-3': 'CANCELLED' });
        ctx.activeHolds.set('h3', makeHold('h3', 'ORD-3'));

        ctx.releaseHoldUseCase.execute.mockRejectedValueOnce(new Error('timeout'));
        await ctx.job.runOnce();
        await ctx.job.runOnce();

        // The wallet deduplicates on this key. If it changed between attempts the
        // retry would be a SECOND release and the buyer would be paid twice.
        const keys = ctx.releaseHoldUseCase.execute.mock.calls.map((c) => c[0].idempotencyKey);
        expect(keys).toHaveLength(2);
        expect(keys[0]).toBe(keys[1]);
        expect(keys[0]).toBe('reconcile-release-h3');
    });

    it('uses distinct keys for release and capture of the same hold', async () => {
        // A hold must never reuse one key across directions: a capture that
        // collided with a release could be silently swallowed by the wallet's
        // dedupe, leaving the seller unpaid behind a "successful" call.
        const cancelled = buildJob({ 'ORD-4': 'CANCELLED' });
        cancelled.activeHolds.set('h4', makeHold('h4', 'ORD-4'));
        await cancelled.job.runOnce();
        const releaseKey = cancelled.releaseHoldUseCase.execute.mock.calls[0][0].idempotencyKey;

        const delivered = buildJob({ 'ORD-4': 'DELIVERED' });
        delivered.activeHolds.set('h4', makeHold('h4', 'ORD-4'));
        await delivered.job.runOnce();
        const captureKey = delivered.captureHoldUseCase.execute.mock.calls[0][0].idempotencyKey;

        expect(releaseKey).not.toBe(captureKey);
        expect(releaseKey).toBe('reconcile-release-h4');
        expect(captureKey).toBe('reconcile-capture-h4');
    });

    it('does not flip the direction of the money when a settlement fails', async () => {
        // A transient capture failure must not leave the hold eligible for a
        // later RELEASE — that would hand the buyer money the seller is owed.
        const ctx = buildJob({ 'ORD-5': 'DELIVERED' });
        ctx.activeHolds.set('h5', makeHold('h5', 'ORD-5'));

        ctx.captureHoldUseCase.execute.mockRejectedValue(new Error('gateway down'));
        await ctx.job.runOnce();
        await ctx.job.runOnce();

        expect(ctx.captureHoldUseCase.execute).toHaveBeenCalledTimes(2);
        expect(ctx.releaseHoldUseCase.execute).not.toHaveBeenCalled();
    });

    // ── Concurrency ───────────────────────────────────────────────────────────

    it('never lets two concurrent sweeps settle the same hold twice', async () => {
        const ctx = buildJob({ 'ORD-6': 'CANCELLED' });
        ctx.activeHolds.set('h6', makeHold('h6', 'ORD-6'));

        // Release is slow enough that both sweeps are genuinely in flight.
        let open!: () => void;
        const gate = new Promise<void>((r) => { open = r; });
        ctx.releaseHoldUseCase.execute.mockImplementationOnce(async () => { await gate; });

        const first = ctx.job.runOnce();
        const second = ctx.job.runOnce();
        open();
        await Promise.all([first, second]);

        expect(ctx.releaseHoldUseCase.execute).toHaveBeenCalledTimes(1);
    });

    // ── Attributability ───────────────────────────────────────────────────────

    it('attributes every failure to a specific hold, or it cannot be acted on', async () => {
        const ctx = buildJob({ 'ORD-7': 'CANCELLED', 'ORD-8': 'CANCELLED' });
        ctx.activeHolds.set('h7', makeHold('h7', 'ORD-7'));
        ctx.activeHolds.set('h8', makeHold('h8', 'ORD-8'));

        ctx.releaseHoldUseCase.execute.mockRejectedValue(new Error('wallet unreachable'));

        const report = await ctx.job.runOnce();

        expect(report.failed).toBe(2);
        const failures = report.details.filter((d) => d.action === 'release-failed');
        expect(failures).toHaveLength(2);
        for (const detail of failures) {
            expect(detail.holdId).toBeTruthy();
            expect(detail.orderId).toBeTruthy();
            expect(detail.reason).toBe('wallet unreachable');
        }
    });

    it('survives the hold store itself failing, without wedging the job', async () => {
        const ctx = buildJob({ 'ORD-9': 'CANCELLED' });
        ctx.holdRepository.findReconciliationCandidates.mockRejectedValueOnce(
            new Error('database unreachable'),
        );

        const report = await ctx.job.runOnce();

        expect(report.failed).toBe(1);
        // The next sweep must still run. If a throw left `running` stuck true the
        // safety net would be disabled for the life of the process.
        const next = await ctx.job.runOnce();
        expect(next.inspected).toBe(0);
        expect(next.failed).toBe(0);
    });
});
