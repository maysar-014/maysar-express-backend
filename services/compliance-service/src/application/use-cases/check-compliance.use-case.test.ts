import { CheckComplianceUseCase } from '../check-compliance.use-case';

const mockRepository = {
  findRules: jest.fn(),
  createAudit: jest.fn()
} as any;

describe('CheckComplianceUseCase', () => {
  let useCase: CheckComplianceUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CheckComplianceUseCase(mockRepository);
  });

  it('should pass all rules', async () => {
    mockRepository.findRules.mockResolvedValue([
      { id: 'r1', type: 'kyc', validate: () => ({ passed: true }) }
    ]);

    const result = await useCase.execute({
      userId: 'u1',
      data: { verified: true }
    });

    expect(result.compliant).toBe(true);
    expect(mockRepository.createAudit).toHaveBeenCalled();
  });

  it('should fail on rule violation', async () => {
    mockRepository.findRules.mockResolvedValue([
      { id: 'r1', type: 'kyc', validate: () => ({ passed: false, reason: 'Not verified' }) }
    ]);

    const result = await useCase.execute({
      userId: 'u1',
      data: { verified: false }
    });

    expect(result.compliant).toBe(false);
    expect(result.violations).toHaveLength(1);
  });
});
