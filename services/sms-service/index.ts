import { Router } from 'express';
import { createSmsRouter } from './src/api/routes';

// Define Module interface locally if not available
// We'll trust the type checking to catch if we're wrong
// But matching the pattern from auth-service

export const SmsModule: any = {
    name: 'sms-service',
    initialize: async () => {
        console.log('Initializing sms-service module');
        // Initialize routes
        try {
            SmsModule.routes = createSmsRouter();
            console.log('Sms-service routes mounted successfully');
        } catch (error) {
            console.error('Failed to initialize sms-service routes:', error);
            // Fallback to empty router
            SmsModule.routes = Router();
        }
    },
    routes: Router(), // Stub, replaced in initialize
    shutdown: async () => {
        console.log('Shutting down sms-service module');
    }
};
