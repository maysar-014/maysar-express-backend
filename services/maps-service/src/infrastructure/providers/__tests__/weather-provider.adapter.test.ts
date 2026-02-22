import { WeatherProviderAdapter } from '../weather-provider.adapter';
import { GeoPoint } from '../../../domain/value-objects/geopoint.value-object';

global.fetch = jest.fn();

describe('WeatherProviderAdapter', () => {
    let adapter: WeatherProviderAdapter;

    beforeEach(() => {
        jest.clearAllMocks();
        adapter = new WeatherProviderAdapter('test-key');
    });

    describe('getCurrentWeather', () => {
        it('should fetch weather successfully', async () => {
            (fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({
                    main: { temp: 25 },
                    weather: [{ main: 'Clear' }],
                    visibility: 10000,
                    wind: { speed: 5 }
                })
            });

            const location = GeoPoint.create(-1.286389, 36.817223, 'Test');
            const result = await adapter.getCurrentWeather(location);

            expect(result.temperature).toBe(25);
            expect(result.condition).toBe('clear');
        });

        it('should use fallback on API error', async () => {
            (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

            const location = GeoPoint.create(-1.286389, 36.817223, 'Test');
            const result = await adapter.getCurrentWeather(location);

            expect(result.temperature).toBe(25);
            expect(result.condition).toBe('clear');
        });
    });

    describe('getForecast', () => {
        it('should return forecast', async () => {
            (fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({
                    main: { temp: 22 },
                    weather: [{ main: 'Rain' }],
                    visibility: 8000,
                    wind: { speed: 10 }
                })
            });

            const location = GeoPoint.create(-1.286389, 36.817223, 'Test');
            const result = await adapter.getForecast(location, new Date());

            expect(result.temperature).toBeDefined();
        });
    });
});
