import { ApproveCommissionUseCase, ApproveCommissionInput } from '../approve-commission.use-case';
import { CommissionId } from '../../../domain/value-objects/ids.value-object';
import { CommissionStatus } from '../../../domain/value-objects/commission-types.value-object';
import { ICommissionRepository, IPayoutRepository, IEventStoreRepository } from '../../../domain/repositories/index';
import { CommissionFactory } from '../../../../__tests__/factories/commission.factory';

describe('ApproveCommissionUseCase', () => {
    let useCase: ApproveCommissionUseCase;
    let mockCommissionRepository: jest.Mocked<ICommissionRepository>;
    let mockPayoutRepository: jest.Mocked<IPayoutRepository>;
    let mockEventStore: jest.Mocked<IEventStoreRepository>;

    beforeEach(() => {
        mockCommissionRepository = {
            findById: jest.fn(),
            updateStatus: jest.fn()
        } as any;

        mockPayoutRepository = {
            save: jest.fn()
        } as any;

        mockEventStore = {
            saveEvent: jest.fn()
        } as any;

        useCase = new ApproveCommissionUseCase(
            mockCommissionRepository,
            mockPayoutRepository,
            mockEventStore
        );
    });

    const commissionId = CommissionId.create();
    const input: ApproveCommissionInput = {
        commissionId,
        approverRole: 'admin',
        approverId: 'admin-1'
    };

    it('should approve commission successfully', async () => {
        const commission = CommissionFactory.create({ id: commissionId, status: CommissionStatus.PENDING });
        mockCommissionRepository.findById.mockResolvedValue(commission);

        const result = await useCase.execute(input);

        expect(result.success).toBe(true);
        expect(mockCommissionRepository.updateStatus).toHaveBeenCalledWith(commissionId, CommissionStatus.APPROVED);
        expect(mockEventStore.saveEvent).toHaveBeenCalled();
    });

    it('should auto-schedule payout if requested', async () => {
        const commission = CommissionFactory.create({ id: commissionId, status: CommissionStatus.PENDING });
        mockCommissionRepository.findById.mockResolvedValue(commission);

        const result = await useCase.execute({ ...input, autoSchedulePayout: true });

        expect(result.events).toHaveLength(2);
        expect(result.events[1].eventType).toBe('PayoutScheduled');
    });

    it('should throw error if commission not found', async () => {
        mockCommissionRepository.findById.mockResolvedValue(null);
        await expect(useCase.execute(input)).rejects.toThrow('Commission not found');
    });

    it('should throw error if policy validation fails', async () => {
        const commission = CommissionFactory.create({ id: commissionId, status: CommissionStatus.APPROVED });
        mockCommissionRepository.findById.mockResolvedValue(commission);

        await expect(useCase.execute(input)).rejects.toThrow('Commission approval not allowed');
    });

    it('should handle different approver roles', async () => {
        const roles = ['admin', 'manager', 'finance'];
        for (const role of roles) {
            jest.clearAllMocks();
            const commission = CommissionFactory.create({ id: commissionId, status: CommissionStatus.PENDING });
            mockCommissionRepository.findById.mockResolvedValue(commission);
            const result = await useCase.execute({ ...input, approverRole: role });
            expect(result.success).toBe(true);
        }
    });

    it('should publish approval event', async () => {
        const commission = CommissionFactory.create({ id: commissionId, status: CommissionStatus.PENDING });
        mockCommissionRepository.findById.mockResolvedValue(commission);
        await useCase.execute(input);
        expect(mockEventStore.saveEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'CommissionApproved' }));
    });

    it('should not schedule payout by default', async () => {
        const commission = CommissionFactory.create({ id: commissionId, status: CommissionStatus.PENDING });
        mockCommissionRepository.findById.mockResolvedValue(commission);
        const result = await useCase.execute(input);
        expect(result.events).toHaveLength(1);
    });
});
