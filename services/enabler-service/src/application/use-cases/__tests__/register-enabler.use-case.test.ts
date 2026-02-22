import { RegisterEnablerUseCase } from '../register-enabler.use-case';

const mockRepository = { create: jest.fn() } as any;

describe('RegisterEnablerUseCase', () => {
    let useCase: RegisterEnablerUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new RegisterEnablerUseCase(mockRepository);
    });

    it('should register enabler', async () => {
        mockRepository.create.mockResolvedValue({ id: 'e1', status: 'pending' });
        const result = await useCase.execute({ userId: 'u1', type: 'courier' });
        expect(result.id).toBe('e1');
    });
});
