import { AuditRepository } from '../audit.repository';
import { PrismaClient } from '@prisma/client';

const mockPrisma = {
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn()
  }
} as unknown as PrismaClient;

describe('AuditRepository', () => {
  let repository: AuditRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new AuditRepository(mockPrisma);
  });

  it('should create audit entry', async () => {
    (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({
      id: 'a1',
      action: 'user.login'
    });

    const audit = await repository.create({
      userId: 'u1',
      action: 'user.login',
      metadata: {}
    });

    expect(audit.id).toBe('a1');
  });

  it('should find audit logs', async () => {
    (mockPrisma.auditLog.findMany as jest.Mock).mockResolvedValue([
      { id: 'a1', action: 'login' }
    ]);

    const logs = await repository.findByUser('u1');

    expect(logs).toHaveLength(1);
  });
});
