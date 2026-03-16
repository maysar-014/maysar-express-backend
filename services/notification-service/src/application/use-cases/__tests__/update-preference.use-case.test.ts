import { UpdatePreferenceUseCase } from '../update-preference.use-case';

const mockRepository = { findByUserAndChannel: jest.fn(), update: jest.fn() } as any;

describe('UpdatePreferenceUseCase', () => {
    let useCase: UpdatePreferenceUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new UpdatePreferenceUseCase(mockRepository);
    });

    it('should update preference', async () => {
        const updated = { id: 'p1', enabled: false };
        const preference = {
            updatePreference: jest.fn().mockReturnValue(updated)
        };
        mockRepository.findByUserAndChannel.mockResolvedValue(preference);
        mockRepository.update.mockResolvedValue(updated);

        await useCase.execute('user-1', 'email', { enabled: false });

        expect(mockRepository.update).toHaveBeenCalledWith(updated);
    });

    it('should fail if preference not found', async () => {
        mockRepository.findByUserAndChannel.mockResolvedValue(null);
        await expect(useCase.execute('user-1', 'email', { enabled: false }))
            .rejects.toThrow('Preference not found');
    });

    it('should handle repository update failure', async () => {
        const updated = { id: 'p1', enabled: false };
        const preference = {
            updatePreference: jest.fn().mockReturnValue(updated)
        };
        mockRepository.findByUserAndChannel.mockResolvedValue(preference);
        mockRepository.update.mockRejectedValue(new Error('Update failed'));
        await expect(useCase.execute('user-1', 'email', { enabled: false }))
            .rejects.toThrow('Update failed');
    });
});
