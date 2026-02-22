import { CreatePostUseCase } from '../create-post.use-case';

const mockRepository = { create: jest.fn() } as any;
const mockPolicy = { canPost: jest.fn() } as any;

describe('CreatePostUseCase', () => {
    let useCase: CreatePostUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new CreatePostUseCase(mockRepository, mockPolicy);
    });

    it('should create post', async () => {
        mockPolicy.canPost.mockReturnValue(true);
        mockRepository.create.mockResolvedValue({ id: 'p1' });
        const result = await useCase.execute({ authorId: 'u1', content: 'Test' });
        expect(result.id).toBe('p1');
    });
});
