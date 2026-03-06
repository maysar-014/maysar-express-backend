import { PrismaPostRepository } from '../prisma-post.repository';
import { PrismaClient } from '@prisma/client';
import { Post, PostType } from '../../../domain/entities/post.entity';

const mockPrisma = {
    post: {
        upsert: jest.fn(),
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

    it('should save post', async () => {
        (mockPrisma.post.upsert as jest.Mock).mockResolvedValue({ id: 'p1' });
        const post = Post.create({ id: 'p1', authorId: 'u1', content: 'test', type: PostType.TEXT });
        await repository.save(post);
        expect(mockPrisma.post.upsert).toHaveBeenCalled();
    });
});
