import { GetAvailableModulesUseCase } from './get-available-modules.use-case';
import { ContentType, DifficultyLevel, TrainingModule } from '../../domain/entities/training-module.entity';

describe('GetAvailableModulesUseCase', () => {
  it('returns modules and recommendations where prerequisites are met', async () => {
    const basic = TrainingModule.create({
      id: 'module-basic',
      name: 'Basic Safety',
      description: 'Basics',
      contentType: ContentType.TEXT,
      content: { type: ContentType.TEXT, body: 'text' },
      durationMinutes: 20,
      category: 'safety',
      prerequisites: [],
      targetRoles: ['courier'],
      isPublic: true,
      difficulty: DifficultyLevel.BEGINNER
    });
    const advanced = TrainingModule.create({
      id: 'module-advanced',
      name: 'Advanced Safety',
      description: 'Advanced',
      contentType: ContentType.TEXT,
      content: { type: ContentType.TEXT, body: 'text' },
      durationMinutes: 30,
      category: 'safety',
      prerequisites: ['module-basic'],
      targetRoles: ['courier'],
      isPublic: true,
      difficulty: DifficultyLevel.INTERMEDIATE
    });
    const expert = TrainingModule.create({
      id: 'module-expert',
      name: 'Expert Safety',
      description: 'Expert',
      contentType: ContentType.TEXT,
      content: { type: ContentType.TEXT, body: 'text' },
      durationMinutes: 45,
      category: 'safety',
      prerequisites: ['module-advanced'],
      targetRoles: ['courier'],
      isPublic: true,
      difficulty: DifficultyLevel.ADVANCED
    });
    const moduleRepo = {
      findAvailable: jest.fn().mockResolvedValue([basic, advanced, expert])
    };
    const recordRepo = {
      findByLearnerId: jest.fn().mockResolvedValue([
        { moduleId: 'module-basic', status: 'COMPLETED', isExpired: () => false },
        { moduleId: 'module-expert', status: 'IN_PROGRESS', isExpired: () => false }
      ])
    };
    const useCase = new GetAvailableModulesUseCase(
      moduleRepo as never,
      recordRepo as never,
      {} as never
    );

    const result = await useCase.execute({ learnerId: 'learner-1', learnerRole: 'courier' });

    expect(result.modules).toHaveLength(3);
    expect(result.recommendations).toEqual(['module-advanced']);
  });
});
