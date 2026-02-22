import { SubmitKnowledgeArticleUseCase } from '../submit-knowledge-article.use-case';

const mockRepository = { create: jest.fn() } as any;

describe('SubmitKnowledgeArticleUseCase', () => {
    let useCase: SubmitKnowledgeArticleUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new SubmitKnowledgeArticleUseCase(mockRepository);
    });

    it('should submit article', async () => {
        mockRepository.create.mockResolvedValue({ id: 'a1' });
        const result = await useCase.execute({ title: 'Test', authorId: 'u1', content: 'Content' });
        expect(result.id).toBe('a1');
    });
});
