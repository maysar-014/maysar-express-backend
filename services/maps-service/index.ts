import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { MapsRegistry } from './src/infrastructure/registry';
import { GoogleMapsRoutingAdapter } from './src/infrastructure/providers/google-maps.adapter';
import { HaversineRoutingAdapter } from './src/infrastructure/providers/haversine-routing.adapter';
import { RealTimeTrackingAdapter } from './src/infrastructure/providers/tracking.adapter';
import { TrafficProviderAdapter } from './src/infrastructure/providers/traffic-provider.adapter';
import { WeatherProviderAdapter } from './src/infrastructure/providers/weather-provider.adapter';
import { apiRouter } from './src/api/routes';
import { appLogger } from '../../shared/logger/logger';

export const MapsModule: Module = {
    name: 'maps-service',
    initialize: async () => {
        appLogger.info('Initializing maps-service module');

        const registry = MapsRegistry.getInstance();

        const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
        const openWeatherApiKey = process.env.OPENWEATHER_API_KEY;

        // Use Google Maps when a real key is configured; fall back to Haversine
        // straight-line estimation for development and lifecycle verification.
        // The Haversine adapter is intentionally simple — use Google Maps in production.
        let routingProvider;
        if (googleApiKey && googleApiKey !== 'DEVELOPMENT_MODE' && googleApiKey !== 'your_google_maps_api_key_here') {
            try {
                routingProvider = new GoogleMapsRoutingAdapter(googleApiKey);
                appLogger.info('Maps Service: using Google Maps routing provider');
            } catch (err: any) {
                appLogger.warn(`Maps Service: Google Maps init failed (${err?.message}) — falling back to Haversine`);
                routingProvider = new HaversineRoutingAdapter();
            }
        } else {
            routingProvider = new HaversineRoutingAdapter();
            appLogger.info('Maps Service: GOOGLE_MAPS_API_KEY not set — using Haversine fallback routing');
        }

        registry.registerRoutingProvider(routingProvider);
        registry.registerTrackingProvider(new RealTimeTrackingAdapter());
        registry.registerTrafficProvider(new TrafficProviderAdapter(googleApiKey || 'DEVELOPMENT_MODE'));
        registry.registerWeatherProvider(new WeatherProviderAdapter(openWeatherApiKey));

        appLogger.info('✅ Maps Service providers initialized');
    },
    routes: apiRouter,
    shutdown: async () => {
        appLogger.info('Shutting down maps-service module');
    }
};
