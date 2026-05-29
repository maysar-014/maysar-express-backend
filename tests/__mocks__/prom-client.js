/**
 * prom-client mock for Jest
 *
 * Prevents collectDefaultMetrics() from starting a background interval
 * that keeps the Jest worker process alive after tests complete.
 * Used by maps-service and any other service that imports prom-client
 * indirectly through the shared metrics factory.
 */

const mockMetric = () => ({
  set: jest.fn(),
  inc: jest.fn(),
  dec: jest.fn(),
  observe: jest.fn(),
  startTimer: jest.fn().mockReturnValue(jest.fn()),
  labels: jest.fn().mockReturnThis(),
  reset: jest.fn(),
});

const mockRegistry = () => ({
  registerMetric: jest.fn(),
  setDefaultLabels: jest.fn(),
  clear: jest.fn(),
  metrics: jest.fn().mockResolvedValue(''),
  getMetricsAsJSON: jest.fn().mockReturnValue([]),
  removeSingleMetric: jest.fn(),
  getSingleMetric: jest.fn().mockReturnValue(undefined),
  getMetricAsPrometheusString: jest.fn().mockResolvedValue(''),
});

module.exports = {
  Registry: jest.fn().mockImplementation(mockRegistry),
  register: mockRegistry(),
  collectDefaultMetrics: jest.fn(), // no-op — prevents background interval
  Gauge: jest.fn().mockImplementation(mockMetric),
  Counter: jest.fn().mockImplementation(mockMetric),
  Histogram: jest.fn().mockImplementation(mockMetric),
  Summary: jest.fn().mockImplementation(mockMetric),
};
