import { CODCommitmentService } from './cod-commitment.service';

describe('CODCommitmentService', () => {
  it('uses the requested delivery fee as the commitment amount', () => {
    const service = new CODCommitmentService({} as never);

    expect(service.calculateCommitmentFee(20000)).toBe(20000);
    expect(service.calculateCommitmentFee(12000)).toBe(12000);
  });

  it('rejects zero or negative delivery fees', () => {
    const service = new CODCommitmentService({} as never);

    expect(() => service.calculateCommitmentFee(0)).toThrow('Delivery fee must be greater than zero');
    expect(() => service.calculateCommitmentFee(-10)).toThrow('Delivery fee must be greater than zero');
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
      'COD Delivery Fee Commitment for Order order-1'
    );
    expect(walletService.releaseHold).toHaveBeenCalledWith('hold-1');
    expect(walletService.captureHold).toHaveBeenCalledWith('hold-1');
  });
});

