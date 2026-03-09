import type { TrainingRecordDTO } from './training-progress.dto';
import { GetTrainingProgressRequest, TrainingProgressResponse } from './training-progress.dto';

describe('training-progress.dto', () => {
  it('supports progress response payload grouping', () => {
    const request: GetTrainingProgressRequest = { learnerId: 'learner-5' };
    const completedRecord: TrainingRecordDTO = {
      id: 'record-3',
      moduleId: 'module-3',
      status: 'COMPLETED',
      completedAt: new Date('2026-03-08T04:00:00.000Z'),
      score: 95,
      attempts: 1
    };
    const response: TrainingProgressResponse = {
      completed: [completedRecord],
      inProgress: [],
      required: ['module-4'],
      eligible: true
    };

    expect(request.learnerId).toBe('learner-5');
    expect(response.completed[0].status).toBe('COMPLETED');
    expect(response.eligible).toBe(true);
  });
});
