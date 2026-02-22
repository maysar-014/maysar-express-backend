import { GeocodeAddressUseCase } from '../geocode-address.use-case';

const mockAdapter = {
  geocode: jest.fn()
} as any;

describe('GeocodeAddressUseCase', () => {
  let useCase: GeocodeAddressUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GeocodeAddressUseCase(mockAdapter);
  });

  it('should geocode address', async () => {
    mockAdapter.geocode.mockResolvedValue({
      latitude: 40.7128,
      longitude: -74.0060
    });

    const result = await useCase.execute({
      address: '123 Main St, New York, NY'
    });

    expect(result.latitude).toBe(40.7128);
    expect(mockAdapter.geocode).toHaveBeenCalled();
  });

  it('should handle invalid address', async () => {
    mockAdapter.geocode.mockRejectedValue(new Error('Address not found'));

    await expect(useCase.execute({
      address: 'Invalid Address'
    })).rejects.toThrow('Address not found');
  });
});
