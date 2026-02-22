import { TrackShipmentUseCase } from '../track-shipment.use-case';

const mockRepository = { findById: jest.fn(), update: jest.fn() } as any;
const mockEventBus = { publish: jest.fn() } as any;

describe('TrackShipmentUseCase', () => {
    let useCase: TrackShipmentUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new TrackShipmentUseCase(mockRepository, mockEventBus);
    });

    it('should update shipment status successfully', async () => {
        mockRepository.findById.mockResolvedValue({ 
            id: 'shipment-1', 
            status: 'IN_TRANSIT'
        });
        
        const result = await useCase.execute({ 
            shipmentId: 'shipment-1', 
            status: 'DELIVERED',
            location: 'Final Destination'
        });
        expect(result.status).toBe('DELIVERED');
        expect(mockRepository.update).toHaveBeenCalled();
        expect(mockEventBus.publish).toHaveBeenCalledWith('ShipmentStatusUpdated.v1', expect.any(Object));
    });

    it('should fail if shipment not found', async () => {
        mockRepository.findById.mockResolvedValue(null);
        await expect(useCase.execute({ 
            shipmentId: 'shipment-1', 
            status: 'DELIVERED',
            location: 'Final Destination'
        })).rejects.toThrow('Shipment not found');
    });
});
