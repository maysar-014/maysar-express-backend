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
  'GOOGLE_OAUTH_CLIENT_ID',
  'GOOGLE_OAUTH_CLIENT_SECRET',
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

const DEFAULT_STAGING_BASE_URL = 'https://api-staging.maysar.co.tz';
const GOOGLE_OAUTH_CALLBACK_PATH = '/api/auth/oauth/callback';
const GOOGLE_OAUTH_CALLBACK_PATHS = new Set([
  '/api/auth/oauth/callback',
  '/api/v1/auth/oauth/callback'
]);

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

const resolveBaseUrl = () => {
  const explicitBaseUrl = (parsed.BASE_URL || parsed.PLATFORM_BASE_URL || '').trim();
  if (explicitBaseUrl) {
    return explicitBaseUrl;
  }

  return DEFAULT_STAGING_BASE_URL;
};

const resolveGoogleOAuthCallbackUrl = () => {
  const explicitCallbackUrl = (parsed.GOOGLE_OAUTH_CALLBACK_URL || '').trim();
  const baseUrl = resolveBaseUrl();

  try {
    if (explicitCallbackUrl) {
      return new URL(explicitCallbackUrl).toString();
    }

    return new URL(GOOGLE_OAUTH_CALLBACK_PATH, baseUrl).toString();
  } catch {
    return null;
  }
};

const nonLocalUrls = ['BASE_URL', 'DATABASE_URL', 'REDIS_URL'];
for (const key of nonLocalUrls) {
  const value = parsed[key] || '';
  if (/localhost|127\.0\.0\.1/i.test(value)) {
    issues.push(`${key} must not use localhost/127.0.0.1 for staging`);
  }
}

const effectiveGoogleOAuthCallbackUrl = resolveGoogleOAuthCallbackUrl();
if (!effectiveGoogleOAuthCallbackUrl) {
  issues.push('GOOGLE_OAUTH_CALLBACK_URL must be a valid URL');
} else {
  try {
    const callbackUrl = new URL(effectiveGoogleOAuthCallbackUrl);
    const baseUrl = new URL(resolveBaseUrl());

    if (/localhost|127\.0\.0\.1/i.test(callbackUrl.hostname)) {
      issues.push('GOOGLE_OAUTH_CALLBACK_URL must not use localhost/127.0.0.1 for staging');
    }

    if (!GOOGLE_OAUTH_CALLBACK_PATHS.has(callbackUrl.pathname)) {
      issues.push('GOOGLE_OAUTH_CALLBACK_URL must point to /api/auth/oauth/callback in staging');
    }

    if (callbackUrl.origin !== baseUrl.origin) {
      issues.push('GOOGLE_OAUTH_CALLBACK_URL must share the same origin as BASE_URL in staging');
    }
  } catch {
    issues.push('GOOGLE_OAUTH_CALLBACK_URL must be a valid URL');
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
