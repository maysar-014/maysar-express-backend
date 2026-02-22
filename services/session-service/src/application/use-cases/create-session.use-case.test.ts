import { CreateSessionUseCase } from '../create-session.use-case';

const mockRepository = {
  create: jest.fn(),
  findByUserId: jest.fn()
} as any;

describe('CreateSessionUseCase', () => {
  let useCase: CreateSessionUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateSessionUseCase(mockRepository);
  });

  it('should create session', async () => {
    mockRepository.create.mockResolvedValue({
      id: 's1',
      userId: 'u1',
      token: 'token123'
    });

    const result = await useCase.execute({ userId: 'u1' });

    expect(result.sessionId).toBe('s1');
    expect(mockRepository.create).toHaveBeenCalled();
  });

  it('should invalidate old sessions', async () => {
    mockRepository.findByUserId.mockResolvedValue([
      { id: 's1', isExpired: () => true }
    ]);

    await useCase.execute({ userId: 'u1' });

    expect(mockRepository.findByUserId).toHaveBeenCalledWith('u1');
  });
});
