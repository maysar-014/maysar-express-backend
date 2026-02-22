import { CheckEligibilityUseCase } from '../check-eligibility.use-case';
import { ITrainingRecordRepository } from '../../../domain/repositories/training-record.repository';
import { ICertificationRequirementRepository } from '../../../domain/repositories/certification-requirement.repository';
import { EligibilityEngine } from '../../../domain/engines/eligibility.engine';
import { TrainingRecord } from '../../../domain/entities/training-record.entity';
import { CertificationRequirement } from '../../../domain/entities/certification-requirement.entity';

describe('CheckEligibilityUseCase', () => {
  let useCase: CheckEligibilityUseCase;
  let mockTrainingRecordRepo: jest.Mocked<ITrainingRecordRepository>;
  let mockRequirementRepo: jest.Mocked<ICertificationRequirementRepository>;
  let mockEligibilityEngine: jest.Mocked<EligibilityEngine>;

  beforeEach(() => {
    mockTrainingRecordRepo = {
      findByLearnerId: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<ITrainingRecordRepository>;

    mockRequirementRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<ICertificationRequirementRepository>;

    mockEligibilityEngine = {
      checkEligibility: jest.fn(),
      getMissingRequirements: jest.fn(),
      getRecommendedModules: jest.fn(),
      getCompletionPercentage: jest.fn(),
    } as unknown as jest.Mocked<EligibilityEngine>;

    useCase = new CheckEligibilityUseCase(
      mockTrainingRecordRepo,
      mockRequirementRepo,
      mockEligibilityEngine
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should check eligibility successfully', async () => {
      const mockRecords: TrainingRecord[] = [];
      const mockRequirements: CertificationRequirement[] = [];

      mockTrainingRecordRepo.findByLearnerId.mockResolvedValue(mockRecords);
      mockRequirementRepo.findAll.mockResolvedValue(mockRequirements);
      mockEligibilityEngine.checkEligibility.mockReturnValue({
        eligible: true,
        completionPercentage: 100,
        missingRequirements: [],
        completedModules: ['mod-1', 'mod-2'],
        inProgressModules: [],
      });

      const result = await useCase.execute({ learnerId: 'learner-1' });

      expect(result.eligible).toBe(true);
      expect(result.completionPercentage).toBe(100);
      expect(result.missingRequirements).toHaveLength(0);
      expect(result.completedModules).toHaveLength(2);
    });

    it('should fetch training records for learner', async () => {
      mockTrainingRecordRepo.findByLearnerId.mockResolvedValue([]);
      mockRequirementRepo.findAll.mockResolvedValue([]);
      mockEligibilityEngine.checkEligibility.mockReturnValue({
        eligible: false,
        completionPercentage: 0,
        missingRequirements: [],
        completedModules: [],
        inProgressModules: [],
      });

      await useCase.execute({ learnerId: 'learner-123' });

      expect(mockTrainingRecordRepo.findByLearnerId).toHaveBeenCalledWith('learner-123');
    });

    it('should fetch all certification requirements', async () => {
      mockTrainingRecordRepo.findByLearnerId.mockResolvedValue([]);
      mockRequirementRepo.findAll.mockResolvedValue([]);
      mockEligibilityEngine.checkEligibility.mockReturnValue({
        eligible: false,
        completionPercentage: 0,
        missingRequirements: [],
        completedModules: [],
        inProgressModules: [],
      });

      await useCase.execute({ learnerId: 'learner-1' });

      expect(mockRequirementRepo.findAll).toHaveBeenCalled();
    });

    it('should call eligibility engine with correct parameters', async () => {
      const mockRecords: TrainingRecord[] = [{ id: 'rec-1' } as any];
      const mockRequirements: CertificationRequirement[] = [{ id: 'req-1' } as any];

      mockTrainingRecordRepo.findByLearnerId.mockResolvedValue(mockRecords);
      mockRequirementRepo.findAll.mockResolvedValue(mockRequirements);
      mockEligibilityEngine.checkEligibility.mockReturnValue({
        eligible: false,
        completionPercentage: 50,
        missingRequirements: ['mod-3'],
        completedModules: ['mod-1'],
        inProgressModules: ['mod-2'],
      });

      await useCase.execute({ learnerId: 'learner-1' });

      expect(mockEligibilityEngine.checkEligibility).toHaveBeenCalledWith(
        mockRecords,
        mockRequirements
      );
    });

    it('should return ineligible status when requirements not met', async () => {
      mockTrainingRecordRepo.findByLearnerId.mockResolvedValue([]);
      mockRequirementRepo.findAll.mockResolvedValue([{ id: 'req-1' } as any]);
      mockEligibilityEngine.checkEligibility.mockReturnValue({
        eligible: false,
        completionPercentage: 0,
        missingRequirements: ['mod-1', 'mod-2'],
        completedModules: [],
        inProgressModules: [],
      });

      const result = await useCase.execute({ learnerId: 'learner-1' });

      expect(result.eligible).toBe(false);
      expect(result.missingRequirements).toHaveLength(2);
    });

    it('should return partial completion status', async () => {
      mockTrainingRecordRepo.findByLearnerId.mockResolvedValue([]);
      mockRequirementRepo.findAll.mockResolvedValue([]);
      mockEligibilityEngine.checkEligibility.mockReturnValue({
        eligible: false,
        completionPercentage: 66,
        missingRequirements: ['mod-3'],
        completedModules: ['mod-1', 'mod-2'],
        inProgressModules: ['mod-3'],
      });

      const result = await useCase.execute({ learnerId: 'learner-1' });

      expect(result.completionPercentage).toBe(66);
      expect(result.completedModules).toHaveLength(2);
      expect(result.inProgressModules).toHaveLength(1);
    });

    it('should handle empty training records', async () => {
      mockTrainingRecordRepo.findByLearnerId.mockResolvedValue([]);
      mockRequirementRepo.findAll.mockResolvedValue([{ id: 'req-1' } as any]);
      mockEligibilityEngine.checkEligibility.mockReturnValue({
        eligible: false,
        completionPercentage: 0,
        missingRequirements: ['mod-1'],
        completedModules: [],
        inProgressModules: [],
      });

      const result = await useCase.execute({ learnerId: 'learner-1' });

      expect(result.eligible).toBe(false);
      expect(result.completedModules).toHaveLength(0);
    });

    it('should handle empty requirements', async () => {
      mockTrainingRecordRepo.findByLearnerId.mockResolvedValue([{ id: 'rec-1' } as any]);
      mockRequirementRepo.findAll.mockResolvedValue([]);
      mockEligibilityEngine.checkEligibility.mockReturnValue({
        eligible: true,
        completionPercentage: 100,
        missingRequirements: [],
        completedModules: [],
        inProgressModules: [],
      });

      const result = await useCase.execute({ learnerId: 'learner-1' });

      expect(result.eligible).toBe(true);
      expect(result.completionPercentage).toBe(100);
    });

    it('should handle repository errors', async () => {
      mockTrainingRecordRepo.findByLearnerId.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(useCase.execute({ learnerId: 'learner-1' })).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle requirement repository errors', async () => {
      mockTrainingRecordRepo.findByLearnerId.mockResolvedValue([]);
      mockRequirementRepo.findAll.mockRejectedValue(new Error('Requirements fetch failed'));

      await expect(useCase.execute({ learnerId: 'learner-1' })).rejects.toThrow(
        'Requirements fetch failed'
      );
    });
  });
});
