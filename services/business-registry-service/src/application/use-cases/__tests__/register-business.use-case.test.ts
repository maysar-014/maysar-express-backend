import { Business, BusinessStatus } from '../../../domain/entities/business.entity';
import { BusinessValidationService } from '../../../domain/services/business-validation.service';
import { BusinessType } from '../../../domain/types/business.types';
import { RegisterBusinessUseCase } from '../register-business.use-case';

describe('RegisterBusinessUseCase', () => {
  const mockRepository = {
    findByRegistrationNumber: jest.fn(),
    findByTaxId: jest.fn(),
    findByOwnerId: jest.fn(),
    create: jest.fn()
  };

  const mockValidationService = {
    validateBusiness: jest.fn()
  };

  const mockSagaEventHandler = {
    handleBusinessRegisteredEvent: jest.fn().mockResolvedValue(undefined)
  };

  const createUseCase = () =>
    new RegisterBusinessUseCase(
      mockRepository as never,
      mockValidationService as unknown as BusinessValidationService,
      mockSagaEventHandler as never
    );

  const validDto = {
    name: 'Test Business',
    businessType: BusinessType.SOLE_PROPRIETORSHIP,
    registrationNumber: 'TZ-DAR-1234',
    ownerId: 'user-1',
    industry: ['retail', 'wholesale']
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers business successfully', async () => {
    mockRepository.findByRegistrationNumber.mockResolvedValue(null);
    mockRepository.findByTaxId.mockResolvedValue(null);
    mockRepository.findByOwnerId.mockResolvedValue([]);
    mockRepository.create.mockImplementation(async (business: Business) => business);

    const useCase = createUseCase();
    const result = await useCase.execute(validDto);

    expect(result.status).toBe(BusinessStatus.PENDING);
    expect(mockValidationService.validateBusiness).toHaveBeenCalledWith(expect.any(Business));
    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Business',
        ownerId: 'user-1',
        businessType: BusinessType.SOLE_PROPRIETORSHIP,
        industry: ['retail', 'wholesale']
      })
    );
    expect(mockSagaEventHandler.handleBusinessRegisteredEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateId: result.id,
        ownerId: 'user-1',
        businessType: BusinessType.SOLE_PROPRIETORSHIP,
        registrationNumber: 'TZ-DAR-1234',
        metadata: expect.objectContaining({
          industries: ['retail', 'wholesale']
        })
      })
    );
  });

  it('throws if registration number already exists', async () => {
    mockRepository.findByRegistrationNumber.mockResolvedValue({ id: 'existing' });

    const useCase = createUseCase();
    await expect(useCase.execute(validDto)).rejects.toThrow(
      'Business with this registration number already exists'
    );
  });

  it('validates required fields', async () => {
    const useCase = createUseCase();
    await expect(
      useCase.execute({
        ...validDto,
        name: ''
      })
    ).rejects.toThrow('Business name must be at least 2 characters');
  });

  it('validates registration number format', async () => {
    const useCase = createUseCase();
    await expect(
      useCase.execute({
        ...validDto,
        registrationNumber: 'REG123'
      })
    ).rejects.toThrow('Invalid registration number format');
  });

  it('propagates repository create failures', async () => {
    mockRepository.findByRegistrationNumber.mockResolvedValue(null);
    mockRepository.findByTaxId.mockResolvedValue(null);
    mockRepository.findByOwnerId.mockResolvedValue([]);
    mockRepository.create.mockRejectedValue(new Error('Save failed'));

    const useCase = createUseCase();
    await expect(useCase.execute(validDto)).rejects.toThrow('Save failed');
  });

  it('sets the initial status to pending', async () => {
    mockRepository.findByRegistrationNumber.mockResolvedValue(null);
    mockRepository.findByTaxId.mockResolvedValue(null);
    mockRepository.findByOwnerId.mockResolvedValue([]);
    mockRepository.create.mockImplementation(async (business: Business) => business);

    const useCase = createUseCase();
    const result = await useCase.execute(validDto);

    expect(result.status).toBe(BusinessStatus.PENDING);
  });
});
