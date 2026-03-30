import { CalculateCommissionUseCase } from '../calculate-commission.use-case';
import { ICommissionRepository, IEventStoreRepository } from '../../../domain/repositories/index';
import { OrderId, SellerId } from '../../../domain/value-objects/ids.value-object';
import { CommissionAmount, CommissionRate } from '../../../domain/value-objects/monetary.value-object';
import { CommissionType, CommissionStatus } from '../../../domain/value-objects/commission-types.value-object';
import { RecipientType } from '../../../domain/value-objects/recipient-types.value-object';

const mockRepository = {
    save: jest.fn()
} as unknown as jest.Mocked<ICommissionRepository>;
const mockEventStore = {
    saveEvent: jest.fn()
} as unknown as jest.Mocked<IEventStoreRepository>;

describe('CalculateCommissionUseCase', () => {
    let useCase: CalculateCommissionUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new CalculateCommissionUseCase(mockRepository, mockEventStore);
    });

    it('should calculate commission successfully', async () => {
        const input = {
            orderId: OrderId.create(),
            sellerId: SellerId.create(),
            orderAmount: CommissionAmount.fromNumber(1000),
            recipientType: RecipientType.SELLER,
            commissionType: CommissionType.SALE
        };

        const result = await useCase.execute(input);

        expect(result.commission.status).toBe(CommissionStatus.PENDING);
        expect(result.commission.orderId.equals(input.orderId)).toBe(true);
        expect(result.commission.sellerId.equals(input.sellerId)).toBe(true);
        expect(result.commission.amount.toNumber()).toBe(80);
        expect(result.breakdown.totalCommission.toNumber()).toBe(80);
        expect(mockRepository.save).toHaveBeenCalled();
        expect(mockEventStore.saveEvent).toHaveBeenCalledTimes(1);
    });

    it('should reject commissions below the minimum amount', async () => {
        await expect(useCase.execute({
            orderId: OrderId.create(),
            sellerId: SellerId.create(),
            orderAmount: CommissionAmount.fromNumber(0.5),
            recipientType: RecipientType.SELLER,
            commissionType: CommissionType.SALE
        })).rejects.toThrow('Commission creation not allowed');
    });

    it('should respect a custom base rate when provided', async () => {
        const result = await useCase.execute({
            orderId: OrderId.create(),
            sellerId: SellerId.create(),
            orderAmount: CommissionAmount.fromNumber(1000),
            recipientType: RecipientType.SELLER,
            commissionType: CommissionType.SALE,
            baseRate: CommissionRate.fromPercentage(12)
        });

        expect(result.commission.amount.toNumber()).toBe(120);
        expect(result.breakdown.totalCommission.toNumber()).toBe(120);
    });

    it('should handle zero commission', async () => {
        const result = await useCase.execute({
            orderId: OrderId.create(),
            sellerId: SellerId.create(),
            orderAmount: CommissionAmount.fromNumber(0),
            recipientType: RecipientType.COURIER,
            commissionType: CommissionType.SALE
        });

        expect(result.commission.amount.toNumber()).toBe(0);
        expect(result.breakdown.totalCommission.toNumber()).toBe(0);
    });

    it('should handle large amounts', async () => {
        const result = await useCase.execute({
            orderId: OrderId.create(),
            sellerId: SellerId.create(),
            orderAmount: CommissionAmount.fromNumber(10000),
            recipientType: RecipientType.SELLER,
            commissionType: CommissionType.SALE
        });

        expect(result.commission.amount.toNumber()).toBe(800);
    });

    it('should save commission to repository', async () => {
        const orderId = OrderId.create();
        const sellerId = SellerId.create();

        await useCase.execute({
            orderId,
            sellerId,
            orderAmount: CommissionAmount.fromNumber(1000),
            recipientType: RecipientType.SELLER,
            commissionType: CommissionType.SALE
        });

        expect(mockRepository.save).toHaveBeenCalledWith(expect.objectContaining({
            orderId,
            sellerId
        }));
    });
});
