import type {
  TrackModuleProgressRequest,
  TrackModuleProgressResponse
} from './track-module-progress.dto';

describe('track-module-progress.dto', () => {
  it('supports progress update request and response', () => {
    const request: TrackModuleProgressRequest = {
      trainingRecordId: 'record-2',
      progressData: {
        lastModuleSection: 'chapter-4',
        completionPercentage: 80,
        metadata: { timeSpentMinutes: 32 }
      }
    };
    const response: TrackModuleProgressResponse = {
      trainingRecordId: 'record-2',
      status: 'IN_PROGRESS',
      updatedAt: new Date('2026-03-08T01:00:00.000Z')
    };

    expect(request.progressData.completionPercentage).toBe(80);
    expect(response.status).toBe('IN_PROGRESS');
  });
});
