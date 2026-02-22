import { CompletePayoutUseCase } from '../complete-payout.use-case';
import { IPayoutRepository } from '../../../domain/ports/payout.repository.port';
import { Payout } from '../../../domain/entities/payout.entity';

const mockRepository: jest.Mocked<IPayoutRepository> = {
    findById: jest.fn(),
    update: jest.fn()
} as any;

describe('CompletePayoutUseCase', () => {
    let useCase: CompletePayoutUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new CompletePayoutUseCase(mockRepository);
    });

    it('should complete payout successfully', async () => {
        const payout = Payout.create({
            id: 'p1',
            recipientId: 'r1',
            amount: 100,
            currency: 'USD',
            method: 'bank_transfer'
        });

        mockRepository.findById.mockResolvedValue(payout);

        await useCase.execute('p1', 'prov-123');

        expect(mockRepository.update).toHaveBeenCalled();
    });

    it('should throw error when payout not found', async () => {
        mockRepository.findById.mockResolvedValue(null);

        await expect(useCase.execute('p999')).rejects.toThrow('Payout not found');
    });
});
