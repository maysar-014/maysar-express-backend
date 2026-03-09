import { CertificationExpirationJob } from './certification-expiration.job';

describe('CertificationExpirationJob', () => {
  it('invokes expiration use case when job runs', async () => {
    const execute = jest.fn().mockResolvedValue(undefined);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const job = new CertificationExpirationJob({ execute } as never);

    await job.run();

    expect(logSpy).toHaveBeenCalledWith('Running certification expiration check...');
    expect(execute).toHaveBeenCalledTimes(1);
    logSpy.mockRestore();
  });
});
