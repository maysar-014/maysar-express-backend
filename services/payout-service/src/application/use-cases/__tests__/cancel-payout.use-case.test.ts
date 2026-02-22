import { CancelPayoutUseCase } from '../cancel-payout.use-case';
import { IPayoutRepository } from '../../../domain/ports/payout.repository.port';
import { Payout } from '../../../domain/entities/payout.entity';

const mockRepository: jest.Mocked<IPayoutRepository> = {
    findById: jest.fn(),
    update: jest.fn()
} as any;

describe('CancelPayoutUseCase', () => {
    let useCase: CancelPayoutUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new CancelPayoutUseCase(mockRepository);
    });

    it('should cancel payout successfully', async () => {
        const payout = Payout.create({
            id: 'p1',
            recipientId: 'r1',
            amount: 100,
            currency: 'USD',
            method: 'bank_transfer'
        });

        mockRepository.findById.mockResolvedValue(payout);

        await useCase.execute('p1', 'User requested');

        expect(mockRepository.update).toHaveBeenCalled();
    });

    it('should throw error when payout not found', async () => {
        mockRepository.findById.mockResolvedValue(null);

        await expect(useCase.execute('p999', 'reason')).rejects.toThrow('Payout not found');
    });
});
