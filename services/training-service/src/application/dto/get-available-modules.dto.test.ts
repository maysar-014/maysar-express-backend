import type {
  GetAvailableModulesRequest,
  GetAvailableModulesResponse
} from './get-available-modules.dto';
import { TrainingModuleDTO } from './training-module.dto';

describe('get-available-modules.dto', () => {
  it('supports request and response contract shapes', () => {
    const request: GetAvailableModulesRequest = {
      learnerId: 'learner-1',
      learnerRole: 'courier'
    };
    const moduleDto: TrainingModuleDTO = {
      id: 'module-1',
      name: 'Safety 101',
      description: 'Intro safety module',
      contentType: 'video',
      content: { url: 'https://cdn.example/video.mp4' },
      durationMinutes: 30,
      category: 'safety',
      prerequisites: [],
      targetRoles: ['courier'],
      isPublic: true,
      difficulty: 'beginner'
    };
    const response: GetAvailableModulesResponse = {
      modules: [moduleDto],
      recommendations: ['module-2']
    };

    expect(request.learnerRole).toBe('courier');
    expect(response.modules[0].name).toBe('Safety 101');
    expect(response.recommendations).toContain('module-2');
  });
});
