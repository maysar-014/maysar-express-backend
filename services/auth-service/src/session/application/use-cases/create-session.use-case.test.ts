import { CreateSessionUseCase } from '../create-session.use-case';

describe('CreateSessionUseCase', () => {
  const mockSessionEngine = {
    createSession: jest.fn()
  };

  let useCase: CreateSessionUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateSessionUseCase(mockSessionEngine as any);
  });

  it('should create a session by delegating to the session engine', async () => {
    mockSessionEngine.createSession.mockResolvedValue('s1');

    const result = await useCase.execute({
      userId: 'u1',
      role: 'buyer',
      deviceInfo: 'chrome',
      ipAddress: '127.0.0.1'
    });

    expect(result).toBe('s1');
    expect(mockSessionEngine.createSession).toHaveBeenCalledWith('u1', 'buyer', 'chrome', '127.0.0.1');
  });
});
