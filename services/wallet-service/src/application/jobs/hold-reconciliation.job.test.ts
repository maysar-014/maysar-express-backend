import { HoldReconciliationJob } from './hold-reconciliation.job';

/**
 * The reconciliation job decides whether a customer's frozen money is returned
 * or taken, so its decision table is asserted explicitly: a wrong "release"
 * creates free money, and a wrong "capture" steals it. In-progress orders must
 * never be touched.
 */
describe('HoldReconciliationJob', () => {
    const makeHold = (id: string, referenceId?: string) => ({
        id,
        userId: 'user-1',
        metadata: referenceId ? { referenceId, referenceType: 'ORDER' } : undefined,
    });

    const buildJob = (holds: any[], orderStatuses: Record<string, string>) => {
        const releaseHoldUseCase = { execute: jest.fn().mockResolvedValue(undefined) };
        const captureHoldUseCase = { execute: jest.fn().mockResolvedValue({ captured: true, transactionId: 't1' }) };
        const job = new HoldReconciliationJob(
            { findReconciliationCandidates: jest.fn().mockResolvedValue(holds) } as never,
            {
                findMany: jest.fn(async (ids: string[]) =>
                    ids
                        .filter((id) => orderStatuses[id] !== undefined)
                        .map((id) => ({ id, status: orderStatuses[id] })),
                ),
            } as never,
            releaseHoldUseCase as never,
            captureHoldUseCase as never,
            { intervalMs: 999_999 }
        );
        return { job, releaseHoldUseCase, captureHoldUseCase };
    };

    it('releases a hold whose order was cancelled', async () => {
        const { job, releaseHoldUseCase, captureHoldUseCase } = buildJob(
            [makeHold('h1', 'ORD-1')],
            { 'ORD-1': 'CANCELLED' }
        );

        const report = await job.runOnce();

        expect(report.released).toBe(1);
        expect(report.failed).toBe(0);
        expect(releaseHoldUseCase.execute).toHaveBeenCalledWith(
            expect.objectContaining({ holdId: 'h1', userId: 'user-1' })
        );
        // Cancellation must never capture the money.
        expect(captureHoldUseCase.execute).not.toHaveBeenCalled();
    });

    it('captures a hold whose order was delivered (money is owed)', async () => {
        const { job, releaseHoldUseCase, captureHoldUseCase } = buildJob(
            [makeHold('h2', 'ORD-2')],
            { 'ORD-2': 'DELIVERED' }
        );

        const report = await job.runOnce();

        expect(report.captured).toBe(1);
        expect(report.released).toBe(0);
        expect(captureHoldUseCase.execute).toHaveBeenCalledWith(
            expect.objectContaining({ holdId: 'h2' })
        );
        expect(releaseHoldUseCase.execute).not.toHaveBeenCalled();
    });

    it('leaves a hold alone while its order is still in progress', async () => {
        for (const status of ['PENDING_SELLER_VERIFICATION', 'SELLER_VERIFIED', 'CONFIRMED', 'IN_TRANSIT']) {
            const { job, releaseHoldUseCase, captureHoldUseCase } = buildJob(
                [makeHold('h3', 'ORD-3')],
                { 'ORD-3': status }
            );

            const report = await job.runOnce();

            expect(report.released).toBe(0);
            expect(report.captured).toBe(0);
            expect(report.skipped).toBe(1);
            expect(releaseHoldUseCase.execute).not.toHaveBeenCalled();
            expect(captureHoldUseCase.execute).not.toHaveBeenCalled();
        }
    });

    it('never auto-settles a hold with no structured order reference', async () => {
        // Guessing from the reason prose could move the wrong money, so these are
        // surfaced for review instead.
        const { job, releaseHoldUseCase, captureHoldUseCase } = buildJob(
            [makeHold('h4')],
            {}
        );

        const report = await job.runOnce();

        expect(report.skipped).toBe(1);
        expect(report.released).toBe(0);
        expect(releaseHoldUseCase.execute).not.toHaveBeenCalled();
        expect(captureHoldUseCase.execute).not.toHaveBeenCalled();
    });

    it('skips a hold whose order cannot be found, rather than guessing', async () => {
        const { job, releaseHoldUseCase, captureHoldUseCase } = buildJob(
            [makeHold('h5', 'ORD-missing')],
            {}
        );

        const report = await job.runOnce();

        expect(report.skipped).toBe(1);
        expect(releaseHoldUseCase.execute).not.toHaveBeenCalled();
        expect(captureHoldUseCase.execute).not.toHaveBeenCalled();
    });

    it('isolates one failure so the rest of the batch still settles', async () => {
        const { job, releaseHoldUseCase } = buildJob(
            [makeHold('h6', 'ORD-6'), makeHold('h7', 'ORD-7')],
            { 'ORD-6': 'CANCELLED', 'ORD-7': 'CANCELLED' }
        );
        releaseHoldUseCase.execute
            .mockRejectedValueOnce(new Error('wallet timeout'))
            .mockResolvedValueOnce(undefined);

        const report = await job.runOnce();

        expect(report.failed).toBe(1);
        expect(report.released).toBe(1);
    });
});
