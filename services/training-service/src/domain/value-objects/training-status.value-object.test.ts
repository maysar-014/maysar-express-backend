import { TrainingStatus, TrainingStatusHelper } from './training-status.value-object';

describe('TrainingStatusHelper', () => {
  it('allows valid transitions and blocks invalid ones', () => {
    expect(TrainingStatusHelper.canTransitionTo(TrainingStatus.NOT_STARTED, TrainingStatus.IN_PROGRESS)).toBe(
      true
    );
    expect(TrainingStatusHelper.canTransitionTo(TrainingStatus.IN_PROGRESS, TrainingStatus.COMPLETED)).toBe(
      true
    );
    expect(TrainingStatusHelper.canTransitionTo(TrainingStatus.COMPLETED, TrainingStatus.IN_PROGRESS)).toBe(
      false
    );
  });

  it('evaluates active and terminal statuses correctly', () => {
    expect(TrainingStatusHelper.isActive(TrainingStatus.IN_PROGRESS)).toBe(true);
    expect(TrainingStatusHelper.isActive(TrainingStatus.FAILED)).toBe(false);
    expect(TrainingStatusHelper.isTerminal(TrainingStatus.COMPLETED)).toBe(true);
    expect(TrainingStatusHelper.isTerminal(TrainingStatus.EXPIRED)).toBe(true);
    expect(TrainingStatusHelper.isTerminal(TrainingStatus.IN_PROGRESS)).toBe(false);
  });
});
