#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = process.cwd();
const schemaPath = path.join(rootDir, 'prisma', 'schema.prisma');
const prismaCliPath = path.join(rootDir, 'node_modules', 'prisma', 'build', 'index.js');
const prismaEnginesPath = path.join(rootDir, 'node_modules', '@prisma', 'engines');

const dryRun = process.argv.includes('--dry-run');
const maxAttempts = Number(
  process.env.DEPLOY_MIGRATE_MAX_ATTEMPTS || process.env.RAILWAY_MIGRATE_MAX_ATTEMPTS || 5
);
const baseDelayMs = Number(
  process.env.DEPLOY_MIGRATE_BASE_DELAY_MS || process.env.RAILWAY_MIGRATE_BASE_DELAY_MS || 5000
);
const maxDelayMs = Number(
  process.env.DEPLOY_MIGRATE_MAX_DELAY_MS || process.env.RAILWAY_MIGRATE_MAX_DELAY_MS || 30000
);

const transientErrorPatterns = [
  /P1001/i,
  /P1002/i,
  /P1008/i,
  /ECONNREFUSED/i,
  /EAI_AGAIN/i,
  /ENOTFOUND/i,
  /ETIMEDOUT/i,
  /timeout/i,
  /could not connect to server/i,
  /server closed the connection/i,
  /The database server is not reachable/i
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const logPrefix = '[deploy-predeploy]';

const fail = (message) => {
  console.error(`${logPrefix} ${message}`);
  process.exit(1);
};

const assertFileExists = (filePath, label) => {
  if (!fs.existsSync(filePath)) {
    fail(`${label} not found at ${filePath}`);
  }
};

const isTransientFailure = (output) =>
  transientErrorPatterns.some((pattern) => pattern.test(output));

assertFileExists(schemaPath, 'Prisma schema');
assertFileExists(prismaCliPath, 'Prisma CLI');
assertFileExists(prismaEnginesPath, 'Prisma engines');

if (dryRun) {
  console.log(`${logPrefix} Dry run enabled`);
  console.log(
    `${logPrefix} Would run: ${process.execPath} ${prismaCliPath} migrate deploy --schema ${schemaPath}`
  );
  process.exit(0);
}

if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.trim()) {
  fail('DATABASE_URL is required for Prisma migrations');
}

const runMigrations = () => {
  const result = spawnSync(
    process.execPath,
    [prismaCliPath, 'migrate', 'deploy', '--schema', schemaPath],
    {
      cwd: rootDir,
      env: process.env,
      encoding: 'utf8'
    }
  );

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  return result;
};

const main = async () => {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    console.log(
      `${logPrefix} Applying Prisma migrations (attempt ${attempt}/${maxAttempts})`
    );

    const result = runMigrations();
    const exitCode = typeof result.status === 'number' ? result.status : 1;
    const combinedOutput = `${result.stdout || ''}\n${result.stderr || ''}`;

    if (exitCode === 0) {
      console.log(`${logPrefix} Prisma migrations applied successfully`);
      return;
    }

    const transient = isTransientFailure(combinedOutput);
    console.error(`${logPrefix} Prisma migrate deploy failed with exit code ${exitCode}`);

    if (!transient || attempt === maxAttempts) {
      process.exit(exitCode);
    }

    const backoffMs = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
    console.warn(
      `${logPrefix} Transient error detected, retrying in ${Math.round(backoffMs / 1000)}s`
    );
    await sleep(backoffMs);
  }
};

main().catch((error) => {
  console.error(`${logPrefix} Unexpected migration failure:`, error);
  process.exit(1);
});
