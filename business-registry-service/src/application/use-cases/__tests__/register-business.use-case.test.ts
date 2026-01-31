import { RegisterBusinessUseCase } from '../register-business.use-case';
import { BusinessValidationService } from '../../../domain/services/business-validation.service';
import { IBusinessRepository } from '../../../domain/repositories';
import { Business } from '../../../domain/entities/business.entity';
import { BusinessType } from '../../../domain/types/business.types';
import { BusinessAlreadyExistsError, BusinessValidationError } from '../../../domain/errors/business.errors';

describe('RegisterBusinessUseCase', () => {
  let mockRepository: jest.Mocked<IBusinessRepository>;
  let validationService: BusinessValidationService;
  let useCase: RegisterBusinessUseCase;

  const validDto = {
    name: 'Test Business',
    businessType: BusinessType.SOLE_PROPRIETORSHIP,
    registrationNumber: 'TZ-DAR-12345',
    ownerId: 'user-123'
  };

  beforeEach(() => {
    mockRepository = {
      findByRegistrationNumber: jest.fn().mockResolvedValue(null),
      findByTaxId: jest.fn().mockResolvedValue(null),
      findByOwnerId: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(async (b: Business) => b)
    } as unknown as jest.Mocked<IBusinessRepository>;

    validationService = new BusinessValidationService();
    useCase = new RegisterBusinessUseCase(mockRepository, validationService);
  });

  it('should register business successfully', async () => {
    const result = await useCase.execute(validDto);

    expect(result).toBeDefined();
    expect(result.name).toBe(validDto.name);
    expect(result.ownerId).toBe(validDto.ownerId);
    expect(mockRepository.create).toHaveBeenCalled();
  });

  it('should throw when registration number exists', async () => {
    mockRepository.findByRegistrationNumber.mockResolvedValue({} as Business);

    await expect(useCase.execute(validDto)).rejects.toThrow(BusinessAlreadyExistsError);
    expect(mockRepository.create).not.toHaveBeenCalled();
  });

  it('should throw for invalid input', async () => {
    await expect(
      useCase.execute({ ...validDto, name: '' })
    ).rejects.toThrow(BusinessValidationError);
  });
});
