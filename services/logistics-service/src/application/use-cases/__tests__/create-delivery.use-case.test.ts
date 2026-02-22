import { CreateDeliveryUseCase, CreateDeliveryInput } from '../create-delivery.use-case';
import { UpdateDeliveryStatusUseCase, UpdateDeliveryStatusInput } from '../update-delivery-status.use-case';
import { InitiateCODDeliveryUseCase } from '../initiate-cod-delivery.use-case';
import { VerifyCODDeliveryUseCase } from '../verify-cod-delivery.use-case';

describe('CreateDeliveryUseCase', () => {
    let useCase: CreateDeliveryUseCase;
    let mocks: any;

    const validInput: CreateDeliveryInput = {
        orderId: 'order-1',
        pickupLocation: { lat: -6.7924, lng: 39.2083, address: 'Dar es Salaam' },
        deliveryLocation: { lat: -6.8000, lng: 39.2800, address: 'Destination' },
        weight: 5,
        priority: 'standard',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mocks = {
            logisticsEngine: {
                validateDeliveryInput: jest.fn().mockReturnValue({ isValid: true }),
                getDefaultTimeWindowForPriority: jest.fn().mockReturnValue({ earliest: new Date(), latest: new Date() }),
                calculateTimeEstimates: jest.fn().mockReturnValue({ pickupBufferMinutes: 30, totalDurationMinutes: 60 }),
                calculateDeliveryCost: jest.fn().mockReturnValue(5000),
                generateDeliveryId: jest.fn().mockReturnValue('del-123'),
            },
            courierRepository: { findAvailableCouriers: jest.fn().mockResolvedValue([{ id: 'c1', name: 'Courier 1', vehicle: 'bike', rating: 4.5, completionRate: 0.95, currentLocation: { lat: -6.7924, lng: 39.2083 }, isAvailable: true }]) },
            weatherPort: { getWeatherData: jest.fn().mockResolvedValue({ severity: 'low' }) },
            trafficPort: { getTrafficData: jest.fn().mockResolvedValue({ congestionLevel: 0 }) },
            routePort: { getRouteAlternatives: jest.fn().mockResolvedValue([{ totalDistance: 10, totalDuration: 30, waypoints: [], segments: [], efficiency: 90, confidence: 0.9, alternatives: [] }]) },
            trackingPort: {},
            courierPolicy: { selectOptimalCourier: jest.fn().mockReturnValue({ id: 'c1', name: 'Courier 1' }) },
        };
        useCase = new CreateDeliveryUseCase(mocks.logisticsEngine, mocks.courierRepository, mocks.weatherPort, mocks.trafficPort, mocks.routePort, mocks.trackingPort, mocks.courierPolicy);
    });

    it('should create delivery successfully', async () => {
        const result = await useCase.execute(validInput);
        expect(result.deliveryId).toBe('del-123');
        expect(result.courierId).toBe('c1');
    });

    it('should fail with invalid input', async () => {
        mocks.logisticsEngine.validateDeliveryInput.mockReturnValue({ isValid: false, violations: ['Invalid weight'] });
        await expect(useCase.execute(validInput)).rejects.toThrow('Invalid delivery request');
    });

    it('should fail when no couriers available', async () => {
        mocks.courierRepository.findAvailableCouriers.mockResolvedValue([]);
        await expect(useCase.execute(validInput)).rejects.toThrow('No couriers available');
    });

    it('should handle different priorities', async () => {
        const priorities = ['standard', 'express', 'urgent'] as const;
        for (const priority of priorities) {
            jest.clearAllMocks();
            await useCase.execute({ ...validInput, priority });
            expect(mocks.logisticsEngine.calculateDeliveryCost).toHaveBeenCalled();
        }
    });

    it('should calculate delivery cost', async () => {
        await useCase.execute(validInput);
        expect(mocks.logisticsEngine.calculateDeliveryCost).toHaveBeenCalledWith(10, 5, 'standard');
    });

    it('should use fallback route when route service fails', async () => {
        mocks.routePort.getRouteAlternatives.mockResolvedValue([]);
        const result = await useCase.execute(validInput);
        expect(result).toBeDefined();
    });
});

describe('UpdateDeliveryStatusUseCase', () => {
    let useCase: UpdateDeliveryStatusUseCase;
    let mockRepository: any;

    const mockDelivery = { id: 'del-1', status: 'assigned', updatedAt: new Date() };

    beforeEach(() => {
        jest.clearAllMocks();
        mockRepository = {
            findById: jest.fn().mockResolvedValue(mockDelivery),
            updateStatus: jest.fn(),
        };
        useCase = new UpdateDeliveryStatusUseCase(mockRepository);
    });

    it('should update status successfully', async () => {
        const input: UpdateDeliveryStatusInput = { deliveryId: 'del-1', status: 'picked_up' };
        const result = await useCase.execute(input);
        expect(result.status).toBe('picked_up');
        expect(result.previousStatus).toBe('assigned');
    });

    it('should fail when delivery not found', async () => {
        mockRepository.findById.mockResolvedValue(null);
        await expect(useCase.execute({ deliveryId: 'invalid', status: 'picked_up' })).rejects.toThrow('not found');
    });

    it('should validate status transitions', async () => {
        mockRepository.findById.mockResolvedValue({ ...mockDelivery, status: 'delivered' });
        await expect(useCase.execute({ deliveryId: 'del-1', status: 'picked_up' })).rejects.toThrow('Invalid status transition');
    });

    it('should handle valid transitions', async () => {
        const transitions = [
            { from: 'assigned', to: 'picked_up' },
            { from: 'picked_up', to: 'in_transit' },
            { from: 'in_transit', to: 'delivered' },
        ];
        for (const { from, to } of transitions) {
            jest.clearAllMocks();
            mockRepository.findById.mockResolvedValue({ ...mockDelivery, status: from });
            await useCase.execute({ deliveryId: 'del-1', status: to });
            expect(mockRepository.updateStatus).toHaveBeenCalled();
        }
    });

    it('should include notes in metadata', async () => {
        await useCase.execute({ deliveryId: 'del-1', status: 'picked_up', notes: 'Package collected' });
        expect(mockRepository.updateStatus).toHaveBeenCalledWith('del-1', 'picked_up', expect.objectContaining({ notes: 'Package collected' }));
    });
});

describe('InitiateCODDeliveryUseCase', () => {
    let useCase: InitiateCODDeliveryUseCase;
    let mockRepository: any;
    let mockSaga: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRepository = { findById: jest.fn().mockResolvedValue({ id: 'del-1', isCOD: true, orderId: 'order-1', buyerId: 'buyer-1', sellerId: 'seller-1', codAmount: 50000, codCurrency: 'TZS' }) };
        mockSaga = { start: jest.fn() };
        useCase = new InitiateCODDeliveryUseCase(mockRepository, mockSaga);
    });

    it('should initiate COD delivery successfully', async () => {
        await useCase.execute({ deliveryId: 'del-1' });
        expect(mockSaga.start).toHaveBeenCalled();
    });

    it('should fail when delivery not found', async () => {
        mockRepository.findById.mockResolvedValue(null);
        await expect(useCase.execute({ deliveryId: 'invalid' })).rejects.toThrow('not found');
    });

    it('should fail when not COD delivery', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'del-1', isCOD: false });
        await expect(useCase.execute({ deliveryId: 'del-1' })).rejects.toThrow('not a COD order');
    });
});

describe('VerifyCODDeliveryUseCase', () => {
    let useCase: VerifyCODDeliveryUseCase;
    let mockRepository: any;
    let mockEngine: any;
    let mockSaga: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRepository = { findById: jest.fn().mockResolvedValue({ id: 'del-1', isCOD: true, orderId: 'order-1', buyerId: 'buyer-1', sellerId: 'seller-1', otp: '123456', otpExpiresAt: new Date(Date.now() + 3600000) }) };
        mockEngine = {};
        mockSaga = { start: jest.fn() };
        useCase = new VerifyCODDeliveryUseCase(mockRepository, mockEngine, mockSaga);
    });

    it('should verify COD delivery successfully', async () => {
        await useCase.execute({ deliveryId: 'del-1', otp: '123456', location: { lat: -6.8, lng: 39.28 } as any });
        expect(mockSaga.start).toHaveBeenCalled();
    });

    it('should fail when delivery not found', async () => {
        mockRepository.findById.mockResolvedValue(null);
        await expect(useCase.execute({ deliveryId: 'invalid', otp: '123456', location: {} as any })).rejects.toThrow('not found');
    });

    it('should fail when not COD delivery', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'del-1', isCOD: false });
        await expect(useCase.execute({ deliveryId: 'del-1', otp: '123456', location: {} as any })).rejects.toThrow('not a COD order');
    });
});
