import { CheckEligibilityRequest, EligibilityResponse } from './eligibility.dto';

describe('eligibility.dto', () => {
  it('supports eligibility request and response payloads', () => {
    const request: CheckEligibilityRequest = {
      learnerId: 'learner-2'
    };
    const response: EligibilityResponse = {
      eligible: false,
      completionPercentage: 60,
      missingRequirements: ['module-advanced-safety'],
      completedModules: ['module-basic-safety'],
      inProgressModules: ['module-road-rules']
    };

    expect(request.learnerId).toBe('learner-2');
    expect(response.eligible).toBe(false);
    expect(response.missingRequirements).toContain('module-advanced-safety');
  });
});
