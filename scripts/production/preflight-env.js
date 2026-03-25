#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envFileArg = process.argv[2] || '.env.production';
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
  'PESAPAL_CONSUMER_KEY',
  'PESAPAL_CONSUMER_SECRET',
  'PESAPAL_IPN_ID',
  'PESAPAL_URL',
  'PII_ENCRYPTION_KEY',
  'PII_HMAC_SECRET',
  'MEILI_MASTER_KEY'
];

const SECRET_KEYS = [
  'POSTGRES_PASSWORD',
  'REDIS_PASSWORD',
  'JWT_SECRET',
  'USER_SERVICE_JWT_SECRET',
  'AUTH_SERVICE_SESSION_SECRET',
  'PESAPAL_CONSUMER_SECRET',
  'PESAPAL_IPN_ID',
  'PII_ENCRYPTION_KEY',
  'PII_HMAC_SECRET',
  'MEILI_MASTER_KEY'
];

const PLACEHOLDER_MARKERS = [
  '<from-secret-manager>',
  '<db-password>',
  'your-',
  'changeme',
  'replace-me',
  'placeholder',
  'example'
];

function fail(message, details) {
  console.error(`\n[production-preflight] ${message}`);
  for (const detail of details) {
    console.error(`  - ${detail}`);
  }
  process.exit(1);
}

if (!fs.existsSync(envFilePath)) {
  fail(`Env file not found: ${envFilePath}`, [
    'Provide a valid production env file before deployment.'
  ]);
}

const parsed = dotenv.parse(fs.readFileSync(envFilePath));
const missing = REQUIRED_KEYS.filter((key) => !parsed[key] || parsed[key].trim() === '');
if (missing.length > 0) {
  fail('Missing required production environment variables', missing);
}

const issues = [];

if (parsed.NODE_ENV !== 'production') {
  issues.push(`NODE_ENV must be "production", got "${parsed.NODE_ENV}"`);
}

if (parsed.PESAPAL_URL && !/pesapal/i.test(parsed.PESAPAL_URL)) {
  issues.push('PESAPAL_URL must point to a Pesapal endpoint');
}

const disallowedLocalHosts = ['BASE_URL', 'DATABASE_URL', 'REDIS_URL'];
for (const key of disallowedLocalHosts) {
  const value = parsed[key] || '';
  if (/localhost|127\.0\.0\.1/i.test(value)) {
    issues.push(`${key} must not use localhost/127.0.0.1 for production`);
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
  fail('Production preflight validation failed', issues);
}

console.log('[production-preflight] OK');
console.log(`[production-preflight] Validated ${envFileArg}`);
