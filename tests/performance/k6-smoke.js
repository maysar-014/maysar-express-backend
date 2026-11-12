import http from 'k6/http';
import { check, sleep, fail } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ============================================================================
// Maysar Engineering — Load Test Configuration
// Governing Document: Maysar Engineering Constitution v1.0
//   - Article 21: Performance Measurement
//   - Article 22: Adaptive Performance Standards
//   - Article 23: Regression Prevention — Load tests
//
// Performance budgets:
//   - p(95) response time < 500ms
//   - p(99) response time < 1000ms
//   - Error rate < 5%
// ============================================================================

const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const successCount = new Counter('success_count');
const failureCount = new Counter('failure_count');

export const options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '5m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_request_duration: ['p(95)<500', 'p(99)<1000'],
    errors: ['rate<0.05'],
    http_req_failed: ['rate<0.05'],
  },
  discardResponseBodies: true,
  ext: {
    loadimpact: {
      projectID: 0,
      name: 'Maysar Production Load Test',
    },
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
    'health response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  const readyRes = http.get(`${BASE_URL}/ready`);
  check(readyRes, {
    'ready status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  responseTime.add(healthRes.timings.duration);
  if (healthRes.status === 200) {
    successCount.add(1);
  } else {
    failureCount.add(1);
  }

  sleep(1);
}

export function teardown(data) {
  console.log(`Load test completed. Success: ${successCount.values.count}, Failures: ${failureCount.values.count}`);
  console.log(`Error rate: ${(errorRate.values.rate * 100).toFixed(2)}%`);
  console.log(`95th percentile response time: ${responseTime.values['p(95)']}ms`);

  if (errorRate.values.rate > 0.05) {
    fail('Error rate exceeds 5% threshold');
  }
}
