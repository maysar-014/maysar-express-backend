import { RegisterBusinessUseCase } from '../register-business.use-case';

const mockRepository = { save: jest.fn(), findByRegistrationNumber: jest.fn() } as any;
const mockEventBus = { publish: jest.fn() } as any;

describe('RegisterBusinessUseCase', () => {
    let useCase: RegisterBusinessUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new RegisterBusinessUseCase(mockRepository, mockEventBus);
    });

    it('should register business successfully', async () => {
        mockRepository.findByRegistrationNumber.mockResolvedValue(null);
        const result = await useCase.execute({ 
            name: 'Test Business', 
            registrationNumber: 'REG123',
            ownerId: 'user-1'
        });
        expect(result.id).toBeDefined();
        expect(mockRepository.save).toHaveBeenCalled();
        expect(mockEventBus.publish).toHaveBeenCalledWith('BusinessRegistered.v1', expect.any(Object));
    });

    it('should fail if registration number exists', async () => {
        mockRepository.findByRegistrationNumber.mockResolvedValue({ id: 'existing' });
        await expect(useCase.execute({ 
            name: 'Test Business', 
            registrationNumber: 'REG123',
            ownerId: 'user-1'
        })).rejects.toThrow('Business already registered');
    });

    it('should validate required fields', async () => {
        await expect(useCase.execute({ name: '', registrationNumber: 'REG123', ownerId: 'user-1' }))
            .rejects.toThrow('Business name is required');
    });

    it('should validate registration number format', async () => {
        await expect(useCase.execute({ name: 'Test', registrationNumber: '', ownerId: 'user-1' }))
            .rejects.toThrow('Registration number is required');
    });

    it('should handle repository save failure', async () => {
        mockRepository.findByRegistrationNumber.mockResolvedValue(null);
        mockRepository.save.mockRejectedValue(new Error('Save failed'));
        await expect(useCase.execute({ name: 'Test', registrationNumber: 'REG123', ownerId: 'user-1' }))
            .rejects.toThrow('Save failed');
    });

    it('should set initial status to pending', async () => {
        mockRepository.findByRegistrationNumber.mockResolvedValue(null);
        await useCase.execute({ name: 'Test', registrationNumber: 'REG123', ownerId: 'user-1' });
        expect(mockRepository.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'PENDING' }));
    });
});
