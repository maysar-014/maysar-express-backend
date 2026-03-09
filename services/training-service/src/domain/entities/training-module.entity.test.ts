import { ContentType, DifficultyLevel, TrainingModule } from './training-module.entity';

describe('TrainingModule', () => {
  it('exposes module properties and prerequisite helpers', () => {
    const module = TrainingModule.create({
      id: 'module-3',
      name: 'Operations',
      description: 'Operations module',
      contentType: ContentType.INTERACTIVE,
      content: { type: ContentType.INTERACTIVE, metadata: { steps: 5 } },
      durationMinutes: 35,
      category: 'ops',
      prerequisites: ['module-1', 'module-2'],
      targetRoles: ['courier'],
      isPublic: false,
      difficulty: DifficultyLevel.ADVANCED
    });

    expect(module.id).toBe('module-3');
    expect(module.hasPrerequisites()).toBe(true);
    expect(module.validatePrerequisites(['module-1'])).toBe(false);
    expect(module.getMissingPrerequisites(['module-1'])).toEqual(['module-2']);
    expect(module.isTargetedForRole('courier')).toBe(true);
    expect(module.isTargetedForRole('seller')).toBe(false);
  });

  it('is accessible to all roles when targetRoles is empty', () => {
    const module = TrainingModule.create({
      id: 'module-4',
      name: 'General',
      description: 'General module',
      contentType: ContentType.TEXT,
      content: { type: ContentType.TEXT, body: 'general' },
      durationMinutes: 15,
      category: 'general',
      prerequisites: [],
      targetRoles: [],
      isPublic: true,
      difficulty: DifficultyLevel.BEGINNER
    });

    expect(module.isTargetedForRole('courier')).toBe(true);
    expect(module.isTargetedForRole('supplier')).toBe(true);
  });
});
