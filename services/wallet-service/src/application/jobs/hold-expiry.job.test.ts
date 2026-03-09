import { HoldExpiryJob } from './hold-expiry.job';

describe('HoldExpiryJob', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('processes expired holds and continues when one hold fails', async () => {
    const holdRepository = {
      findExpired: jest.fn().mockResolvedValue([{ id: 'hold-1' }, { id: 'hold-2' }])
    };
    const expireHoldUseCase = {
      execute: jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('cannot-expire'))
    };
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const job = new HoldExpiryJob(holdRepository as never, expireHoldUseCase as never);

    await job.start();

    expect(holdRepository.findExpired).toHaveBeenCalledWith(100);
    expect(expireHoldUseCase.execute).toHaveBeenNthCalledWith(1, 'hold-1');
    expect(expireHoldUseCase.execute).toHaveBeenNthCalledWith(2, 'hold-2');
    expect(logSpy).toHaveBeenCalledWith('Expired hold hold-1');
    expect(errorSpy).toHaveBeenCalledWith('Failed to expire hold hold-2', expect.any(Error));
  });

  it('prevents parallel runs while a batch is already in progress', async () => {
    let releaseBatch!: () => void;
    const holdRepository = {
      findExpired: jest.fn().mockImplementation(
        () =>
          new Promise<unknown[]>(resolve => {
            releaseBatch = () => resolve([]);
          })
      )
    };
    const expireHoldUseCase = { execute: jest.fn() };
    const job = new HoldExpiryJob(holdRepository as never, expireHoldUseCase as never);

    const firstRun = job.start();
    const secondRun = job.start();
    releaseBatch();
    await Promise.all([firstRun, secondRun]);

    expect(holdRepository.findExpired).toHaveBeenCalledTimes(1);
  });
});
