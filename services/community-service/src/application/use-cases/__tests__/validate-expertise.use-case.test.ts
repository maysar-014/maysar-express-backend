import { ValidateExpertiseUseCase } from '../validate-expertise.use-case';
import { BusinessProfile } from '../../../domain/entities/business-profile.entity';

const mockProfileRepository = { findByUserId: jest.fn(), save: jest.fn() } as any;
const mockTrainingService = { getCompletedModules: jest.fn() } as any;
const mockBusinessRegistry = { verifyBusinessCredentials: jest.fn() } as any;
const mockEventPublisher = { publish: jest.fn() } as any;

describe('ValidateExpertiseUseCase', () => {
    let useCase: ValidateExpertiseUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new ValidateExpertiseUseCase(
            mockProfileRepository,
            mockTrainingService,
            mockBusinessRegistry,
            mockEventPublisher
        );
    });

    it('should validate expertise', async () => {
        const profile = BusinessProfile.create({ id: 'bp1', userId: 'u1' });
        mockProfileRepository.findByUserId.mockResolvedValue(profile);
        mockTrainingService.getCompletedModules.mockResolvedValue([]);
        mockBusinessRegistry.verifyBusinessCredentials.mockResolvedValue(true);

        const result = await useCase.execute({
            userId: 'u1',
            expertiseArea: 'farming',
            targetLevel: 'BEGINNER'
        });

        expect(result.verified).toBe(true);
        expect(mockProfileRepository.save).toHaveBeenCalledWith(profile);
        expect(mockEventPublisher.publish).toHaveBeenCalledWith(
            'ExpertiseValidated',
            expect.objectContaining({
                userId: 'u1',
                expertiseArea: 'farming',
                level: 'BEGINNER',
                verified: true
            })
        );
    });
});
