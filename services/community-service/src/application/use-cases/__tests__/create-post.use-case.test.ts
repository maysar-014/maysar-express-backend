import { CreatePostUseCase } from '../create-post.use-case';
import { PostStatus, PostType } from '../../../domain/entities/post.entity';
import { User, UserRole } from '../../../domain/entities/user.entity';
import { TrustMetadata } from '../../../domain/value-objects/trust-metadata.value-object';

const mockRepository = {
    save: jest.fn()
} as any;

const mockIdGenerator = {
    generate: jest.fn().mockReturnValue('p1')
} as any;

const mockAuthorProvider = {
    getAuthor: jest.fn()
} as any;

const mockPostStatsProvider = {
    getPostsCountToday: jest.fn().mockResolvedValue(0),
    getCommercialPostsCountToday: jest.fn().mockResolvedValue(0)
} as any;

describe('CreatePostUseCase', () => {
    let useCase: CreatePostUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new CreatePostUseCase(
            mockRepository,
            mockIdGenerator,
            mockAuthorProvider,
            mockPostStatsProvider
        );
    });

    it('should create a published text post', async () => {
        const author = User.create({
            id: 'u1',
            username: 'test-user',
            displayName: 'Test User',
            role: UserRole.BUYER,
            trustMetadata: TrustMetadata.createDefault()
        });

        mockAuthorProvider.getAuthor.mockResolvedValue(author);
        mockRepository.save.mockResolvedValue(undefined);

        const result = await useCase.execute({
            authorId: 'u1',
            content: 'Test post content for the community feed.',
            type: PostType.TEXT
        });

        expect(result.postId).toBe('p1');
        expect(result.status).toBe(PostStatus.PUBLISHED);
        expect(result.requiresModeration).toBe(false);
        expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });
});
