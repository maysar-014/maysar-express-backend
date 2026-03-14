import { EventIdempotency } from '@shared/middleware/idempotency';
import {
  ICourierEligibilityPort,
  ITrainingRecordRepository,
  TrainingModule,
  TrainingSaga,
  TrainingStatus
} from './training.saga';

class TestableTrainingSaga extends TrainingSaga {
  public publishCommand = jest.fn();
}

describe('TrainingSaga', () => {
  const trainingRecordRepository: jest.Mocked<ITrainingRecordRepository> = {
    save: jest.fn(),
    findByModule: jest.fn(),
    findAll: jest.fn()
  };

  const eligibilityPort: jest.Mocked<ICourierEligibilityPort> = {
    updateEligibility: jest.fn()
  };

  const eventIdempotency = {
    withIdempotency: jest.fn().mockImplementation(
      (_key: string, _consumer: string, cb: () => Promise<unknown>) => cb()
    )
  } as unknown as EventIdempotency;

  const saga = new TestableTrainingSaga(
    {
      save: jest.fn(),
      update: jest.fn(),
      saveStep: jest.fn(),
      updateStep: jest.fn(),
      getById: jest.fn(),
      getSteps: jest.fn()
    } as never,
    'order-service',
    trainingRecordRepository,
    eligibilityPort,
    eventIdempotency
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defines the standardized training flow steps', () => {
    expect(saga.steps.map(step => step.name)).toEqual([
      'start_training',
      'record_completion',
      'update_eligibility'
    ]);
  });

  it('creates in-progress record on start when no active record exists', async () => {
    trainingRecordRepository.findByModule.mockResolvedValueOnce(null);
    const context = { courierId: 'courier-1', module: TrainingModule.SAFETY_BASICS };
    const step = saga.steps.find(s => s.name === 'start_training');

    await step?.execute(context, 'saga-1');

    expect(trainingRecordRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'saga-1',
        courierId: 'courier-1',
        module: TrainingModule.SAFETY_BASICS,
        status: TrainingStatus.IN_PROGRESS,
        attempts: 1
      })
    );
    expect(context.record?.status).toBe(TrainingStatus.IN_PROGRESS);
  });

  it('reuses existing in-progress record without saving a new one', async () => {
    const existing = {
      id: 'record-1',
      courierId: 'courier-2',
      module: TrainingModule.CUSTOMER_SERVICE,
      status: TrainingStatus.IN_PROGRESS,
      attempts: 2
    };
    trainingRecordRepository.findByModule.mockResolvedValueOnce(existing as never);
    const context = { courierId: 'courier-2', module: TrainingModule.CUSTOMER_SERVICE };
    const step = saga.steps.find(s => s.name === 'start_training');

    await step?.execute(context, 'saga-2');

    expect(trainingRecordRepository.save).not.toHaveBeenCalled();
    expect(context.record).toEqual(existing);
  });

  it('requires score before completing training record', async () => {
    const context = {
      courierId: 'courier-3',
      module: TrainingModule.DELIVERY_PROCEDURES,
      record: {
        id: 'record-3',
        courierId: 'courier-3',
        module: TrainingModule.DELIVERY_PROCEDURES,
        status: TrainingStatus.IN_PROGRESS,
        attempts: 1
      }
    };
    const step = saga.steps.find(s => s.name === 'record_completion');

    await expect(step?.execute(context as never, 'saga-3')).rejects.toThrow('Waiting for training score');
  });

  it('marks completion, sets expiry when passing score, and updates eligibility', async () => {
    const context = {
      courierId: 'courier-4',
      module: TrainingModule.SAFETY_BASICS,
      score: 92,
      record: {
        id: 'record-4',
        courierId: 'courier-4',
        module: TrainingModule.SAFETY_BASICS,
        status: TrainingStatus.IN_PROGRESS,
        attempts: 1
      }
    };

    const completionStep = saga.steps.find(s => s.name === 'record_completion');
    await completionStep?.execute(context as never, 'saga-4');
    expect(trainingRecordRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: TrainingStatus.COMPLETED,
        score: 92,
        expiresAt: expect.any(Date)
      })
    );

    trainingRecordRepository.findAll.mockResolvedValueOnce([
      { module: TrainingModule.SAFETY_BASICS, status: TrainingStatus.COMPLETED, expiresAt: new Date(Date.now() + 86400000) },
      { module: TrainingModule.CUSTOMER_SERVICE, status: TrainingStatus.COMPLETED, expiresAt: new Date(Date.now() + 86400000) },
      { module: TrainingModule.DELIVERY_PROCEDURES, status: TrainingStatus.COMPLETED, expiresAt: new Date(Date.now() + 86400000) },
      { module: TrainingModule.EMERGENCY_PROTOCOLS, status: TrainingStatus.COMPLETED, expiresAt: new Date(Date.now() + 86400000) }
    ] as never);

    const publishSpy = jest.spyOn(saga as any, 'publishCommand').mockResolvedValue(undefined);
    const eligibilityStep = saga.steps.find(s => s.name === 'update_eligibility');
    await eligibilityStep?.execute({ courierId: 'courier-4', module: TrainingModule.SAFETY_BASICS } as never, 'saga-4');

    expect(eligibilityPort.updateEligibility).toHaveBeenCalledWith('courier-4', true);
    expect(publishSpy).toHaveBeenCalledWith(
      'CourierEligibilityUpdated',
      expect.objectContaining({ courierId: 'courier-4', eligible: true }),
      'saga-4',
      'saga-4'
    );
  });

  it('handles external training completion with idempotency wrapper', async () => {
    const completeSpy = jest.spyOn(saga as any, 'completeStep').mockResolvedValue(undefined);

    await saga.handleTrainingFinished('saga-5', 88);

    expect((eventIdempotency.withIdempotency as jest.Mock)).toHaveBeenCalledWith(
      'saga-5:training_finished:88',
      'TrainingSaga.TrainingFinished',
      expect.any(Function)
    );
    expect(completeSpy).toHaveBeenCalledWith('saga-5', 'record_completion', undefined, expect.any(Function));
  });
});
