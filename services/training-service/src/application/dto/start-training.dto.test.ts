import { StartTrainingRequest, StartTrainingResponse } from './start-training.dto';

describe('start-training.dto', () => {
  it('supports start request/response payloads', () => {
    const request: StartTrainingRequest = {
      learnerId: 'learner-2',
      learnerRole: 'courier',
      moduleId: 'module-1'
    };
    const response: StartTrainingResponse = {
      trainingRecordId: 'record-1',
      status: 'IN_PROGRESS',
      warnings: ['missing optional profile details'],
      recommendations: ['module-2']
    };

    expect(request.learnerRole).toBe('courier');
    expect(response.status).toBe('IN_PROGRESS');
    expect(response.recommendations).toContain('module-2');
  });
});
