import { SagaEventHandler } from '../saga-event-handler';
import { BusinessRegisteredEvent, BusinessVerifiedEvent } from '../../../domain/events';
import { BusinessType } from '../../../domain/types/business.types';

describe('SagaEventHandler', () => {
  // Mock dependencies
  const mockMailer = {
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendBusinessVerifiedEmail: jest.fn().mockResolvedValue(undefined)
  };

  const mockCompliance = {
    notifyNewBusiness: jest.fn().mockResolvedValue(undefined),
    createComplianceRecord: jest.fn().mockResolvedValue('compliance-1'),
    revokeComplianceRecord: jest.fn().mockResolvedValue(undefined)
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

  const createSagaEventHandler = () => {
    return new SagaEventHandler({
      mailer: mockMailer as any,
      compliance: mockCompliance as any,
      capability: mockCapability as any,
      businessRepository: mockBusinessRepository as any
    });
  };

  describe('handleBusinessRegisteredEvent', () => {
    it('should execute registration saga with mocked dependencies', async () => {
      const event = new BusinessRegisteredEvent(
        'biz-1',
        'owner-1',
        BusinessType.SOLE_PROPRIETORSHIP,
        'TZ-DAR-12345'
      );

      const handler = createSagaEventHandler();
      
      await expect(handler.handleBusinessRegisteredEvent(event)).resolves.not.toThrow();
      
      expect(mockMailer.sendVerificationEmail).toHaveBeenCalled();
      expect(mockCompliance.notifyNewBusiness).toHaveBeenCalled();
      expect(mockCompliance.createComplianceRecord).toHaveBeenCalled();
    });

    it('should handle errors during registration saga execution', async () => {
      const event = new BusinessRegisteredEvent(
        'biz-1',
        'owner-1',
        BusinessType.SOLE_PROPRIETORSHIP,
        'TZ-DAR-12345'
      );

      const error = new Error('Failed to send email');
      mockMailer.sendVerificationEmail.mockRejectedValueOnce(error);

      const handler = createSagaEventHandler();
      
      // The saga should handle errors internally and not propagate them to the event handler
      await expect(handler.handleBusinessRegisteredEvent(event)).resolves.not.toThrow();
    });
  });

  describe('handleBusinessVerifiedEvent', () => {
    it('should execute verification saga with mocked dependencies', async () => {
      const event = new BusinessVerifiedEvent('biz-1', 'verifier-1', 'owner-1');

      const handler = createSagaEventHandler();
      
      await expect(handler.handleBusinessVerifiedEvent(event)).resolves.not.toThrow();
      
      expect(mockMailer.sendBusinessVerifiedEmail).toHaveBeenCalled();
      expect(mockCapability.enableCapabilities).toHaveBeenCalled();
    });

    it('should handle errors during verification saga execution', async () => {
      const event = new BusinessVerifiedEvent('biz-1', 'verifier-1', 'owner-1');

      const error = new Error('Failed to enable capabilities');
      mockCapability.enableCapabilities.mockRejectedValueOnce(error);

      const handler = createSagaEventHandler();
      
      // The saga should handle errors internally and not propagate them to the event handler
      await expect(handler.handleBusinessVerifiedEvent(event)).resolves.not.toThrow();
    });
  });

  describe('dependencies injection', () => {
    it('should throw error if dependencies are not provided', () => {
      // @ts-ignore - Testing missing dependencies
      expect(() => new SagaEventHandler()).toThrow();
    });

    it('should accept all required dependencies', () => {
      expect(() => createSagaEventHandler()).not.toThrow();
    });
  });
});