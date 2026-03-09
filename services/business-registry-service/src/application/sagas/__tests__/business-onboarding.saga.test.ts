const startMock = jest.fn();
const logger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

jest.mock('@shared/saga/saga.orchestrator', () => ({
  DistributedSagaOrchestrator: class MockDistributedSagaOrchestrator<T = unknown> {
    public steps: any[];

    constructor() {
      this.steps = (this as any).defineSteps();
    }

    async start(payload: T, correlationId?: string): Promise<string> {
      return startMock(payload, correlationId);
    }
  }
}));

jest.mock('../../../infrastructure/repositories/saga.repository', () => ({
  sagaLogRepository: {}
}));

jest.mock('../../../infrastructure', () => ({
  logger
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'uuid-correlation-id')
}));

import { BusinessRegisteredEvent } from '../../../domain/events';
import { BusinessType } from '../../../domain/types/business.types';
import { BusinessOnboardingSaga, executeBusinessOnboardingSaga } from '../business-onboarding.saga';

describe('BusinessOnboardingSaga', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createEvent = (correlationId?: string) =>
    new BusinessRegisteredEvent(
      'biz-1',
      'owner-1',
      BusinessType.SOLE_PROPRIETORSHIP,
      'REG-101',
      correlationId ? { correlationId } : undefined
    );

  it('defines three onboarding steps with compensation handlers', async () => {
    const saga = new BusinessOnboardingSaga();
    const steps = (saga as any).steps;

    expect(steps).toHaveLength(3);
    expect(steps.map((s: any) => s.name)).toEqual([
      'NotifyUserService',
      'ConfigureCapabilities',
      'SetupComplianceTracking'
    ]);

    const context = {
      userServiceNotified: false,
      capabilitiesConfigured: false,
      complianceTrackingSetup: false
    };

    await steps[0].execute(context);
    await steps[1].execute(context);
    await steps[2].execute(context);
    expect(context).toEqual({
      userServiceNotified: true,
      capabilitiesConfigured: true,
      complianceTrackingSetup: true
    });

    await steps[2].compensate(context);
    await steps[1].compensate(context);
    await steps[0].compensate(context);
    expect(context).toEqual({
      userServiceNotified: false,
      capabilitiesConfigured: false,
      complianceTrackingSetup: false
    });
  });

  it('executeBusinessOnboardingSaga uses event correlation id when provided', async () => {
    const event = createEvent('corr-from-event');
    startMock.mockResolvedValue('saga-1');

    await executeBusinessOnboardingSaga(event);

    expect(startMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event,
        userServiceNotified: false,
        capabilitiesConfigured: false,
        complianceTrackingSetup: false,
        metadata: expect.objectContaining({
          correlationId: 'corr-from-event',
          businessId: 'biz-1',
          ownerId: 'owner-1',
          timestamp: expect.any(Date)
        })
      }),
      'corr-from-event'
    );
  });

  it('executeBusinessOnboardingSaga falls back to generated correlation id and rethrows failures', async () => {
    const event = createEvent();
    startMock.mockRejectedValue(new Error('saga execution failed'));

    await expect(executeBusinessOnboardingSaga(event)).rejects.toThrow('saga execution failed');

    expect(startMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          correlationId: 'uuid-correlation-id'
        })
      }),
      'uuid-correlation-id'
    );
    expect(logger.error).toHaveBeenCalledWith(
      'BusinessOnboardingSaga failed for business biz-1',
      expect.objectContaining({
        correlationId: 'uuid-correlation-id'
      })
    );
  });

  it('onStart logs saga startup', async () => {
    const saga = new BusinessOnboardingSaga();

    await (saga as any).onStart(
      'saga-77',
      {
        metadata: { businessId: 'biz-77' }
      },
      'corr-77'
    );

    expect(logger.info).toHaveBeenCalledWith(
      'Starting BusinessOnboardingSaga for business biz-77',
      expect.objectContaining({ sagaId: 'saga-77', correlationId: 'corr-77' })
    );
  });
});
