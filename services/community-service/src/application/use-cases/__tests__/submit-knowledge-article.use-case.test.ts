import { SubmitKnowledgeArticleUseCase } from '../submit-knowledge-article.use-case';
import { BusinessProfile } from '../../../domain/entities/business-profile.entity';

const mockArticleRepository = {
    save: jest.fn(),
    findByTitleAndAuthor: jest.fn()
} as any;

const mockProfileRepository = {
    findByUserId: jest.fn()
} as any;

const mockQuotaRepository = {
    findByUserAndType: jest.fn(),
    save: jest.fn()
} as any;

const mockEventPublisher = {
    publish: jest.fn()
} as any;

describe('SubmitKnowledgeArticleUseCase', () => {
    let useCase: SubmitKnowledgeArticleUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new SubmitKnowledgeArticleUseCase(
            mockArticleRepository,
            mockProfileRepository,
            mockQuotaRepository,
            mockEventPublisher
        );
    });

    it('should submit article', async () => {
        const profile = BusinessProfile.create({ id: 'bp1', userId: 'u1' });
        profile.updateContributionMetrics({ helpfulAnswers: 50 });

        mockProfileRepository.findByUserId.mockResolvedValue(profile);
        mockQuotaRepository.findByUserAndType.mockResolvedValue(null);
        mockQuotaRepository.save.mockImplementation(async (quota: any) => quota);
        mockArticleRepository.findByTitleAndAuthor.mockResolvedValue(null);
        mockArticleRepository.save.mockImplementation(async (article: any) => article);

        const result = await useCase.execute({
            authorId: 'u1',
            title: 'Test Article',
            summary: 'This is a detailed summary of the article that is long enough to satisfy validation checks.',
            sections: [
                {
                    order: 1,
                    heading: 'Introduction',
                    content: 'This section provides enough business context and detail to satisfy the article validation rules.'
                },
                {
                    order: 2,
                    heading: 'Details',
                    content: 'This section adds additional content so the combined article body clears the minimum character threshold.'
                }
            ],
            category: 'BEST_PRACTICES',
            industryTags: ['agriculture'],
            expertiseLevel: 'BEGINNER'
        });

        expect(result.article.authorId).toBe('u1');
        expect(result.requiresPeerReview).toBe(true);
        expect(mockEventPublisher.publish).toHaveBeenCalledWith(
            'KnowledgeArticleSubmitted',
            expect.objectContaining({
                authorId: 'u1',
                title: 'Test Article',
                requiresPeerReview: true
            })
        );
    });
});
