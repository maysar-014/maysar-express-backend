#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = process.cwd();
const cacheFile = path.join(repoRoot, '.cache', 'docker', 'docker-up.hash');
const imageRef = 'maysar-backend:latest';
const dryRun = process.argv.includes('--dry-run') || process.env.DOCKER_UP_DRY_RUN === '1';

const trackedFiles = [
  'package.json',
  'package-lock.json',
  'Dockerfile',
  'docker-compose.yml',
  'docker-compose.override.yml',
  '.dockerignore'
];

function readTrackedFile(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return null;
  }
  return fs.readFileSync(absolutePath);
}

function buildFingerprint() {
  const hash = crypto.createHash('sha256');

  for (const relativePath of trackedFiles) {
    hash.update(relativePath);
    hash.update('\0');

    const fileContents = readTrackedFile(relativePath);
    if (fileContents === null) {
      hash.update('missing');
    } else {
      hash.update(fileContents);
    }

    hash.update('\0');
  }

  return hash.digest('hex');
}

function readCachedFingerprint() {
  if (!fs.existsSync(cacheFile)) {
    return null;
  }

  const cached = fs.readFileSync(cacheFile, 'utf8').trim();
  return cached || null;
}

function writeCachedFingerprint(fingerprint) {
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(cacheFile, `${fingerprint}\n`);
}

function runDocker(args) {
  const result = spawnSync('docker', args, { stdio: 'inherit' });

  if (result.error) {
    console.error(`[docker:up] failed to run docker: ${result.error.message}`);
    return { status: 1 };
  }

  return result;
}

function imageExists() {
  const result = spawnSync('docker', ['image', 'inspect', imageRef], {
    stdio: 'ignore'
  });

  return result.status === 0;
}

const currentFingerprint = buildFingerprint();
const cachedFingerprint = readCachedFingerprint();
const cachedImageExists = dryRun
  ? cachedFingerprint === currentFingerprint && cachedFingerprint !== null
  : imageExists();

const needsBuild =
  cachedFingerprint !== currentFingerprint ||
  !cachedImageExists;

console.log(
  `[docker:up] ${needsBuild ? 'rebuilding image' : 'using cached image'}${dryRun ? ' (dry run)' : ''}`
);

if (dryRun) {
  console.log(
    `[docker:up] would run: docker compose up -d ${needsBuild ? '--build' : '--no-build'}`
  );
  process.exit(0);
}

const dockerArgs = ['compose', 'up', '-d', ...(needsBuild ? ['--build'] : ['--no-build'])];
const result = runDocker(dockerArgs);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

if (needsBuild) {
  writeCachedFingerprint(currentFingerprint);
}

console.log('[docker:up] done');
