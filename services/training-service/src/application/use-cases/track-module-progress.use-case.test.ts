jest.mock(
  '@shared-events/eventBus',
  () => ({
    eventBus: { publish: jest.fn() }
  }),
  { virtual: true }
);

describe('TrackModuleProgressUseCase', () => {
  it('updates progress, saves record, and publishes event', async () => {
    const { TrackModuleProgressUseCase } = await import('./track-module-progress.use-case');
    const record = {
      id: 'record-1',
      learnerId: 'learner-1',
      moduleId: 'module-1',
      status: 'IN_PROGRESS',
      progress: {},
      updateProgress: jest.fn(function (data: unknown) {
        this.progress = data;
      })
    };
    const repo = {
      findById: jest.fn().mockResolvedValue(record),
      save: jest.fn().mockResolvedValue(undefined)
    };
    const events = { publish: jest.fn().mockResolvedValue(undefined) };
    const useCase = new TrackModuleProgressUseCase(repo as never, events as never);

    const result = await useCase.execute({
      trainingRecordId: 'record-1',
      progressData: { completionPercentage: 50 }
    });

    expect(record.updateProgress).toHaveBeenCalledWith({ completionPercentage: 50 });
    expect(repo.save).toHaveBeenCalledWith(record);
    expect(events.publish).toHaveBeenCalledWith(
      'TrainingProgressUpdated.v1',
      expect.objectContaining({
        trainingRecordId: 'record-1',
        learnerId: 'learner-1',
        moduleId: 'module-1',
        progress: { completionPercentage: 50 }
      })
    );
    expect(result.trainingRecordId).toBe('record-1');
  });

  it('throws when training record does not exist', async () => {
    const { TrackModuleProgressUseCase } = await import('./track-module-progress.use-case');
    const repo = {
      findById: jest.fn().mockResolvedValue(null),
      save: jest.fn()
    };
    const useCase = new TrackModuleProgressUseCase(repo as never, { publish: jest.fn() } as never);

    await expect(
      useCase.execute({
        trainingRecordId: 'missing-record',
        progressData: {}
      })
    ).rejects.toThrow('TrainingRecord with identifier missing-record was not found');
  });
});
