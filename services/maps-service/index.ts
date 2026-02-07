import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { MapsRegistry } from './src/infrastructure/registry';
import { GoogleMapsRoutingAdapter } from './src/infrastructure/providers/google-maps.adapter';
import { RealTimeTrackingAdapter } from './src/infrastructure/providers/tracking.adapter';
import { TrafficProviderAdapter } from './src/infrastructure/providers/traffic-provider.adapter';
import { WeatherProviderAdapter } from './src/infrastructure/providers/weather-provider.adapter';
import { apiRouter } from './src/api/routes';

export const MapsModule: Module = {
    name: 'maps-service',
    initialize: async () => {
        console.log('Initializing maps-service module');

        const registry = MapsRegistry.getInstance();

        // Initialize providers
        const googleApiKey = process.env.GOOGLE_MAPS_API_KEY || 'DEVELOPMENT_MODE';
        const openWeatherApiKey = process.env.OPENWEATHER_API_KEY;

        registry.registerRoutingProvider(new GoogleMapsRoutingAdapter(googleApiKey));
        registry.registerTrackingProvider(new RealTimeTrackingAdapter());
        registry.registerTrafficProvider(new TrafficProviderAdapter(googleApiKey));
        registry.registerWeatherProvider(new WeatherProviderAdapter(openWeatherApiKey));

        console.log('✅ Maps Service providers initialized');
    },
    routes: apiRouter,
    shutdown: async () => {
        console.log('Shutting down maps-service module');
    }
};
