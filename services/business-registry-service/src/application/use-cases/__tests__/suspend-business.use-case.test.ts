import { BusinessRegistrationPolicy } from '../../../domain/policies/business-registration.policy';
import { BusinessNotFoundError, BusinessValidationError } from '../../../domain/errors/business.errors';
import { SuspendBusinessUseCase } from '../suspend-business.use-case';

describe('SuspendBusinessUseCase', () => {
  const repository = {
    findById: jest.fn(),
    update: jest.fn()
  };

  const sagaEventHandler = {
    handleBusinessSuspendedEvent: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws BusinessNotFoundError when business is absent', async () => {
    repository.findById.mockResolvedValue(null);
    const useCase = new SuspendBusinessUseCase(repository as any, sagaEventHandler as any);

    await expect(
      useCase.execute({ businessId: 'biz-missing', suspendedBy: 'admin-1', reason: 'fraud' })
    ).rejects.toBeInstanceOf(BusinessNotFoundError);
  });

  it('throws BusinessValidationError when policy blocks suspension', async () => {
    repository.findById.mockResolvedValue({ id: 'biz-1', status: 'CLOSED' });
    jest.spyOn(BusinessRegistrationPolicy, 'canSuspend').mockReturnValue({
      allowed: false,
      reason: 'Cannot suspend closed business'
    });
    const useCase = new SuspendBusinessUseCase(repository as any, sagaEventHandler as any);

    await expect(
      useCase.execute({ businessId: 'biz-1', suspendedBy: 'admin-1', reason: 'policy' })
    ).rejects.toBeInstanceOf(BusinessValidationError);
  });

  it('suspends business, updates repository, and dispatches suspension event', async () => {
    const suspended = { id: 'biz-2', status: 'SUSPENDED' };
    const business = {
      id: 'biz-2',
      suspend: jest.fn().mockReturnValue(suspended)
    };
    repository.findById.mockResolvedValue(business);
    repository.update.mockResolvedValue(suspended);
    sagaEventHandler.handleBusinessSuspendedEvent.mockResolvedValue(undefined);
    jest.spyOn(BusinessRegistrationPolicy, 'canSuspend').mockReturnValue({ allowed: true });

    const useCase = new SuspendBusinessUseCase(repository as any, sagaEventHandler as any);
    const result = await useCase.execute({
      businessId: 'biz-2',
      suspendedBy: 'admin-2',
      reason: 'fraud detection'
    });

    expect(business.suspend).toHaveBeenCalledTimes(1);
    expect(repository.update).toHaveBeenCalledWith(suspended);
    expect(sagaEventHandler.handleBusinessSuspendedEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateId: 'biz-2',
        suspendedBy: 'admin-2',
        reason: 'fraud detection'
      })
    );
    expect(result).toEqual(suspended);
  });
});
