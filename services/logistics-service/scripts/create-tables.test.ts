const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('create-tables script', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    delete process.env.PRISMA_SCHEMA_PATH;
    delete process.env.MIGRATION_MODE;
  });

  it('runs prisma migrate deploy and generate with the repo schema', async () => {
    const execSync = jest.fn();

    jest.doMock('child_process', () => ({ execSync }));

    require('./create-tables');
    await flush();

    expect(execSync).toHaveBeenCalledTimes(2);
    expect(execSync.mock.calls[0][0]).toEqual(expect.stringContaining('prisma migrate deploy'));
    expect(execSync.mock.calls[0][0]).toEqual(expect.stringMatching(/prisma[\\/]+schema\.prisma/));
    expect(execSync.mock.calls[1][0]).toEqual(expect.stringContaining('prisma generate'));
    expect(execSync.mock.calls[1][0]).toEqual(expect.stringMatching(/prisma[\\/]+schema\.prisma/));
  });

  it('uses migrate dev when MIGRATION_MODE=dev', async () => {
    const execSync = jest.fn();
    process.env.MIGRATION_MODE = 'dev';

    jest.doMock('child_process', () => ({ execSync }));

    require('./create-tables');
    await flush();

    expect(execSync.mock.calls[0][0]).toEqual(expect.stringContaining('prisma migrate dev'));
  });

  it('forwards script errors to console.error', async () => {
    const execSync = jest.fn(() => {
      throw new Error('migration-failed');
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    jest.doMock('child_process', () => ({ execSync }));

    require('./create-tables');
    await flush();

    expect(errorSpy).toHaveBeenCalledWith(expect.any(Error));
  });
});

export {};
