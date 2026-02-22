import { CompleteProduction } from '../CompleteProduction';

const mockRepository = { findById: jest.fn(), update: jest.fn() } as any;

describe('CompleteProduction', () => {
    let useCase: CompleteProduction;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new CompleteProduction(mockRepository);
    });

    it('should complete production', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'p1', complete: jest.fn() });
        await useCase.execute('p1');
        expect(mockRepository.update).toHaveBeenCalled();
    });
});
