import { CalculateRouteUseCase } from '../calculate-route.use-case';

const mockAdapter = {
  calculateRoute: jest.fn()
} as any;

describe('CalculateRouteUseCase', () => {
  let useCase: CalculateRouteUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CalculateRouteUseCase(mockAdapter);
  });

  it('should calculate route', async () => {
    mockAdapter.calculateRoute.mockResolvedValue({
      distance: 100,
      duration: 3600,
      polyline: 'encoded_polyline'
    });

    const result = await useCase.execute({
      origin: { lat: 40.7128, lng: -74.0060 },
      destination: { lat: 34.0522, lng: -118.2437 }
    });

    expect(result.distance).toBe(100);
    expect(result.duration).toBe(3600);
  });

  it('should handle route not found', async () => {
    mockAdapter.calculateRoute.mockRejectedValue(new Error('No route found'));

    await expect(useCase.execute({
      origin: { lat: 0, lng: 0 },
      destination: { lat: 0, lng: 0 }
    })).rejects.toThrow('No route found');
  });
});
