import { TrainingModuleDTO } from './training-module.dto';

describe('training-module.dto', () => {
  it('supports module dto shape', () => {
    const dto: TrainingModuleDTO = {
      id: 'module-2',
      name: 'Road Safety',
      description: 'Road safety fundamentals',
      contentType: 'video',
      content: { url: 'https://cdn.example/road-safety.mp4' },
      durationMinutes: 40,
      category: 'safety',
      prerequisites: ['module-1'],
      targetRoles: ['courier'],
      isPublic: true,
      difficulty: 'intermediate'
    };

    expect(dto.name).toBe('Road Safety');
    expect(dto.prerequisites).toContain('module-1');
  });
});
