import { TrainingRecord } from './training-record.entity';
import { TrainingScore } from '../value-objects/training-score.value-object';
import { TrainingStatus } from '../value-objects/training-status.value-object';

describe('TrainingRecord entity', () => {
  const baseDate = new Date('2026-03-09T09:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(baseDate);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('createNew initializes defaults and supports progress updates', () => {
    const record = TrainingRecord.createNew('record-1', 'learner-1', 'COURIER', 'module-1');
    record.updateProgress({ section: 'intro', percent: 20 });

    expect(record.status).toBe(TrainingStatus.NOT_STARTED);
    expect(record.attempts).toBe(0);
    expect(record.progress).toEqual(
      expect.objectContaining({
        section: 'intro',
        percent: 20,
        updatedAt: expect.any(Date)
      })
    );
  });

  it('start enforces valid transitions and increments attempts', () => {
    const record = TrainingRecord.createNew('record-2', 'learner-2', 'COURIER', 'module-2');
    record.start();

    expect(record.status).toBe(TrainingStatus.IN_PROGRESS);
    expect(record.startedAt).toEqual(baseDate);
    expect(record.attempts).toBe(1);

    expect(() => record.start()).toThrow('Cannot start training from status IN_PROGRESS');
  });

  it('complete marks passed training and sets expiration date', () => {
    const record = TrainingRecord.create({
      id: 'record-3',
      learnerId: 'learner-3',
      learnerRole: 'COURIER',
      moduleId: 'module-3',
      status: TrainingStatus.IN_PROGRESS,
      attempts: 1
    });

    record.complete(TrainingScore.create(88), 70, 30);

    expect(record.status).toBe(TrainingStatus.COMPLETED);
    expect(record.score?.getValue()).toBe(88);
    expect(record.completedAt).toEqual(baseDate);
    expect(record.expiresAt).toBeDefined();
    expect(record.isExpired()).toBe(false);
  });

  it('complete below passing score fails training and canRetake reflects max attempts', () => {
    const record = TrainingRecord.create({
      id: 'record-4',
      learnerId: 'learner-4',
      learnerRole: 'COURIER',
      moduleId: 'module-4',
      status: TrainingStatus.IN_PROGRESS,
      attempts: 2
    });

    record.complete(TrainingScore.create(45), 70, 30);

    expect(record.status).toBe(TrainingStatus.FAILED);
    expect(record.expiresAt).toBeUndefined();
    expect(record.canRetake(3)).toBe(true);
    expect(record.canRetake(2)).toBe(false);
  });

  it('fail/expire enforce state invariants and toJSON serializes score value', () => {
    const record = TrainingRecord.create({
      id: 'record-5',
      learnerId: 'learner-5',
      learnerRole: 'COURIER',
      moduleId: 'module-5',
      status: TrainingStatus.IN_PROGRESS,
      attempts: 1
    });
    record.fail();
    expect(record.status).toBe(TrainingStatus.FAILED);
    expect(() => record.expire()).toThrow('Only completed training can expire');

    const completed = TrainingRecord.create({
      id: 'record-6',
      learnerId: 'learner-6',
      learnerRole: 'COURIER',
      moduleId: 'module-6',
      status: TrainingStatus.COMPLETED,
      attempts: 1,
      score: TrainingScore.create(92),
      expiresAt: new Date('2026-03-08T09:00:00.000Z')
    });
    completed.expire();

    expect(completed.status).toBe(TrainingStatus.EXPIRED);
    expect(completed.isExpired()).toBe(true);
    expect(completed.toJSON()).toEqual(
      expect.objectContaining({
        status: TrainingStatus.EXPIRED,
        score: 92
      })
    );
  });
});

