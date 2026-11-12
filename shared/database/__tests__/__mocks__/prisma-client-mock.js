// Minimal mock for @prisma/client to avoid loading the heavy Prisma client during tests
module.exports = {
  Prisma: {},
  PrismaClient: function MockPrismaClient() {
    return {};
  },
};
