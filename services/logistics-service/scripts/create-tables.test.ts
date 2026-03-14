const flush = () => new Promise<void>(resolve => setImmediate(resolve));

describe('create-tables script', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('issues create table query through prisma manager', async () => {
    const executeRawUnsafe = jest.fn().mockResolvedValue(1);
    const connect = jest.fn().mockResolvedValue(undefined);
    const getClient = jest.fn(() => ({ $executeRawUnsafe: executeRawUnsafe }));

    jest.doMock('../src/infrastructure/database/prisma.client', () => ({
      PrismaClientManager: {
        getInstance: jest.fn(() => ({ connect, getClient }))
      }
    }));

    require('./create-tables');
    await flush();

    expect(connect).toHaveBeenCalledTimes(1);
    expect(getClient).toHaveBeenCalledTimes(1);
    expect(executeRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS couriers'));
  });

  it('forwards script errors to console.error', async () => {
    const connect = jest.fn().mockRejectedValue(new Error('connect-failed'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    jest.doMock('../src/infrastructure/database/prisma.client', () => ({
      PrismaClientManager: {
        getInstance: jest.fn(() => ({ connect, getClient: jest.fn() }))
      }
    }));

    require('./create-tables');
    await flush();

    expect(errorSpy).toHaveBeenCalledWith(expect.any(Error));
  });
});

export {};
