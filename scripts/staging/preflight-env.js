#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envFileArg = process.argv[2] || '.env.staging';
const envFilePath = path.resolve(process.cwd(), envFileArg);

const REQUIRED_KEYS = [
  'NODE_ENV',
  'PORT',
  'BASE_URL',
  'DATABASE_URL',
  'REDIS_URL',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'POSTGRES_DB',
  'REDIS_PASSWORD',
  'JWT_SECRET',
  'USER_SERVICE_JWT_SECRET',
  'AUTH_SERVICE_SESSION_SECRET',
  'CATALOG_SERVICE_DB_HOST',
  'CATALOG_SERVICE_DB_PORT',
  'CATALOG_SERVICE_DB_NAME',
  'CATALOG_SERVICE_DB_USER',
  'CATALOG_SERVICE_DB_PASSWORD',
  'SMS_SERVICE_PROVIDER',
  'SMS_PROVIDER',
  'SMS_SERVICE_API_KEY',
  'AFRICASTALKING_USERNAME',
  'AFRICASTALKING_API_KEY',
  'PESAPAL_CONSUMER_KEY',
  'PESAPAL_CONSUMER_SECRET',
  'PESAPAL_IPN_ID',
  'PESAPAL_URL'
];

const SECRET_KEYS = [
  'POSTGRES_PASSWORD',
  'REDIS_PASSWORD',
  'JWT_SECRET',
  'USER_SERVICE_JWT_SECRET',
  'AUTH_SERVICE_SESSION_SECRET',
  'CATALOG_SERVICE_DB_PASSWORD',
  'SMS_SERVICE_API_KEY',
  'AFRICASTALKING_API_KEY',
  'PESAPAL_CONSUMER_SECRET',
  'PESAPAL_IPN_ID'
];

const PLACEHOLDER_MARKERS = [
  '<from-secret-manager>',
  '<db-password>',
  'your-',
  'changeme',
  'replace-me',
  'test_',
  'example',
  'placeholder'
];

function fail(message, details) {
  console.error(`\n[staging-preflight] ${message}`);
  for (const detail of details) {
    console.error(`  - ${detail}`);
  }
  process.exit(1);
}

if (!fs.existsSync(envFilePath)) {
  fail(`Env file not found: ${envFilePath}`, [
    'Copy .env.staging.example to .env.staging and fill staging values.'
  ]);
}

const parsed = dotenv.parse(fs.readFileSync(envFilePath));
const missing = REQUIRED_KEYS.filter((key) => !parsed[key] || parsed[key].trim() === '');
if (missing.length > 0) {
  fail('Missing required staging environment variables', missing);
}

const issues = [];

if (parsed.NODE_ENV !== 'staging') {
  issues.push(`NODE_ENV must be "staging", got "${parsed.NODE_ENV}"`);
}

if (parsed.SMS_SERVICE_PROVIDER !== 'africastalking') {
  issues.push(`SMS_SERVICE_PROVIDER must be "africastalking", got "${parsed.SMS_SERVICE_PROVIDER}"`);
}

if (parsed.SMS_PROVIDER !== 'africastalking') {
  issues.push(`SMS_PROVIDER must be "africastalking", got "${parsed.SMS_PROVIDER}"`);
}

if (parsed.PESAPAL_URL && !/pesapal/i.test(parsed.PESAPAL_URL)) {
  issues.push('PESAPAL_URL must point to a Pesapal endpoint');
}

const nonLocalUrls = ['BASE_URL', 'DATABASE_URL', 'REDIS_URL'];
for (const key of nonLocalUrls) {
  const value = parsed[key] || '';
  if (/localhost|127\.0\.0\.1/i.test(value)) {
    issues.push(`${key} must not use localhost/127.0.0.1 for staging`);
  }
}

for (const key of SECRET_KEYS) {
  const value = (parsed[key] || '').toLowerCase();
  if (!value) {
    continue;
  }

  if (PLACEHOLDER_MARKERS.some((marker) => value.includes(marker))) {
    issues.push(`${key} appears to contain a placeholder value`);
  }
}

if (issues.length > 0) {
  fail('Staging preflight validation failed', issues);
}

console.log('[staging-preflight] OK');
console.log(`[staging-preflight] Validated ${envFileArg}`);
