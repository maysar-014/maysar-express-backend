import 'reflect-metadata';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.test if it exists
dotenv.config({ path: path.resolve(__dirname, '../../../../.env.test') });

// Global setup for auth-service
beforeAll(async () => {
  // Setup logic here
});

afterAll(async () => {
  // Teardown logic here
});
