import { Business, BusinessStatus, VerificationStatus } from '../../../domain/entities/business.entity';
import { RegistrationNumber } from '../../../domain/value-objects/registration-number.value-object';
import { BusinessType } from '../../../domain/types/business.types';
import { VerifyBusinessUseCase } from '../verify-business.use-case';

describe('VerifyBusinessUseCase', () => {
  const mockRepository = {
    findById: jest.fn(),
    update: jest.fn()
  };

  const mockSagaEventHandler = {
    handleBusinessVerifiedEvent: jest.fn().mockResolvedValue(undefined)
  };

  const createUseCase = () =>
    new VerifyBusinessUseCase(mockRepository as never, mockSagaEventHandler as never);

  const createBusiness = () =>
    Business.register({
      id: 'business-1',
      name: 'Test Business',
      businessType: BusinessType.SOLE_PROPRIETORSHIP,
      registrationNumber: RegistrationNumber.create('TZ-DAR-1234'),
      ownerId: 'owner-1',
      industry: ['retail']
    });

  const validDto = {
    businessId: 'business-1',
    verifiedBy: 'admin-1',
    documentTypes: ['REGISTRATION_CERTIFICATE', 'PROOF_OF_ADDRESS', 'OWNER_ID']
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('verifies business successfully', async () => {
    const business = createBusiness();
    mockRepository.findById.mockResolvedValue(business);
    mockRepository.update.mockImplementation(async (updatedBusiness: Business) => updatedBusiness);

    const useCase = createUseCase();
    const result = await useCase.execute(validDto);

    expect(result.verificationStatus).toBe(VerificationStatus.VERIFIED);
    expect(result.status).toBe(BusinessStatus.ACTIVE);
    expect(result.verifiedBy).toBe('admin-1');
    expect(mockRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        verificationStatus: VerificationStatus.VERIFIED,
        verifiedBy: 'admin-1'
      })
    );
    expect(mockSagaEventHandler.handleBusinessVerifiedEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateId: 'business-1',
        verifiedBy: 'admin-1',
        ownerId: 'owner-1'
      })
    );
  });

  it('fails if business is already verified', async () => {
    const business = createBusiness().verify('existing-verifier');
    mockRepository.findById.mockResolvedValue(business);

    const useCase = createUseCase();
    await expect(useCase.execute(validDto)).rejects.toThrow('Already verified');
  });

  it('fails if required documents are missing', async () => {
    mockRepository.findById.mockResolvedValue(createBusiness());

    const useCase = createUseCase();
    await expect(
      useCase.execute({
        ...validDto,
        documentTypes: ['REGISTRATION_CERTIFICATE']
      })
    ).rejects.toThrow('Missing required documents');
  });

  it('fails if verifier id is missing', async () => {
    mockRepository.findById.mockResolvedValue(createBusiness());

    const useCase = createUseCase();
    await expect(
      useCase.execute({
        ...validDto,
        verifiedBy: ''
      })
    ).rejects.toThrow('Verifier ID is required');
  });

  it('fails when business is not found', async () => {
    mockRepository.findById.mockResolvedValue(null);

    const useCase = createUseCase();
    await expect(useCase.execute(validDto)).rejects.toThrow('Business not found');
  });
});
