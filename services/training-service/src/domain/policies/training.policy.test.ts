import { CertificationRequirement } from '../entities/certification-requirement.entity';
import { ContentType, DifficultyLevel, TrainingModule } from '../entities/training-module.entity';
import { TrainingRecord } from '../entities/training-record.entity';
import { TrainingStatus } from '../value-objects/training-status.value-object';
import { TrainingPolicy } from './training.policy';

describe('TrainingPolicy', () => {
  it('returns informational warnings and recommendations while allowing start', () => {
    const policy = new TrainingPolicy();
    const module = TrainingModule.create({
      id: 'module-1',
      name: 'Advanced Safety',
      description: 'desc',
      contentType: ContentType.TEXT,
      content: { type: ContentType.TEXT, body: 'x' },
      durationMinutes: 30,
      category: 'safety',
      prerequisites: ['module-0'],
      targetRoles: ['seller'],
      isPublic: true,
      difficulty: DifficultyLevel.ADVANCED
    });
    const requirement = CertificationRequirement.create({
      module: 'module-1',
      minimumScore: 70,
      validityPeriodDays: 365,
      mandatory: true,
      maxAttempts: 2
    });
    const record = TrainingRecord.create({
      id: 'record-1',
      learnerId: 'learner-1',
      learnerRole: 'courier',
      moduleId: 'module-1',
      status: TrainingStatus.IN_PROGRESS,
      attempts: 2
    });

    const result = policy.canStartTraining(
      'learner-1',
      'courier',
      module,
      [record],
      requirement,
      []
    );

    expect(result.canStart).toBe(true);
    expect(result.warnings?.join(' ')).toContain('maximum attempts');
    expect(result.warnings?.join(' ')).toContain('in-progress session');
    expect(result.recommendations?.join(' ')).toContain('primarily designed for other roles');
    expect(result.recommendations?.join(' ')).toContain('consider completing these modules first');
  });

  it('validates access and score bounds', () => {
    const policy = new TrainingPolicy();

    expect(policy.canAccessTraining('user-1')).toBe(true);
    expect(policy.canAccessTraining('')).toBe(false);
    expect(policy.validateScore(0)).toBe(true);
    expect(policy.validateScore(100)).toBe(true);
    expect(policy.validateScore(101)).toBe(false);
  });
});
