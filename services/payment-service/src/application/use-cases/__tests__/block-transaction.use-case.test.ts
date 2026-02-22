import { BlockTransactionUseCase, BlockTransactionDTO } from '../block-transaction.use-case';
import { PaymentStatus } from '../../../domain/entities/payment.entity';

describe('BlockTransactionUseCase', () => {
    let useCase: BlockTransactionUseCase;
    let mockRepository: any;

    const mockPayment = {
        id: 'pay-1',
        status: PaymentStatus.PROCESSING,
        updateMetadata: jest.fn(),
        markAsFailed: jest.fn(),
    };

    const validDTO: BlockTransactionDTO = {
        transactionId: 'pay-1',
        adminId: 'admin-1',
        reason: 'Suspected fraud',
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockRepository = {
            findById: jest.fn().mockResolvedValue(mockPayment),
            update: jest.fn(),
        };

        useCase = new BlockTransactionUseCase(mockRepository);
    });

    it('should block transaction successfully', async () => {
        await useCase.execute(validDTO);

        expect(mockPayment.updateMetadata).toHaveBeenCalledWith(
            expect.objectContaining({
                blockedBy: 'admin-1',
                blockReason: 'Suspected fraud',
            })
        );
        expect(mockPayment.markAsFailed).toHaveBeenCalled();
        expect(mockRepository.update).toHaveBeenCalledWith(mockPayment);
    });

    it('should throw error when transaction not found', async () => {
        mockRepository.findById.mockResolvedValue(null);

        await expect(useCase.execute(validDTO)).rejects.toThrow('not found');
        expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should record block timestamp', async () => {
        await useCase.execute(validDTO);

        expect(mockPayment.updateMetadata).toHaveBeenCalledWith(
            expect.objectContaining({
                blockedAt: expect.any(Date),
            })
        );
    });

    it('should handle different block reasons', async () => {
        const reasons = ['Fraud detected', 'Policy violation', 'Manual review required'];

        for (const reason of reasons) {
            jest.clearAllMocks();
            await useCase.execute({ ...validDTO, reason });

            expect(mockPayment.updateMetadata).toHaveBeenCalledWith(
                expect.objectContaining({ blockReason: reason })
            );
        }
    });

    it('should block transaction by different admins', async () => {
        const adminIds = ['admin-1', 'admin-2', 'admin-3'];

        for (const adminId of adminIds) {
            jest.clearAllMocks();
            await useCase.execute({ ...validDTO, adminId });

            expect(mockPayment.updateMetadata).toHaveBeenCalledWith(
                expect.objectContaining({ blockedBy: adminId })
            );
        }
    });
});
