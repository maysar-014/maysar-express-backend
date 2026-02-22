import { CreateDiscussionThreadUseCase } from '../create-discussion-thread.use-case';

const mockRepository = { create: jest.fn() } as any;

describe('CreateDiscussionThreadUseCase', () => {
    let useCase: CreateDiscussionThreadUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new CreateDiscussionThreadUseCase(mockRepository);
    });

    it('should create thread', async () => {
        mockRepository.create.mockResolvedValue({ id: 't1' });
        const result = await useCase.execute({ title: 'Test', authorId: 'u1' });
        expect(result.id).toBe('t1');
    });
});
