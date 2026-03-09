import { TrainingModuleMapper } from './training-module.mapper';
import { ContentType, DifficultyLevel, TrainingModule } from '../../domain/entities/training-module.entity';

describe('TrainingModuleMapper', () => {
  it('maps domain entity to dto and persistence shape', () => {
    const module = TrainingModule.create({
      id: 'module-10',
      name: 'Warehouse Safety',
      description: 'Safety fundamentals',
      contentType: ContentType.TEXT,
      content: { type: ContentType.TEXT, body: 'Read this' },
      durationMinutes: 25,
      category: 'safety',
      prerequisites: ['module-1'],
      targetRoles: ['courier'],
      isPublic: true,
      difficulty: DifficultyLevel.BEGINNER
    });

    const dto = TrainingModuleMapper.toDTO(module);
    const persistence = TrainingModuleMapper.toPersistence(module);

    expect(dto.id).toBe('module-10');
    expect(dto.prerequisites).toContain('module-1');
    expect(persistence.contentType).toBe(ContentType.TEXT);
  });

  it('maps plain persistence object back to domain with defaults', () => {
    const domain = TrainingModuleMapper.toDomain({
      id: 'module-11',
      name: 'Navigation',
      description: 'Route navigation basics',
      contentType: ContentType.VIDEO,
      content: { type: ContentType.VIDEO, url: 'https://cdn.example/nav.mp4' },
      durationMinutes: 40,
      category: 'operations'
    });

    expect(domain.id).toBe('module-11');
    expect(domain.prerequisites).toEqual([]);
    expect(domain.targetRoles).toEqual([]);
    expect(domain.isPublic).toBe(true);
    expect(domain.difficulty).toBe(DifficultyLevel.BEGINNER);
  });
});
