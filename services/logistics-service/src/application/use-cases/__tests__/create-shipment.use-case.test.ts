import { CreateShipmentUseCase } from '../create-shipment.use-case';

const mockRepository = { save: jest.fn(), findByOrderId: jest.fn() } as any;
const mockEventBus = { publish: jest.fn() } as any;

describe('CreateShipmentUseCase', () => {
    let useCase: CreateShipmentUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new CreateShipmentUseCase(mockRepository, mockEventBus);
    });

    it('should create shipment successfully', async () => {
        mockRepository.findByOrderId.mockResolvedValue(null);
        const result = await useCase.execute({ 
            orderId: 'order-1', 
            origin: 'Location A',
            destination: 'Location B'
        });
        expect(result.id).toBeDefined();
        expect(mockRepository.save).toHaveBeenCalled();
        expect(mockEventBus.publish).toHaveBeenCalledWith('ShipmentCreated.v1', expect.any(Object));
    });

    it('should fail if shipment already exists', async () => {
        mockRepository.findByOrderId.mockResolvedValue({ id: 'existing' });
        await expect(useCase.execute({ 
            orderId: 'order-1', 
            origin: 'Location A',
            destination: 'Location B'
        })).rejects.toThrow('Shipment already exists');
    });
});
