const mockLoggerInfo = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('../../../infrastructure', () => ({
  logger: {
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    error: (...args: unknown[]) => mockLoggerError(...args)
  }
}));

jest.mock('../../../infrastructure/repositories/saga.repository', () => ({
  sagaLogRepository: {
    save: jest.fn(),
    saveStep: jest.fn(),
    update: jest.fn(),
    updateStep: jest.fn(),
    getById: jest.fn()
  }
}));

import {
  BusinessVerificationSaga,
  executeBusinessVerificationSaga
} from '../business-verification.saga';
import { BusinessVerifiedEvent } from '../../../domain/events';

describe('BusinessVerificationSaga', () => {
  const createEvent = (metadata: Record<string, unknown> = { correlationId: 'corr-1' }) =>
    new BusinessVerifiedEvent('biz-1', 'verifier-1', 'owner-1', metadata);

  const deps = {
    mailer: {
      sendBusinessVerifiedEmail: jest.fn().mockResolvedValue(undefined)
    },
    capability: {
      enableCapabilities: jest.fn().mockResolvedValue(['cap-1', 'cap-2']),
      disableCapabilities: jest.fn().mockResolvedValue(undefined)
    },
    businessRepository: {
      findById: jest.fn().mockResolvedValue({
        id: 'biz-1',
        name: 'Acme',
        email: 'owner@acme.test'
      })
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('notifies owner and compensates notification state', async () => {
    const saga = new BusinessVerificationSaga(deps as never);
    const steps = (saga as unknown as { defineSteps: () => Array<{ execute: (ctx: any) => Promise<void>; compensate: (ctx: any) => Promise<void> }> })
      .defineSteps();
    const context = {
      event: createEvent(),
      ownerNotified: false,
      capabilitiesEnabled: false,
      capabilityIds: [],
      metadata: {
        correlationId: 'corr-1',
        businessId: 'biz-1',
        timestamp: new Date()
      }
    };

    await steps[0].execute(context);
    expect(deps.mailer.sendBusinessVerifiedEmail).toHaveBeenCalledWith({
      to: 'owner@acme.test',
      businessName: 'Acme',
      businessId: 'biz-1'
    });
    expect(context.ownerNotified).toBe(true);

    await steps[0].compensate(context);
    expect(context.ownerNotified).toBe(false);
  });

  it('skips email send when business has no email', async () => {
    deps.businessRepository.findById.mockResolvedValueOnce({
      id: 'biz-1',
      name: 'Acme',
      email: undefined
    });
    const saga = new BusinessVerificationSaga(deps as never);
    const step = (saga as unknown as { defineSteps: () => Array<{ execute: (ctx: any) => Promise<void> }> }).defineSteps()[0];
    const context = {
      event: createEvent(),
      ownerNotified: false,
      capabilitiesEnabled: false,
      capabilityIds: [],
      metadata: { correlationId: 'corr-1', businessId: 'biz-1', timestamp: new Date() }
    };

    await step.execute(context);

    expect(deps.mailer.sendBusinessVerifiedEmail).not.toHaveBeenCalled();
    expect(context.ownerNotified).toBe(true);
  });

  it('enables capabilities and compensates by disabling them', async () => {
    const saga = new BusinessVerificationSaga(deps as never);
    const step = (saga as unknown as { defineSteps: () => Array<{ execute: (ctx: any) => Promise<void>; compensate: (ctx: any) => Promise<void> }> })
      .defineSteps()[1];
    const context = {
      event: createEvent(),
      ownerNotified: false,
      capabilitiesEnabled: false,
      capabilityIds: [],
      metadata: { correlationId: 'corr-1', businessId: 'biz-1', timestamp: new Date() }
    };

    await step.execute(context);
    expect(deps.capability.enableCapabilities).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: 'biz-1',
        ownerId: 'owner-1',
        capabilities: ['catalog', 'orders', 'payments', 'shipping'],
        correlationId: 'corr-1'
      })
    );
    expect(context.capabilitiesEnabled).toBe(true);
    expect(context.capabilityIds).toEqual(['cap-1', 'cap-2']);

    await step.compensate(context);
    expect(deps.capability.disableCapabilities).toHaveBeenCalledWith({
      businessId: 'biz-1',
      capabilityIds: ['cap-1', 'cap-2'],
      correlationId: 'corr-1'
    });
    expect(context.capabilitiesEnabled).toBe(false);
    expect(context.capabilityIds).toEqual([]);
  });

  it('does not disable capabilities when none were enabled', async () => {
    const saga = new BusinessVerificationSaga(deps as never);
    const step = (saga as unknown as { defineSteps: () => Array<{ compensate: (ctx: any) => Promise<void> }> }).defineSteps()[1];
    const context = {
      event: createEvent(),
      ownerNotified: false,
      capabilitiesEnabled: false,
      capabilityIds: [],
      metadata: { correlationId: 'corr-1', businessId: 'biz-1', timestamp: new Date() }
    };

    await step.compensate(context);
    expect(deps.capability.disableCapabilities).not.toHaveBeenCalled();
  });

  it('starts verification saga with correlation id from event metadata', async () => {
    const startSpy = jest
      .spyOn(BusinessVerificationSaga.prototype, 'start')
      .mockResolvedValue('saga-1');

    const event = createEvent({ correlationId: 'corr-meta' });
    await executeBusinessVerificationSaga(event, deps as never);

    expect(startSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event,
        metadata: expect.objectContaining({
          correlationId: 'corr-meta',
          businessId: 'biz-1'
        })
      }),
      'corr-meta'
    );
  });

  it('logs and rethrows when saga start fails', async () => {
    jest
      .spyOn(BusinessVerificationSaga.prototype, 'start')
      .mockRejectedValue(new Error('start-failed'));

    const event = createEvent({ correlationId: 'corr-error' });

    await expect(executeBusinessVerificationSaga(event, deps as never)).rejects.toThrow('start-failed');
    expect(mockLoggerError).toHaveBeenCalledWith(
      'BusinessVerificationSaga failed for business biz-1',
      expect.objectContaining({
        error: expect.any(Error),
        correlationId: 'corr-error'
      })
    );
  });
});
