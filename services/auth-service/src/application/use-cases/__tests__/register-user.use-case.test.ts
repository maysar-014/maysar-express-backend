import { RegisterUserUseCase } from '../register-user.use-case';

const mockUserRepository = {
    findByEmail: jest.fn(),
    save: jest.fn()
};

const mockEventBus = {
    publish: jest.fn()
};

describe('RegisterUserUseCase', () => {
    let useCase: RegisterUserUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new RegisterUserUseCase(
            mockUserRepository as any,
            mockEventBus as any
        );
    });

    const request = {
        email: 'new@example.com',
        role: 'buyer',
        profile: { name: 'New User' }
    };

    it('should register new user', async () => {
        mockUserRepository.findByEmail.mockResolvedValue(null);

        const userId = await useCase.execute(request);

        expect(userId).toBeDefined();
        expect(mockUserRepository.save).toHaveBeenCalled();
        expect(mockEventBus.publish).toHaveBeenCalledWith('UserRegistered.v1', expect.objectContaining({
            email: request.email,
            role: request.role
        }));
    });

    it('should throw if user already exists', async () => {
        mockUserRepository.findByEmail.mockResolvedValue({ id: 'existing' });

        await expect(useCase.execute(request))
            .rejects
            .toThrow('User already exists');

        expect(mockUserRepository.save).not.toHaveBeenCalled();
    });
});
