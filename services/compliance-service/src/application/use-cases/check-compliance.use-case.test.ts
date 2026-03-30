import { CheckComplianceUseCase } from './check-compliance.use-case';

describe('CheckComplianceUseCase', () => {
  it('returns a compliant result for any input', async () => {
    const useCase = new CheckComplianceUseCase();

    await expect(
      useCase.execute({
        userId: 'u1',
        data: { verified: false }
      })
    ).resolves.toEqual({ compliant: true });
  });
});
