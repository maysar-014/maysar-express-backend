import { RegisterUserUseCase } from '../register-user.use-case';
import { eventBus } from '@shared/events/eventBus';

jest.mock('@shared/events/eventBus', () => ({
  eventBus: {
    publish: jest.fn()
  }
}));

const mockUserRepository = {
  findByEmail: jest.fn(),
  save: jest.fn()
};

describe('RegisterUserUseCase', () => {
  let useCase: RegisterUserUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new RegisterUserUseCase(mockUserRepository as any);
  });

  it('registers with default buyer role and requested extra role when provided', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);

    const userId = await useCase.execute({
      email: 'new@example.com',
      password: 'SecurePassword123!',
      role: 'seller',
      profile: { name: 'New User' }
    });

    expect(userId).toBeDefined();
    expect(mockUserRepository.save).toHaveBeenCalledTimes(1);

    const savedUser = mockUserRepository.save.mock.calls[0][0];
    expect(savedUser.role).toBe('buyer');
    expect(savedUser.passwordHash).toBeDefined();
    expect(savedUser.profile).toEqual(
      expect.objectContaining({
        name: 'New User',
        roles: ['buyer', 'seller'],
        requestedRole: 'seller'
      })
    );

    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'UserRegistered.v1',
        data: expect.objectContaining({
          role: 'buyer',
          profile: expect.objectContaining({
            roles: ['buyer', 'seller'],
            requestedRole: 'seller'
          })
        })
      })
    );
  });

  it('registers a privileged system role when contract privileges are allowed', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);

    const userId = await useCase.execute({
      email: 'system@example.com',
      password: 'SecurePassword123!',
      role: 'system',
      allowPrivilegedRole: true,
      profile: { name: 'System User' }
    });

    expect(userId).toBeDefined();
    expect(mockUserRepository.save).toHaveBeenCalledTimes(1);

    const savedUser = mockUserRepository.save.mock.calls[0][0];
    expect(savedUser.role).toBe('system');
    expect(savedUser.passwordHash).toBeDefined();
    expect(savedUser.profile).toEqual(
      expect.objectContaining({
        name: 'System User',
        roles: ['system']
      })
    );
    expect(savedUser.profile.requestedRole).toBeUndefined();

    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'UserRegistered.v1',
        data: expect.objectContaining({
          role: 'system',
          profile: expect.objectContaining({
            roles: ['system']
          })
        })
      })
    );
  });

  it('registers with only buyer role when no additional role is requested', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);

    await useCase.execute({
      email: 'buyer@example.com',
      password: 'SecurePassword123!',
      profile: { name: 'Buyer User' }
    });

    const savedUser = mockUserRepository.save.mock.calls[0][0];
    expect(savedUser.role).toBe('buyer');
    expect(savedUser.passwordHash).toBeDefined();
    expect(savedUser.profile).toEqual(
      expect.objectContaining({
        name: 'Buyer User',
        roles: ['buyer']
      })
    );
    expect(savedUser.profile.requestedRole).toBeUndefined();
  });

  it('throws when user already exists', async () => {
    mockUserRepository.findByEmail.mockResolvedValue({ id: 'existing' });

    await expect(
      useCase.execute({
        email: 'new@example.com',
        password: 'SecurePassword123!',
        role: 'seller',
        profile: { name: 'New User' }
      })
    ).rejects.toThrow('User already exists');

    expect(mockUserRepository.save).not.toHaveBeenCalled();
  });
});
