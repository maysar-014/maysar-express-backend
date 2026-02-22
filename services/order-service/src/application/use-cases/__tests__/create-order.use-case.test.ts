import { CreateOrderUseCase } from '../create-order.use-case';

describe('CreateOrderUseCase', () => {
    let useCase: CreateOrderUseCase;
    let mockRepository: any;
    let mockEventBus: any;

    const validDto = {
        userId: 'user-1',
        items: [
            { productId: 'prod-1', quantity: 2, price: 50 },
            { productId: 'prod-2', quantity: 1, price: 100 },
        ],
        total: 200,
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockRepository = { save: jest.fn() };
        mockEventBus = { publish: jest.fn() };

        useCase = new CreateOrderUseCase(mockRepository, mockEventBus);
    });

    it('should create order successfully', async () => {
        const result = await useCase.execute(validDto);

        expect(result).toBeDefined();
        expect(result.status).toBe('PENDING');
        expect(mockRepository.save).toHaveBeenCalled();
        expect(mockEventBus.publish).toHaveBeenCalledWith('OrderCreated.v1', expect.any(Object));
    });

    it('should fail when items array is empty', async () => {
        await expect(useCase.execute({ ...validDto, items: [] })).rejects.toThrow('Order must have items');
    });

    it('should fail when items is null', async () => {
        await expect(useCase.execute({ ...validDto, items: null as any })).rejects.toThrow('Order must have items');
    });

    it('should fail when items is undefined', async () => {
        await expect(useCase.execute({ ...validDto, items: undefined as any })).rejects.toThrow('Order must have items');
    });

    it('should generate unique order IDs', async () => {
        const result1 = await useCase.execute(validDto);
        const result2 = await useCase.execute(validDto);

        expect(result1.id).not.toBe(result2.id);
    });

    it('should handle single item orders', async () => {
        const singleItemDto = {
            ...validDto,
            items: [{ productId: 'prod-1', quantity: 1, price: 100 }],
            total: 100,
        };

        const result = await useCase.execute(singleItemDto);

        expect(result).toBeDefined();
        expect(result.items).toHaveLength(1);
    });

    it('should handle multiple item orders', async () => {
        const multiItemDto = {
            ...validDto,
            items: [
                { productId: 'prod-1', quantity: 2, price: 50 },
                { productId: 'prod-2', quantity: 1, price: 100 },
                { productId: 'prod-3', quantity: 3, price: 30 },
            ],
            total: 290,
        };

        const result = await useCase.execute(multiItemDto);

        expect(result.items).toHaveLength(3);
    });

    it('should handle repository errors', async () => {
        mockRepository.save.mockRejectedValue(new Error('Database error'));

        await expect(useCase.execute(validDto)).rejects.toThrow('Database error');
    });
});
