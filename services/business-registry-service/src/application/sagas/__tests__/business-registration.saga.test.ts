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
    save: jest.fn().mockResolvedValue(undefined),
    saveStep: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    updateStep: jest.fn().mockResolvedValue(undefined),
    getById: jest.fn().mockResolvedValue(undefined),
    getSteps: jest.fn().mockResolvedValue([])
  }
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'uuid-correlation-id')
}));

import {
  BusinessRegisteredEvent
} from '../../../domain/events';
import { BusinessType } from '../../../domain/types/business.types';
import {
  BusinessRegistrationSaga,
  executeBusinessRegistrationSaga,
  type BusinessRegistrationContext
} from '../business-registration.saga';

describe('BusinessRegistrationSaga', () => {
  const createEvent = (metadata: Record<string, unknown> = { correlationId: 'corr-1' }) =>
    new BusinessRegisteredEvent('biz-1', 'owner-1', BusinessType.SOLE_PROPRIETORSHIP, 'TZ-DAR-12345', metadata);

  const deps = {
    mailer: {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined)
    },
    compliance: {
      notifyNewBusiness: jest.fn().mockResolvedValue(undefined),
      createKYCRecord: jest.fn().mockResolvedValue('kyc-1'),
      revokeKYCRecord: jest.fn().mockResolvedValue(undefined)
    },
    businessRepository: {
      findById: jest.fn().mockResolvedValue({
        id: 'biz-1',
        name: 'Test Business',
        email: 'test@example.com',
        ownerId: 'owner-1',
        businessType: BusinessType.SOLE_PROPRIETORSHIP
      })
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const getSteps = () => {
    const saga = new BusinessRegistrationSaga(deps as never);
    return (saga as unknown as {
      defineSteps: () => Array<{
        name: string;
        execute: (context: BusinessRegistrationContext) => Promise<void>;
        compensate: (context: BusinessRegistrationContext, sagaId?: string) => Promise<void>;
      }>;
    }).defineSteps();
  };

  it('defines three registration steps with compensation handlers', async () => {
    const steps = getSteps();
    const context: BusinessRegistrationContext = {
      event: createEvent(),
      emailSent: false,
      complianceNotified: false,
      complianceRecordCreated: false,
      metadata: {
        correlationId: 'corr-1',
        businessId: 'biz-1',
        timestamp: new Date()
      }
    };

    expect(steps).toHaveLength(3);
    expect(steps.map((step) => step.name)).toEqual([
      'SendVerificationEmail',
      'NotifyComplianceService',
      'CreateComplianceRecord'
    ]);

    await steps[0].execute(context);
    expect(deps.mailer.sendVerificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
        businessName: 'Test Business',
        businessId: 'biz-1',
        verificationLink: 'http://localhost:3000/business/biz-1/verify'
      })
    );
    expect(context.emailSent).toBe(true);

    await steps[0].compensate(context);
    expect(context.emailSent).toBe(false);

    await steps[1].execute(context);
    expect(deps.compliance.notifyNewBusiness).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: 'biz-1',
        ownerId: 'owner-1',
        businessType: BusinessType.SOLE_PROPRIETORSHIP,
        registrationNumber: 'TZ-DAR-12345',
        correlationId: 'corr-1'
      })
    );
    expect(context.complianceNotified).toBe(true);

    await steps[1].compensate(context);
    expect(context.complianceNotified).toBe(false);

    await steps[2].execute(context);
    expect(deps.compliance.createKYCRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: 'biz-1',
        status: 'UNDER_REVIEW',
        correlationId: 'corr-1'
      })
    );
    expect(context.complianceRecordCreated).toBe(true);
    expect(context.complianceRecordId).toBe('kyc-1');

    await steps[2].compensate(context);
    expect(deps.compliance.revokeKYCRecord).toHaveBeenCalledWith('kyc-1', 'corr-1');
    expect(context.complianceRecordCreated).toBe(false);
    expect(context.complianceRecordId).toBe('kyc-1');
  });

  it('executeBusinessRegistrationSaga uses event correlation id when provided', async () => {
    const startSpy = jest.spyOn(BusinessRegistrationSaga.prototype, 'start').mockResolvedValue('saga-1');

    const event = createEvent({ correlationId: 'corr-from-event' });
    await executeBusinessRegistrationSaga(event, deps as never);

    expect(startSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event,
        emailSent: false,
        complianceNotified: false,
        complianceRecordCreated: false,
        metadata: expect.objectContaining({
          correlationId: 'corr-from-event',
          businessId: 'biz-1'
        })
      }),
      'corr-from-event'
    );
  });

  it('executeBusinessRegistrationSaga falls back to generated correlation id and rethrows failures', async () => {
    const startSpy = jest.spyOn(BusinessRegistrationSaga.prototype, 'start').mockRejectedValue(new Error('saga execution failed'));

    const event = createEvent({});
    await expect(executeBusinessRegistrationSaga(event, deps as never)).rejects.toThrow('saga execution failed');

    expect(startSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          correlationId: 'uuid-correlation-id'
        })
      }),
      'uuid-correlation-id'
    );
    expect(mockLoggerError).toHaveBeenCalledWith(
      'BusinessRegistrationSaga failed for business biz-1',
      expect.objectContaining({
        error: expect.any(Error),
        correlationId: 'uuid-correlation-id'
      })
    );
  });
});
