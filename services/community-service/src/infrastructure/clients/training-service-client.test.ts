import { HttpTrainingServiceClient } from './training-service-client';
import { TrainingStatus } from '../../../../training-service/src/domain/value-objects/training-status.value-object';

const mockTrainingRecordRepo = {
  findByLearnerId: jest.fn()
};

const mockModuleRepo = {
  findById: jest.fn()
};

jest.mock('../../../../training-service/src/infrastructure/container', () => ({
  Container: {
    getInstance: () => ({
      trainingRecordRepo: mockTrainingRecordRepo,
      moduleRepo: mockModuleRepo
    })
  }
}));

describe('HttpTrainingServiceClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns completed modules and defaults to empty array', async () => {
    mockTrainingRecordRepo.findByLearnerId
      .mockResolvedValueOnce([
        { status: TrainingStatus.COMPLETED, moduleId: 'm1' },
        { status: TrainingStatus.IN_PROGRESS, moduleId: 'm2' },
        { status: TrainingStatus.COMPLETED, moduleId: 'm3' }
      ])
      .mockResolvedValueOnce([]);
    const client = new HttpTrainingServiceClient();

    await expect(client.getCompletedModules('u1')).resolves.toEqual(['m1', 'm3']);
    await expect(client.getCompletedModules('u2')).resolves.toEqual([]);
  });

  it('handles module details fetch success and 404', async () => {
    mockModuleRepo.findById
      .mockResolvedValueOnce({ id: 'm1', name: 'T', category: 'C', difficulty: 'L' })
      .mockResolvedValueOnce(null);
    const client = new HttpTrainingServiceClient();

    await expect(client.getModuleDetails('m1')).resolves.toEqual(
      expect.objectContaining({ id: 'm1', title: 'T', category: 'C' })
    );
    await expect(client.getModuleDetails('missing')).resolves.toBeNull();
  });

  it('handles user progress fetch success', async () => {
    mockTrainingRecordRepo.findByLearnerId
      .mockResolvedValueOnce([
        { status: TrainingStatus.COMPLETED },
        { status: TrainingStatus.COMPLETED },
        { status: TrainingStatus.IN_PROGRESS }
      ])
      .mockResolvedValueOnce([]);
    const client = new HttpTrainingServiceClient();

    await expect(client.getUserProgress('u1')).resolves.toEqual(
      expect.objectContaining({ totalModulesCompleted: 2 })
    );
    await expect(client.getUserProgress('u2')).resolves.toEqual({
      totalModulesCompleted: 0,
      certificationsEarned: 0,
      currentLevel: 'BEGINNER',
      categories: []
    });
  });
});
