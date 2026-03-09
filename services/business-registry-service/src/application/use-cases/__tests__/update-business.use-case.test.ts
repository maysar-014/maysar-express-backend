import { BusinessAddress } from '../../../domain/value-objects/business-address.value-object';
import { BusinessRegistrationPolicy } from '../../../domain/policies/business-registration.policy';
import { BusinessNotFoundError, UnauthorizedBusinessOperationError } from '../../../domain/errors/business.errors';
import { UpdateBusinessUseCase } from '../update-business.use-case';

describe('UpdateBusinessUseCase', () => {
  const repository = {
    findById: jest.fn(),
    update: jest.fn()
  };

  const sagaEventHandler = {
    handleBusinessUpdatedEvent: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws BusinessNotFoundError when business is missing', async () => {
    repository.findById.mockResolvedValue(null);
    const useCase = new UpdateBusinessUseCase(repository as any, sagaEventHandler as any);

    await expect(useCase.execute('biz-missing', {}, 'owner-1')).rejects.toBeInstanceOf(BusinessNotFoundError);
  });

  it('throws UnauthorizedBusinessOperationError when policy blocks update', async () => {
    repository.findById.mockResolvedValue({ id: 'biz-1', ownerId: 'owner-1' });
    jest.spyOn(BusinessRegistrationPolicy, 'canUpdateDetails').mockReturnValue({
      allowed: false,
      reason: 'Only owner can update'
    });
    const useCase = new UpdateBusinessUseCase(repository as any, sagaEventHandler as any);

    await expect(useCase.execute('biz-1', { name: 'New Name' }, 'intruder')).rejects.toBeInstanceOf(
      UnauthorizedBusinessOperationError
    );
  });

  it('updates business details, maps addresses, persists, and emits update event', async () => {
    const updatedCandidate = { id: 'biz-1', status: 'ACTIVE' };
    const currentBusiness = {
      id: 'biz-1',
      ownerId: 'owner-1',
      updateDetails: jest.fn().mockReturnValue(updatedCandidate)
    };
    repository.findById.mockResolvedValue(currentBusiness);
    repository.update.mockResolvedValue({ id: 'biz-1', name: 'Updated Biz' });
    sagaEventHandler.handleBusinessUpdatedEvent.mockResolvedValue(undefined);

    jest.spyOn(BusinessRegistrationPolicy, 'canUpdateDetails').mockReturnValue({ allowed: true });
    const createdAddress = { marker: 'addr-vo' } as any;
    jest.spyOn(BusinessAddress, 'create').mockReturnValue(createdAddress);

    const useCase = new UpdateBusinessUseCase(repository as any, sagaEventHandler as any);
    const result = await useCase.execute(
      'biz-1',
      {
        name: 'Updated Biz',
        description: 'New description',
        industry: 'Retail',
        website: 'https://biz.test',
        email: 'owner@biz.test',
        phoneNumber: '+255700000001',
        addresses: [
          {
            type: 'MAIN',
            street: 'Samora Ave',
            city: 'Dar',
            region: 'DSM',
            postalCode: 'DAR001',
            country: undefined as any,
            isPrimary: undefined as any
          }
        ]
      },
      'owner-1'
    );

    expect(BusinessAddress.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'MAIN',
        street: 'Samora Ave',
        city: 'Dar',
        region: 'DSM',
        postalCode: 'DAR001',
        country: 'Tanzania',
        isPrimary: false
      })
    );
    expect(currentBusiness.updateDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Updated Biz',
        addresses: [createdAddress]
      })
    );
    expect(repository.update).toHaveBeenCalledWith(updatedCandidate);
    expect(sagaEventHandler.handleBusinessUpdatedEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateId: 'biz-1',
        updatedBy: 'owner-1',
        changes: ['name', 'description', 'industry', 'website', 'email', 'phoneNumber', 'addresses']
      })
    );
    expect(result).toEqual({ id: 'biz-1', name: 'Updated Biz' });
  });

  it('propagates saga event handler failures', async () => {
    const currentBusiness = {
      id: 'biz-9',
      ownerId: 'owner-9',
      updateDetails: jest.fn().mockReturnValue({ id: 'biz-9' })
    };
    repository.findById.mockResolvedValue(currentBusiness);
    repository.update.mockResolvedValue({ id: 'biz-9' });
    sagaEventHandler.handleBusinessUpdatedEvent.mockRejectedValue(new Error('event bus down'));
    jest.spyOn(BusinessRegistrationPolicy, 'canUpdateDetails').mockReturnValue({ allowed: true });

    const useCase = new UpdateBusinessUseCase(repository as any, sagaEventHandler as any);
    await expect(useCase.execute('biz-9', { name: 'x' }, 'owner-9')).rejects.toThrow('event bus down');
  });
});
