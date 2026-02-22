import { ApproveEnablerUseCase } from '../approve-enabler.use-case';

const mockRepository = { findById: jest.fn(), update: jest.fn() } as any;

describe('ApproveEnablerUseCase', () => {
    let useCase: ApproveEnablerUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new ApproveEnablerUseCase(mockRepository);
    });

    it('should approve enabler', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'e1', approve: jest.fn() });
        await useCase.execute('e1');
        expect(mockRepository.update).toHaveBeenCalled();
    });
});
