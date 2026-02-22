import { FlagTransactionUseCase, FlagTransactionDTO } from '../flag-transaction.use-case';
import { PaymentStatus } from '../../../domain/entities/payment.entity';

describe('FlagTransactionUseCase', () => {
    let useCase: FlagTransactionUseCase;
    let mockRepository: any;

    const mockPayment = {
        id: 'pay-1',
        status: PaymentStatus.PROCESSING,
        updateMetadata: jest.fn(),
    };

    const validDTO: FlagTransactionDTO = {
        transactionId: 'pay-1',
        adminId: 'admin-1',
        flagType: 'SUSPICIOUS_ACTIVITY',
        reason: 'Multiple failed attempts',
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockRepository = {
            findById: jest.fn().mockResolvedValue(mockPayment),
            update: jest.fn(),
        };

        useCase = new FlagTransactionUseCase(mockRepository);
    });

    it('should flag transaction successfully', async () => {
        await useCase.execute(validDTO);

        expect(mockPayment.updateMetadata).toHaveBeenCalledWith(
            expect.objectContaining({
                flaggedBy: 'admin-1',
                flagReason: 'Multiple failed attempts',
                flagType: 'SUSPICIOUS_ACTIVITY',
            })
        );
        expect(mockRepository.update).toHaveBeenCalledWith(mockPayment);
    });

    it('should throw error when transaction not found', async () => {
        mockRepository.findById.mockResolvedValue(null);

        await expect(useCase.execute(validDTO)).rejects.toThrow('not found');
        expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should record flag timestamp', async () => {
        await useCase.execute(validDTO);

        expect(mockPayment.updateMetadata).toHaveBeenCalledWith(
            expect.objectContaining({
                flaggedAt: expect.any(Date),
            })
        );
    });

    it('should handle different flag types', async () => {
        const flagTypes = ['FRAUD', 'CHARGEBACK_RISK', 'POLICY_VIOLATION', 'MANUAL_REVIEW'];

        for (const flagType of flagTypes) {
            jest.clearAllMocks();
            await useCase.execute({ ...validDTO, flagType });

            expect(mockPayment.updateMetadata).toHaveBeenCalledWith(
                expect.objectContaining({ flagType })
            );
        }
    });

    it('should flag transaction by different admins', async () => {
        const adminIds = ['admin-1', 'admin-2', 'fraud-team'];

        for (const adminId of adminIds) {
            jest.clearAllMocks();
            await useCase.execute({ ...validDTO, adminId });

            expect(mockPayment.updateMetadata).toHaveBeenCalledWith(
                expect.objectContaining({ flaggedBy: adminId })
            );
        }
    });

    it('should handle various flag reasons', async () => {
        const reasons = [
            'Unusual transaction pattern',
            'High-risk country',
            'Velocity check failed',
            'Customer dispute',
        ];

        for (const reason of reasons) {
            jest.clearAllMocks();
            await useCase.execute({ ...validDTO, reason });

            expect(mockPayment.updateMetadata).toHaveBeenCalledWith(
                expect.objectContaining({ flagReason: reason })
            );
        }
    });
});
