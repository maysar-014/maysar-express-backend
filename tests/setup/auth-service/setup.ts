import 'reflect-metadata';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.test if it exists
dotenv.config({ path: path.resolve(__dirname, '../../../../.env.test') });

// Some auth unit tests import the user-service facade indirectly.
// Seed the test-only PII keys here so those imports stay self-contained.
process.env.PII_ENCRYPTION_KEY = process.env.PII_ENCRYPTION_KEY || 'test-pii-encryption-key-for-user-service';
process.env.PII_HMAC_SECRET = process.env.PII_HMAC_SECRET || 'test-pii-hmac-secret-for-user-service';

// Global setup for auth-service
beforeAll(async () => {
  // Setup logic here
});

afterAll(async () => {
  // Teardown logic here
});
