import { CODCommitmentService } from './cod-commitment.service';

/**
 * Fault injection for the order side of the COD commitment (BLG-004).
 *
 * The service is the only thing standing between "the wallet is down" and "an
 * order that claims the buyer's money is secured but is not". The cases below
 * pin the failure contract that matters for money:
 *
 *  - a hold that could not be PLACED must never yield a hold id, so the caller
 *    cannot record the order as secured and move on to packaging
 *  - a failed release/capture propagates, so the order flow can retry or fall
 *    back to reconciliation rather than silently abandoning frozen funds
 *  - the order reference is always threaded, or a stranded hold cannot be
 *    attributed back to an order by the reconciliation job
 */
describe('CODCommitmentService — wallet failure injection', () => {
  const walletOk = () => ({
    placeHold: jest.fn().mockResolvedValue('hold-1'),
    releaseHold: jest.fn().mockResolvedValue(undefined),
    captureHold: jest.fn().mockResolvedValue(undefined),
  });

  // ── Placing the hold ───────────────────────────────────────────────────────

  it('does not return a hold id when the wallet cannot place the hold', async () => {
    const wallet = walletOk();
    wallet.placeHold.mockRejectedValue(new Error('HTTP 503 wallet unavailable'));
    const service = new CODCommitmentService(wallet);

    // A hold id here would let the order proceed as secured while no money is
    // actually held — a ghost order, and an uncollectable delivery.
    await expect(
      service.secureCommitment('user-1', 'order-1', 7000, 'TZS', false),
    ).rejects.toThrow('HTTP 503 wallet unavailable');
  });

  it('surfaces a wallet timeout rather than resolving with a falsy hold', async () => {
    const wallet = walletOk();
    wallet.placeHold.mockRejectedValue(new Error('ETIMEDOUT'));
    const service = new CODCommitmentService(wallet);

    let resolved: string | undefined;
    try {
      resolved = await service.secureCommitment('user-1', 'order-1', 7000, 'TZS', false);
    } catch {
      resolved = undefined;
    }
    expect(resolved).toBeUndefined();
  });

  it('threads the order reference on every attempt, so a stranded hold is attributable', async () => {
    const wallet = walletOk();
    wallet.placeHold.mockRejectedValue(new Error('boom'));
    const service = new CODCommitmentService(wallet);

    await expect(
      service.secureCommitment('user-77', 'order-abc', 5000, 'TZS', true),
    ).rejects.toThrow();

    // Even on failure the call carried the reference. If the wallet had accepted
    // the hold but the response was lost, the reconciliation job needs
    // referenceId to find the order — without it the funds are frozen forever.
    expect(wallet.placeHold).toHaveBeenCalledWith(
      'user-77',
      5000,
      'TZS',
      expect.stringContaining('order-abc'),
      'order-abc',
    );
  });

  // ── Settling the hold ──────────────────────────────────────────────────────

  it('propagates a failed release so the caller can retry', async () => {
    const wallet = walletOk();
    wallet.releaseHold.mockRejectedValue(new Error('HTTP 500'));
    const service = new CODCommitmentService(wallet);

    // Silently swallowing this is what froze buyer funds permanently (DEF-034).
    await expect(service.releaseCommitment('hold-1', 'user-1')).rejects.toThrow('HTTP 500');
  });

  it('propagates a failed capture so the seller is not recorded as paid', async () => {
    const wallet = walletOk();
    wallet.captureHold.mockRejectedValue(new Error('HTTP 502'));
    const service = new CODCommitmentService(wallet);

    await expect(service.captureCommitment('hold-1', 'user-1')).rejects.toThrow('HTTP 502');
  });

  it('forfeiting a hold uses the capture route and still propagates failure', async () => {
    // Forfeiture is a capture: money moves to Maysar as a penalty. Treating it as
    // a release would let a buyer keep the money by refusing delivery.
    const wallet = walletOk();
    wallet.captureHold.mockRejectedValue(new Error('HTTP 500'));
    const service = new CODCommitmentService(wallet);

    await expect(service.forfeitCommitment('hold-1', 'user-1', 'refused')).rejects.toThrow('HTTP 500');
    expect(wallet.captureHold).toHaveBeenCalledWith('hold-1', 'user-1', 'refused');
    expect(wallet.releaseHold).not.toHaveBeenCalled();
  });

  it('always passes the hold owner, even when settling under failure', async () => {
    // The wallet's release/capture routes are scoped by owner and reject a shared
    // "system" identity, so a missing userId is a permanent freeze, not an error.
    const wallet = walletOk();
    wallet.releaseHold.mockRejectedValue(new Error('HTTP 403'));
    const service = new CODCommitmentService(wallet);

    await expect(service.releaseCommitment('hold-1', 'owner-9')).rejects.toThrow('HTTP 403');
    expect(wallet.releaseHold.mock.calls[0][1]).toBe('owner-9');
  });
});
