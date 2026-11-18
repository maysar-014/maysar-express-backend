const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const TEST_ENV_PATH = path.resolve(__dirname, '../.env.test');
const SAFE_MARKERS = [
  'test',
  'mock',
  'dummy',
  'fake',
  'sandbox',
  'example',
  'localhost',
  '127.0.0.1',
  '::1',
];
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'redis', 'postgres', 'db']);

function normalize(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function mask(value) {
  if (!value) return '<empty>';
  if (value.length <= 8) return '***';
  return `${value.slice(0, 3)}***${value.slice(-2)}`;
}

function hasSafeMarker(value) {
  const normalized = normalize(value).toLowerCase();
  if (!normalized) return true;
  return SAFE_MARKERS.some((marker) => normalized.includes(marker));
}

function isLocalHost(hostname) {
  const normalized = normalize(hostname).toLowerCase();
  if (!normalized) return false;
  return (
    LOCAL_HOSTS.has(normalized) ||
    normalized.endsWith('.local') ||
    normalized.endsWith('.test')
  );
}

function isSafeUrl(value, options = {}) {
  const normalized = normalize(value);
  if (!normalized) return true;

  const { allowedHosts = [], allowedPatterns = [] } = options;

  try {
    const parsed = new URL(normalized);
    const hostname = parsed.hostname.toLowerCase();
    if (isLocalHost(hostname)) return true;
    if (allowedHosts.map((host) => host.toLowerCase()).includes(hostname)) return true;
    if (allowedPatterns.some((pattern) => pattern.test(normalized))) return true;
    return hasSafeMarker(normalized);
  } catch {
    return hasSafeMarker(normalized);
  }
}

function addViolation(violations, name, value, reason) {
  violations.push(`${name}=${mask(value)} (${reason})`);
}

function validateCredentials(originalNodeEnv) {
  const violations = [];

  if (normalize(originalNodeEnv).toLowerCase() === 'production') {
    addViolation(
      violations,
      'NODE_ENV',
      originalNodeEnv,
      'tests started in production mode',
    );
  }

  const safeUrlRules = [
    ['DATABASE_URL', {}, 'must use local/test database endpoint'],
    ['REDIS_URL', {}, 'must use local/test redis endpoint'],
    ['BASE_URL', {}, 'must use local/test callback endpoint'],
    ['JAEGER_ENDPOINT', {}, 'must use local/test tracing endpoint'],
    [
      'PAYMENT_GATEWAY_URL',
      { allowedPatterns: [/api\.paymentGateway\.com/i, /sandbox/i] },
      'must point to PaymentGateway API or sandbox endpoint',
    ],
  ];

  safeUrlRules.forEach(([name, options, reason]) => {
    const value = process.env[name];
    if (!normalize(value)) return;
    if (!isSafeUrl(value, options)) {
      addViolation(violations, name, value, reason);
    }
  });

  const safeHostRules = [
    ['CATALOG_SERVICE_DB_HOST', 'must use local/test database host'],
    ['SMTP_HOST', 'must use local/test mail host'],
  ];

  safeHostRules.forEach(([name, reason]) => {
    const value = normalize(process.env[name]);
    if (!value) return;
    if (!isLocalHost(value) && !hasSafeMarker(value)) {
      addViolation(violations, name, value, reason);
    }
  });

  const sensitiveRules = [
    ['JWT_SECRET', hasSafeMarker, 'must be a test-only secret'],
    ['USER_SERVICE_JWT_SECRET', hasSafeMarker, 'must be a test-only secret'],
    ['AUTH_SERVICE_SESSION_SECRET', hasSafeMarker, 'must be a test-only secret'],
    ['PAYMENT_GATEWAY_CONSUMER_KEY', hasSafeMarker, 'must be test/sandbox key'],
    ['PAYMENT_GATEWAY_API_KEY', hasSafeMarker, 'must be test/sandbox api key'],
    ['SMS_PROVIDER', hasSafeMarker, 'must be test-only SMS provider'],
    ['SMS_API_KEY', hasSafeMarker, 'must be test-only SMS api key'],
    ['SMS_SENDER_ID', hasSafeMarker, 'must be test-only SMS sender id'],
    ['SMTP_USER', hasSafeMarker, 'must be a test-only account'],
    ['SMTP_PASS', hasSafeMarker, 'must be a test-only credential'],
    ['PUSH_PROJECT_ID', hasSafeMarker, 'must be test-only push project id'],
    ['PUSH_PRIVATE_KEY', hasSafeMarker, 'must be test-only push private key'],
    ['PUSH_CLIENT_EMAIL', hasSafeMarker, 'must be test-only push client email'],
    ['PUSH_SERVER_KEY', hasSafeMarker, 'must be test-only push server key'],
    [
      'PAYMENT_GATEWAY_SECRET_KEY',
      (value) => /^PAYMENT_GATEWAY_TEST/i.test(value) || hasSafeMarker(value),
      'must be PaymentGateway test key',
    ],
    [
      'PAYMENT_GATEWAY_WEBHOOK_SECRET',
      (value) => hasSafeMarker(value) || /^PAYMENT_GATEWAY_TEST/i.test(value),
      'must be PaymentGateway test webhook secret',
    ],
    ['PAYMENT_GATEWAY_SECRET_HASH', hasSafeMarker, 'must be PaymentGateway test secret hash'],
    ['SENTRY_DSN', hasSafeMarker, 'must be empty or test/local DSN'],
    [
      'AWS_ACCESS_KEY_ID',
      (value) => hasSafeMarker(value) || /^TEST/i.test(value),
      'must be test-only AWS key',
    ],
    ['AWS_SECRET_ACCESS_KEY', hasSafeMarker, 'must be test-only AWS secret'],
    ['PII_ENCRYPTION_KEY', hasSafeMarker, 'must be test-only encryption key'],
    ['PII_HMAC_SECRET', hasSafeMarker, 'must be test-only hmac secret'],
  ];

  sensitiveRules.forEach(([name, predicate, reason]) => {
    const value = normalize(process.env[name]);
    if (!value) return;
    if (!predicate(value)) {
      addViolation(violations, name, value, reason);
    }
  });

  if (violations.length > 0) {
    throw new Error(
      [
        '[TEST ENV SAFETY GATE] Refusing to run tests with production-like credentials.',
        'Copy .env.test.example to .env.test and keep only test/sandbox values.',
        'Offending variables:',
        ...violations.map((violation) => `- ${violation}`),
      ].join('\n'),
    );
  }
}

module.exports = async () => {
  if (fs.existsSync(TEST_ENV_PATH)) {
    dotenv.config({ path: TEST_ENV_PATH, override: false });
  }

  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  validateCredentials(originalNodeEnv);

  global.__GLOBAL_RESOURCES__ = [];
};


