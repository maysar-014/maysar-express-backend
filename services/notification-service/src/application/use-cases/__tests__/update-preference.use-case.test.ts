import { UpdatePreferenceUseCase } from '../update-preference.use-case';

const mockRepository = { findById: jest.fn(), update: jest.fn() } as any;

describe('UpdatePreferenceUseCase', () => {
    let useCase: UpdatePreferenceUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new UpdatePreferenceUseCase(mockRepository);
    });

    it('should update preference', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'p1', enabled: true, disable: jest.fn() });

        await useCase.execute('p1', { enabled: false });

        expect(mockRepository.update).toHaveBeenCalled();
    });

    it('should fail if preference not found', async () => {
        mockRepository.findById.mockResolvedValue(null);
        await expect(useCase.execute('p1', { enabled: false }))
            .rejects.toThrow('Preference not found');
    });

    it('should enable disabled preference', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'p1', enabled: false, enable: jest.fn() });
        await useCase.execute('p1', { enabled: true });
        expect(mockRepository.update).toHaveBeenCalled();
    });

    it('should update channel preferences', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'p1', channels: ['email'] });
        await useCase.execute('p1', { channels: ['email', 'sms'] });
        expect(mockRepository.update).toHaveBeenCalledWith('p1', expect.objectContaining({ channels: ['email', 'sms'] }));
    });

    it('should update quiet hours', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'p1' });
        await useCase.execute('p1', { quietHours: { start: '22:00', end: '08:00' } });
        expect(mockRepository.update).toHaveBeenCalled();
    });

    it('should handle repository update failure', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'p1' });
        mockRepository.update.mockRejectedValue(new Error('Update failed'));
        await expect(useCase.execute('p1', { enabled: false }))
            .rejects.toThrow('Update failed');
    });
});
