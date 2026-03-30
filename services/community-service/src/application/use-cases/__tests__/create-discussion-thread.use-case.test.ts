import { CreateDiscussionThreadUseCase } from '../create-discussion-thread.use-case';
import { BusinessProfile } from '../../../domain/entities/business-profile.entity';
import { DiscussionThread, ExpertiseLevel } from '../../../domain/entities/discussion-thread.entity';

const mockThreadRepository = {
    save: jest.fn(),
    findDuplicates: jest.fn()
} as any;

const mockQuotaRepository = {
    findByUserAndType: jest.fn(),
    save: jest.fn()
} as any;

const mockProfileRepository = {
    findByUserId: jest.fn()
} as any;

const mockExpertProvider = {
    getAvailableExperts: jest.fn()
} as any;

const mockEventPublisher = {
    publish: jest.fn()
} as any;

describe('CreateDiscussionThreadUseCase', () => {
    let useCase: CreateDiscussionThreadUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new CreateDiscussionThreadUseCase(
            mockThreadRepository,
            mockQuotaRepository,
            mockProfileRepository,
            mockExpertProvider,
            mockEventPublisher
        );
    });

    it('should create thread', async () => {
        const profile = BusinessProfile.create({ id: 'bp1', userId: 'u1' });

        mockProfileRepository.findByUserId.mockResolvedValue(profile);
        mockQuotaRepository.findByUserAndType.mockResolvedValue(null);
        mockQuotaRepository.save.mockImplementation(async (quota: any) => quota);
        mockThreadRepository.findDuplicates.mockResolvedValue([]);
        mockThreadRepository.save.mockImplementation(async (thread: DiscussionThread) => thread);
        mockExpertProvider.getAvailableExperts.mockResolvedValue([]);

        const result = await useCase.execute({
            authorId: 'u1',
            topic: 'Test Topic',
            content: 'This discussion explores revenue, operations, and customer strategy for a growing farm business.',
            category: 'GENERAL',
            expertiseLevel: ExpertiseLevel.BEGINNER,
            businessContext: {
                industry: ['agriculture'],
                businessStage: 'startup',
                tags: ['farming']
            }
        });

        expect(result.thread.authorId).toBe('u1');
        expect(result.matchedExperts).toEqual([]);
        expect(result.quotaRemaining).toBe(2);
        expect(mockEventPublisher.publish).toHaveBeenCalledWith(
            'ThreadCreated',
            expect.objectContaining({
                authorId: 'u1',
                topic: 'Test Topic',
                category: 'GENERAL'
            })
        );
    });
});
