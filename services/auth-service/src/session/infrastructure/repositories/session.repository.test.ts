import { SessionRepository } from '../session.repository';
import { PrismaClient } from '@prisma/client';

const mockPrisma = {
  session: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn()
  }
} as unknown as PrismaClient;

describe('SessionRepository', () => {
  let repository: SessionRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new SessionRepository(mockPrisma);
  });

  it('should create session', async () => {
    (mockPrisma.session.create as jest.Mock).mockResolvedValue({
      id: 's1',
      userId: 'u1'
    });

    const session = await repository.create({
      userId: 'u1',
      token: 'token123'
    });

    expect(session.id).toBe('s1');
  });

  it('should find session by id', async () => {
    (mockPrisma.session.findUnique as jest.Mock).mockResolvedValue({
      id: 's1'
    });

    const session = await repository.findById('s1');

    expect(session).toBeDefined();
  });

  it('should delete session', async () => {
    await repository.delete('s1');

    expect(mockPrisma.session.delete).toHaveBeenCalledWith({
      where: { id: 's1' }
    });
  });
});
