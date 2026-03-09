import { CompleteTrainingRequest, CompleteTrainingResponse } from './complete-training.dto';

describe('complete-training.dto', () => {
  it('supports request and response dto contract values', () => {
    const request: CompleteTrainingRequest = {
      trainingRecordId: 'record-1',
      score: 88,
      answers: { q1: 'a', q2: 'b' }
    };
    const response: CompleteTrainingResponse = {
      passed: true,
      score: 88,
      expiresAt: new Date('2027-03-08T00:00:00.000Z')
    };

    expect(request.trainingRecordId).toBe('record-1');
    expect(response.passed).toBe(true);
    expect(response.score).toBe(88);
  });
});
