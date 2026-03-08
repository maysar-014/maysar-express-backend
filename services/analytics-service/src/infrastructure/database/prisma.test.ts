const prismaConstructorMock = jest.fn().mockImplementation(() => ({
  $disconnect: jest.fn()
}));

jest.mock('@prisma/client', () => ({
  PrismaClient: prismaConstructorMock
}));

describe('prisma module bootstrap', () => {
  const previousEnv = { ...process.env };
  const globalWithPrisma = globalThis as typeof globalThis & { prisma?: unknown };

  afterEach(() => {
    process.env = { ...previousEnv };
    delete globalWithPrisma.prisma;
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('sets singleton prisma on global object for non-production mode', async () => {
    process.env.NODE_ENV = 'development';

    const rootModule = await import('../../../../../src/config/prisma');
    const rootPrisma = rootModule.prisma;

    expect(rootPrisma).toBeDefined();
    expect(globalWithPrisma.prisma).toBe(rootPrisma);
    expect(prismaConstructorMock).toHaveBeenCalledTimes(1);
  });

  it('creates analytics prisma client and exports it as default', async () => {
    const analyticsModule = await import('./prisma');

    expect(analyticsModule.default).toBeDefined();
    expect(prismaConstructorMock).toHaveBeenCalled();
  });
});
