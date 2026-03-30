const mockExecuteBusinessRegistrationSaga = jest.fn();
const mockExecuteBusinessVerificationSaga = jest.fn();

jest.mock('../business-registration.saga', () => ({
  executeBusinessRegistrationSaga: mockExecuteBusinessRegistrationSaga
}));

jest.mock('../business-verification.saga', () => ({
  executeBusinessVerificationSaga: mockExecuteBusinessVerificationSaga
}));

import { SagaEventHandler } from '../saga-event-handler';
import { BusinessRegisteredEvent, BusinessVerifiedEvent } from '../../../domain/events';
import { BusinessType } from '../../../domain/types/business.types';

describe('SagaEventHandler', () => {
  const mockMailer = {
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendBusinessVerifiedEmail: jest.fn().mockResolvedValue(undefined)
  };

  const mockCompliance = {
    notifyNewBusiness: jest.fn().mockResolvedValue(undefined),
    createKYCRecord: jest.fn().mockResolvedValue('kyc-1'),
    revokeKYCRecord: jest.fn().mockResolvedValue(undefined)
  };

  const mockCapability = {
    enableCapabilities: jest.fn().mockResolvedValue(['cap-1', 'cap-2']),
    disableCapabilities: jest.fn().mockResolvedValue(undefined)
  };

  const mockBusinessRepository = {
    findById: jest.fn().mockResolvedValue({
      id: 'biz-1',
      name: 'Test Business',
      email: 'test@example.com',
      ownerId: 'owner-1',
      businessType: BusinessType.SOLE_PROPRIETORSHIP
    }),
    findByOwnerId: jest.fn().mockResolvedValue([]),
    findByRegistrationNumber: jest.fn().mockResolvedValue(null),
    findByTaxId: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  };

  const createSagaEventHandler = () =>
    new SagaEventHandler({
      mailer: mockMailer as never,
      compliance: mockCompliance as never,
      capability: mockCapability as never,
      businessRepository: mockBusinessRepository as never
    });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleBusinessRegisteredEvent', () => {
    it('delegates registration saga execution with the current dependencies', async () => {
      const event = new BusinessRegisteredEvent(
        'biz-1',
        'owner-1',
        BusinessType.SOLE_PROPRIETORSHIP,
        'TZ-DAR-12345'
      );

      const handler = createSagaEventHandler();
      await expect(handler.handleBusinessRegisteredEvent(event)).resolves.toBeUndefined();

      expect(mockExecuteBusinessRegistrationSaga).toHaveBeenCalledWith(
        event,
        expect.objectContaining({
          mailer: mockMailer,
          compliance: mockCompliance,
          businessRepository: mockBusinessRepository
        })
      );
    });

    it('propagates registration saga failures', async () => {
      const event = new BusinessRegisteredEvent(
        'biz-1',
        'owner-1',
        BusinessType.SOLE_PROPRIETORSHIP,
        'TZ-DAR-12345'
      );

      mockExecuteBusinessRegistrationSaga.mockRejectedValueOnce(new Error('registration failed'));

      const handler = createSagaEventHandler();
      await expect(handler.handleBusinessRegisteredEvent(event)).rejects.toThrow('registration failed');
    });
  });

  describe('handleBusinessVerifiedEvent', () => {
    it('delegates verification saga execution with the current dependencies', async () => {
      const event = new BusinessVerifiedEvent('biz-1', 'verifier-1', 'owner-1');

      const handler = createSagaEventHandler();
      await expect(handler.handleBusinessVerifiedEvent(event)).resolves.toBeUndefined();

      expect(mockExecuteBusinessVerificationSaga).toHaveBeenCalledWith(
        event,
        expect.objectContaining({
          mailer: mockMailer,
          capability: mockCapability,
          businessRepository: mockBusinessRepository
        })
      );
    });

    it('propagates verification saga failures', async () => {
      const event = new BusinessVerifiedEvent('biz-1', 'verifier-1', 'owner-1');

      mockExecuteBusinessVerificationSaga.mockRejectedValueOnce(new Error('verification failed'));

      const handler = createSagaEventHandler();
      await expect(handler.handleBusinessVerifiedEvent(event)).rejects.toThrow('verification failed');
    });
  });

  describe('dependencies injection', () => {
    it('throws error if dependencies are not provided', () => {
      // @ts-expect-error - Testing missing dependencies
      expect(() => new SagaEventHandler()).toThrow();
    });

    it('accepts all required dependencies', () => {
      expect(() => createSagaEventHandler()).not.toThrow();
    });
  });
});
