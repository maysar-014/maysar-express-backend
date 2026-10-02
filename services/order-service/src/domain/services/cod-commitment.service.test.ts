import { CODCommitmentService } from './cod-commitment.service';

describe('CODCommitmentService', () => {
  it('uses the requested delivery fee as the commitment amount', () => {
    const service = new CODCommitmentService({} as never);

    expect(service.calculateCommitmentFee(20000, 0)).toBe(20000);
    expect(service.calculateCommitmentFee(12000, 0)).toBe(12000);
  });

  it('falls back to the logistics estimate for free-delivery COD orders', () => {
    const service = new CODCommitmentService({} as never);

    // No delivery fee to hold, so the logistics estimate becomes the commitment.
    expect(service.calculateCommitmentFee(0, 5000)).toBe(5000);
  });

  it('rejects a non-numeric or negative logistics estimate', () => {
    const service = new CODCommitmentService({} as never);

    expect(() => service.calculateCommitmentFee(0, Number.NaN)).toThrow(
      'Logistics estimate must be a non-negative finite number'
    );
    expect(() => service.calculateCommitmentFee(0, -1)).toThrow(
      'Logistics estimate must be a non-negative finite number'
    );
  });

  it('delegates secure/release/forfeit operations to wallet client', async () => {
    const walletService = {
      placeHold: jest.fn().mockResolvedValue('hold-1'),
      releaseHold: jest.fn().mockResolvedValue(undefined),
      captureHold: jest.fn().mockResolvedValue(undefined)
    };
    const service = new CODCommitmentService(walletService);

    const holdId = await service.secureCommitment('user-1', 'order-1', 7000, 'TZS', false);
    await service.releaseCommitment('hold-1', 'user-1', 'released');
    await service.forfeitCommitment('hold-1', 'user-1', 'forfeited');

    expect(holdId).toBe('hold-1');
    expect(walletService.placeHold).toHaveBeenCalledWith(
      'user-1',
      7000,
      'TZS',
      'COD Delivery Fee for Order order-1 — secured before packaging',
      // The order id is threaded through so the wallet's reconciliation job can
      // resolve which order a stranded hold belongs to.
      'order-1'
    );
    // The hold owner MUST be threaded through: the wallet's release/capture
    // routes are scoped by userId and its authorization middleware rejects a
    // shared "system" identity, so omitting it silently froze the buyer's funds
    // forever when a COD order was cancelled.
    expect(walletService.releaseHold).toHaveBeenCalledWith('hold-1', 'user-1', 'released');
    expect(walletService.captureHold).toHaveBeenCalledWith('hold-1', 'user-1', 'forfeited');
  });

  it('propagates a failed release so callers can surface it', async () => {
    const walletService = {
      placeHold: jest.fn().mockResolvedValue('hold-1'),
      releaseHold: jest.fn().mockRejectedValue(new Error('HTTP 403')),
      captureHold: jest.fn().mockResolvedValue(undefined)
    };
    const service = new CODCommitmentService(walletService);

    // Previously swallowed inside the client, which is how a permanently frozen
    // hold went unnoticed.
    await expect(service.releaseCommitment('hold-1', 'user-1')).rejects.toThrow('HTTP 403');
  });
});
