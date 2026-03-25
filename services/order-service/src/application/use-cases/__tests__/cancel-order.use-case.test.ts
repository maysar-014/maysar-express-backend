import { CancelOrderUseCase } from '../cancel-order.use-case';

describe('CancelOrderUseCase', () => {
    let useCase: CancelOrderUseCase;
    let mockRepository: any;
    let mockEventBus: any;

    const mockOrder = {
        id: 'order-1',
        buyerId: 'user-1',
        sellerId: 'seller-1',
        status: 'PENDING',
        items: [],
        total: 200,
    };

    const validDto = {
        orderId: 'order-1',
        userId: 'user-1',
        reason: 'Changed my mind',
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockRepository = {
            findById: jest.fn().mockResolvedValue({ ...mockOrder }),
            update: jest.fn(),
        };
        mockEventBus = { publish: jest.fn() };

        useCase = new CancelOrderUseCase(mockRepository, mockEventBus);
    });

    it('should cancel order successfully', async () => {
        const result = await useCase.execute(validDto);

        expect(result.status).toBe('CANCELLED');
        expect(result.cancelReason).toBe('Changed my mind');
        expect(mockRepository.update).toHaveBeenCalled();
        expect(mockEventBus.publish).toHaveBeenCalledWith('OrderCancelled.v1', expect.any(Object));
    });

    it('should fail when order not found', async () => {
        mockRepository.findById.mockResolvedValue(null);

        await expect(useCase.execute(validDto)).rejects.toThrow('Order not found');
    });

    it('should fail when order is shipped', async () => {
        mockRepository.findById.mockResolvedValue({ ...mockOrder, status: 'SHIPPED' });

        await expect(useCase.execute(validDto)).rejects.toThrow('Order cannot be cancelled in current status');
    });

    it('should allow cancellation of PENDING orders', async () => {
        mockRepository.findById.mockResolvedValue({ ...mockOrder, status: 'PENDING' });

        const result = await useCase.execute(validDto);

        expect(result.status).toBe('CANCELLED');
    });

    it('should reject buyer cancellation of CONFIRMED orders until seller consents', async () => {
        mockRepository.findById.mockResolvedValue({ ...mockOrder, status: 'CONFIRMED' });

        await expect(useCase.execute(validDto)).rejects.toThrow('Seller consent is required after the order is confirmed');
    });

    it('should allow seller-issued cancellation of CONFIRMED orders', async () => {
        mockRepository.findById.mockResolvedValue({ ...mockOrder, status: 'CONFIRMED' });

        const result = await useCase.execute({ ...validDto, userId: 'seller-1', requestedBy: 'seller' });

        expect(result.status).toBe('CANCELLED');
    });

    it('should handle different cancellation reasons', async () => {
        const reasons = [
            'Changed my mind',
            'Found better price',
            'Ordered by mistake',
            'Delivery too slow',
        ];

        for (const reason of reasons) {
            jest.clearAllMocks();
            mockRepository.findById.mockResolvedValue({ ...mockOrder, status: 'PENDING' });
            const result = await useCase.execute({ ...validDto, reason });
            expect(result.cancelReason).toBe(reason);
        }
    });

    it('should publish cancellation event', async () => {
        await useCase.execute(validDto);

        expect(mockEventBus.publish).toHaveBeenCalledWith(
            'OrderCancelled.v1',
            expect.objectContaining({ status: 'CANCELLED' })
        );
    });

    it('should handle repository errors', async () => {
        mockRepository.update.mockRejectedValue(new Error('Database error'));

        await expect(useCase.execute(validDto)).rejects.toThrow('Database error');
    });
});
