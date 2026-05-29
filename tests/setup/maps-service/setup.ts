import 'reflect-metadata';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.test if it exists
dotenv.config({ path: path.resolve(__dirname, '../../../../.env.test') });

// Mock prom-client to prevent collectDefaultMetrics from starting a background
// interval that keeps the Jest worker alive after tests complete.
jest.mock('prom-client', () => ({
  Registry: jest.fn().mockImplementation(() => ({
    registerMetric: jest.fn(),
    setDefaultLabels: jest.fn(),
    clear: jest.fn(),
    metrics: jest.fn().mockResolvedValue(''),
    getMetricsAsJSON: jest.fn().mockReturnValue([]),
    removeSingleMetric: jest.fn(),
    getSingleMetric: jest.fn(),
  })),
  register: {
    clear: jest.fn(),
    getMetricsAsJSON: jest.fn().mockReturnValue([]),
    metrics: jest.fn().mockResolvedValue(''),
    removeSingleMetric: jest.fn(),
    getSingleMetric: jest.fn(),
  },
  collectDefaultMetrics: jest.fn(), // no-op — prevents background interval
  Gauge: jest.fn().mockImplementation(() => ({
    set: jest.fn(), inc: jest.fn(), dec: jest.fn(),
    labels: jest.fn().mockReturnThis(), observe: jest.fn(),
  })),
  Histogram: jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    startTimer: jest.fn().mockReturnValue(jest.fn()),
    labels: jest.fn().mockReturnThis(),
  })),
  Counter: jest.fn().mockImplementation(() => ({
    inc: jest.fn(),
    labels: jest.fn().mockReturnThis(),
  })),
}));

// Global setup for maps-service
beforeAll(async () => {
  // Setup logic here
});

afterAll(async () => {
  // Teardown logic here
});
