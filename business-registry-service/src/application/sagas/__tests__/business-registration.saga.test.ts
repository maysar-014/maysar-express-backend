import { BusinessRegistrationSaga, executeBusinessRegistrationSaga } from '../business-registration.saga';
import { BusinessRegisteredEvent } from '../../../domain/events';
import { BusinessType } from '../../../domain/types/business.types';

describe('BusinessRegistrationSaga', () => {
  const createEvent = () =>
    new BusinessRegisteredEvent('biz-1', 'owner-1', BusinessType.SOLE_PROPRIETORSHIP, 'TZ-DAR-12345');

  const mockDeps = {
    mailer: {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined)
    },
    compliance: {
      notifyNewBusiness: jest.fn().mockResolvedValue(undefined),
      createComplianceRecord: jest.fn().mockResolvedValue('compliance-1'),
      revokeComplianceRecord: jest.fn().mockResolvedValue(undefined)
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

  it('should execute all steps successfully', async () => {
    const event = createEvent();
    const saga = new BusinessRegistrationSaga(event, mockDeps as any);

    await expect(saga.execute()).resolves.not.toThrow();
  });

  it('should complete saga execution', async () => {
    const event = createEvent();
    await expect(executeBusinessRegistrationSaga(event, mockDeps as any)).resolves.not.toThrow();
  });
});
