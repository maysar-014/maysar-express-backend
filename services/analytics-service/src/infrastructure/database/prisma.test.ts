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

  it('exports a lazy prisma proxy that resolves the client on first property access', async () => {
    const analyticsModule = await import('./prisma');

    // Importing the module must not open a connection pool (monolith mode reuses
    // globalThis.prisma, and standalone/test mode defers creation to first use).
    expect(analyticsModule.default).toBeDefined();
    expect(prismaConstructorMock).not.toHaveBeenCalled();

    // First property access resolves the client through createPrismaClient().
    expect(typeof analyticsModule.default.$disconnect).toBe('function');
    expect(prismaConstructorMock).toHaveBeenCalledTimes(1);
  });
});
