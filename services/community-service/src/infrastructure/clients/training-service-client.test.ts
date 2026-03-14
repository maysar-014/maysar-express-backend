jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn()
  }
}));

import axios from 'axios';
import { HttpTrainingServiceClient } from './training-service-client';

describe('HttpTrainingServiceClient', () => {
  const get = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (axios.create as jest.Mock).mockReturnValue({ get });
  });

  it('returns completed modules and defaults to empty array', async () => {
    get.mockResolvedValueOnce({ data: { modules: ['m1', 'm2'] } });
    get.mockResolvedValueOnce({ data: {} });
    const client = new HttpTrainingServiceClient('http://training');

    await expect(client.getCompletedModules('u1')).resolves.toEqual(['m1', 'm2']);
    await expect(client.getCompletedModules('u2')).resolves.toEqual([]);
  });

  it('handles completed modules errors (404 => empty, otherwise throws)', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    get.mockRejectedValueOnce({ message: 'not found', response: { status: 404 } });
    get.mockRejectedValueOnce({ message: 'timeout', response: { status: 500 } });
    const client = new HttpTrainingServiceClient('http://training');

    await expect(client.getCompletedModules('u1')).resolves.toEqual([]);
    await expect(client.getCompletedModules('u1')).rejects.toThrow(
      'Training service error: timeout'
    );
    expect(errorSpy).toHaveBeenCalledWith('Failed to fetch completed modules:', 'not found');
  });

  it('handles module details fetch success and 404', async () => {
    get.mockResolvedValueOnce({ data: { id: 'm1', title: 'T', category: 'C', expertiseArea: 'E', level: 'L' } });
    get.mockRejectedValueOnce({ message: 'not found', response: { status: 404 } });
    get.mockRejectedValueOnce({ message: 'boom', response: { status: 500 } });
    const client = new HttpTrainingServiceClient('http://training');

    await expect(client.getModuleDetails('m1')).resolves.toEqual(
      expect.objectContaining({ id: 'm1' })
    );
    await expect(client.getModuleDetails('missing')).resolves.toBeNull();
    await expect(client.getModuleDetails('m2')).rejects.toThrow('Training service error: boom');
  });

  it('handles user progress fetch success and 404 default', async () => {
    get.mockResolvedValueOnce({
      data: {
        totalModulesCompleted: 3,
        certificationsEarned: 1,
        currentLevel: 'INTERMEDIATE',
        categories: [{ category: 'sales', completedModules: 3 }]
      }
    });
    get.mockRejectedValueOnce({ message: 'not found', response: { status: 404 } });
    get.mockRejectedValueOnce({ message: 'error', response: { status: 500 } });
    const client = new HttpTrainingServiceClient('http://training');

    await expect(client.getUserProgress('u1')).resolves.toEqual(
      expect.objectContaining({ totalModulesCompleted: 3 })
    );
    await expect(client.getUserProgress('u2')).resolves.toEqual({
      totalModulesCompleted: 0,
      certificationsEarned: 0,
      currentLevel: 'BEGINNER',
      categories: []
    });
    await expect(client.getUserProgress('u3')).rejects.toThrow('Training service error: error');
  });
});
