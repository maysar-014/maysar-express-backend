import { BusinessRegistrationPolicy } from '../../../domain/policies/business-registration.policy';
import {
  BusinessNotFoundError,
  BusinessValidationError,
  UnauthorizedBusinessOperationError
} from '../../../domain/errors/business.errors';
import { ReactivateBusinessUseCase } from '../reactivate-business.use-case';

describe('ReactivateBusinessUseCase', () => {
  const repository = {
    findById: jest.fn(),
    update: jest.fn()
  };

  const sagaEventHandler = {
    handleBusinessReactivatedEvent: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws BusinessNotFoundError when business does not exist', async () => {
    repository.findById.mockResolvedValue(null);
    const useCase = new ReactivateBusinessUseCase(repository as any, sagaEventHandler as any);

    await expect(useCase.execute('biz-missing', 'admin-1')).rejects.toBeInstanceOf(BusinessNotFoundError);
  });

  it('throws BusinessValidationError when policy does not allow reactivation', async () => {
    repository.findById.mockResolvedValue({ id: 'biz-1', status: 'ACTIVE' });
    jest.spyOn(BusinessRegistrationPolicy, 'canReactivate').mockReturnValue({
      allowed: false,
      reason: 'Only suspended businesses can be reactivated'
    });
    const useCase = new ReactivateBusinessUseCase(repository as any, sagaEventHandler as any);

    await expect(useCase.execute('biz-1', 'admin-1')).rejects.toBeInstanceOf(BusinessValidationError);
  });

  it('throws UnauthorizedBusinessOperationError for blank reactivator id', async () => {
    repository.findById.mockResolvedValue({ id: 'biz-2' });
    jest.spyOn(BusinessRegistrationPolicy, 'canReactivate').mockReturnValue({ allowed: true });
    const useCase = new ReactivateBusinessUseCase(repository as any, sagaEventHandler as any);

    await expect(useCase.execute('biz-2', '   ')).rejects.toBeInstanceOf(UnauthorizedBusinessOperationError);
  });

  it('reactivates business, persists result, and emits event', async () => {
    const reactivated = { id: 'biz-3', status: 'ACTIVE' };
    const business = {
      id: 'biz-3',
      reactivate: jest.fn().mockReturnValue(reactivated)
    };
    repository.findById.mockResolvedValue(business);
    repository.update.mockResolvedValue(reactivated);
    sagaEventHandler.handleBusinessReactivatedEvent.mockResolvedValue(undefined);
    jest.spyOn(BusinessRegistrationPolicy, 'canReactivate').mockReturnValue({ allowed: true });

    const useCase = new ReactivateBusinessUseCase(repository as any, sagaEventHandler as any);
    const result = await useCase.execute('biz-3', 'admin-3');

    expect(business.reactivate).toHaveBeenCalledTimes(1);
    expect(repository.update).toHaveBeenCalledWith(reactivated);
    expect(sagaEventHandler.handleBusinessReactivatedEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateId: 'biz-3',
        reactivatedBy: 'admin-3'
      })
    );
    expect(result).toEqual(reactivated);
  });
});
