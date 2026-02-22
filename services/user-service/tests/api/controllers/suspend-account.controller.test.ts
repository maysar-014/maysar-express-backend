import { SuspendAccountController } from '../src/api/controllers/suspend-account.controller';

describe('SuspendAccountController', () => {
  let useCase: SuspendAccountController;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };
    useCase = new SuspendAccountController(mockRepo);
  });

  describe('execute', () => {
    it('should execute successfully', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1' });
      const result = await useCase.execute({ id: '1' });
      expect(result).toBeDefined();
    });

    it('should handle not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(useCase.execute({ id: '999' })).rejects.toThrow();
    });

    it('should handle repository errors', async () => {
      mockRepo.findById.mockRejectedValue(new Error('DB error'));
      await expect(useCase.execute({ id: '1' })).rejects.toThrow();
    });
  });
});
