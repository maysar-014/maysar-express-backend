import { PrismaPostRepository } from '../prisma-post.repository';
import { PrismaClient } from '@prisma/client';

const mockPrisma = {
    post: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn()
    }
} as unknown as PrismaClient;

describe('PrismaPostRepository', () => {
    let repository: PrismaPostRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new PrismaPostRepository(mockPrisma);
    });

    it('should create post', async () => {
        (mockPrisma.post.create as jest.Mock).mockResolvedValue({ id: 'p1' });
        const result = await repository.create({} as any);
        expect(mockPrisma.post.create).toHaveBeenCalled();
    });
});
