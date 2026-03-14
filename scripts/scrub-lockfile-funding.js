#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const BANNED_PAYMENT_KEYWORDS = [
  'paypal',
  'stripe',
  'flutterwave',
  'paystack',
  'adyen',
  'braintree',
  'razorpay',
  'authorize.net',
  'checkout.com'
];

const REPO_ROOT = path.resolve(__dirname, '..');
const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage']);

function discoverLockfiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const lockfiles = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) {
        continue;
      }

      lockfiles.push(...discoverLockfiles(path.join(dir, entry.name)));
      continue;
    }

    if (entry.isFile() && entry.name === 'package-lock.json') {
      lockfiles.push(path.join(dir, entry.name));
    }
  }

  return lockfiles;
}

function fundingContainsBannedProvider(fundingValue) {
  const payload = JSON.stringify(fundingValue).toLowerCase();
  return BANNED_PAYMENT_KEYWORDS.some((keyword) => payload.includes(keyword));
}

function scrubFundingMetadata(node) {
  if (!node || typeof node !== 'object') {
    return 0;
  }

  let removedCount = 0;

  if (Object.prototype.hasOwnProperty.call(node, 'funding')) {
    if (fundingContainsBannedProvider(node.funding)) {
      delete node.funding;
      removedCount += 1;
    }
  }

  const children = Array.isArray(node) ? node : Object.values(node);
  for (const child of children) {
    removedCount += scrubFundingMetadata(child);
  }

  return removedCount;
}

function scrubLockfile(lockfilePath) {
  const raw = fs.readFileSync(lockfilePath, 'utf8');
  const data = JSON.parse(raw);
  const removedCount = scrubFundingMetadata(data);

  if (removedCount > 0) {
    fs.writeFileSync(lockfilePath, `${JSON.stringify(data, null, 2)}\n`);
  }

  return removedCount;
}

function main() {
  const lockfiles = discoverLockfiles(REPO_ROOT);

  if (lockfiles.length === 0) {
    console.log('[lockfile-scrub] No lockfiles found');
    return;
  }

  let totalRemoved = 0;
  for (const lockfilePath of lockfiles) {
    try {
      const removedCount = scrubLockfile(lockfilePath);
      totalRemoved += removedCount;
      const relativePath = path.relative(REPO_ROOT, lockfilePath);
      console.log(`[lockfile-scrub] ${relativePath}: removed ${removedCount} funding entries`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[lockfile-scrub] Failed for ${lockfilePath}: ${message}`);
      process.exitCode = 1;
    }
  }

  if (process.exitCode && process.exitCode !== 0) {
    return;
  }

  console.log(`[lockfile-scrub] Completed. Total funding entries removed: ${totalRemoved}`);
}

main();
