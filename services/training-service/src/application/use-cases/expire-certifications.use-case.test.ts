jest.mock(
  '@shared-events/eventBus',
  () => ({
    eventBus: { publish: jest.fn() }
  }),
  { virtual: true }
);

describe('ExpireCertificationsUseCase', () => {
  it('expires records, saves them, and publishes expiration events', async () => {
    const { ExpireCertificationsUseCase } = await import('./expire-certifications.use-case');
    const first = {
      id: 'record-4',
      learnerId: 'learner-6',
      moduleId: 'module-5',
      expire: jest.fn()
    };
    const second = {
      id: 'record-5',
      learnerId: 'learner-7',
      moduleId: 'module-6',
      expire: jest.fn()
    };
    const repository = {
      findExpired: jest.fn().mockResolvedValue([first, second]),
      save: jest.fn().mockResolvedValue(undefined)
    };
    const events = {
      publish: jest.fn().mockResolvedValue(undefined)
    };
    const useCase = new ExpireCertificationsUseCase(repository as never, events as never);

    await useCase.execute();

    expect(first.expire).toHaveBeenCalledTimes(1);
    expect(second.expire).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenCalledTimes(2);
    expect(events.publish).toHaveBeenCalledTimes(2);
    expect(events.publish).toHaveBeenNthCalledWith(
      1,
      'CertificationExpired.v1',
      expect.objectContaining({
        trainingRecordId: 'record-4',
        learnerId: 'learner-6',
        moduleId: 'module-5'
      })
    );
  });
});
