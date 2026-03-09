import { CODCommitmentService } from './cod-commitment.service';

describe('CODCommitmentService', () => {
  it('calculates commitment fee using max of percentage and minimum threshold', () => {
    const service = new CODCommitmentService({} as never);

    expect(service.calculateCommitmentFee(20000)).toBe(5000); // 5% = 1000 -> min 5000
    expect(service.calculateCommitmentFee(200000)).toBe(10000); // 5% = 10000
  });

  it('delegates secure/release/forfeit operations to wallet client', async () => {
    const walletService = {
      placeHold: jest.fn().mockResolvedValue('hold-1'),
      releaseHold: jest.fn().mockResolvedValue(undefined),
      captureHold: jest.fn().mockResolvedValue(undefined)
    };
    const service = new CODCommitmentService(walletService);

    const holdId = await service.secureCommitment('user-1', 'order-1', 7000, 'TZS');
    await service.releaseCommitment('hold-1');
    await service.forfeitCommitment('hold-1');

    expect(holdId).toBe('hold-1');
    expect(walletService.placeHold).toHaveBeenCalledWith(
      'user-1',
      7000,
      'TZS',
      'COD Commitment Fee for Order order-1'
    );
    expect(walletService.releaseHold).toHaveBeenCalledWith('hold-1');
    expect(walletService.captureHold).toHaveBeenCalledWith('hold-1');
  });
});

