#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const INTEGRATION_PATH_MARKERS = [
  '/tests/integration/',
  '/__tests__/integration/',
  '.integration.test.ts',
  '.integration.spec.ts'
];

function toUnix(value) {
  return value.replace(/\\/g, '/');
}

function isIntegrationPath(filePath) {
  const normalized = toUnix(filePath).toLowerCase();
  return INTEGRATION_PATH_MARKERS.some(marker => normalized.includes(marker));
}

function runTsc() {
  const npxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  return spawnSync(npxBin, ['tsc', '-p', 'tsconfig.integration-tests.json', '--noEmit', '--pretty', 'false'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024
  });
}

function parseTscErrors(output) {
  const lines = output.split(/\r?\n/);
  const errorLineRegex = /^(.+?\.(?:ts|tsx))\((\d+),(\d+)\): error TS\d+: (.+)$/;
  const errors = [];

  for (const line of lines) {
    const match = line.match(errorLineRegex);
    if (!match) {
      continue;
    }

    const filePath = match[1].trim();
    const normalizedPath = toUnix(path.isAbsolute(filePath) ? path.relative(ROOT, filePath) : filePath);
    errors.push({
      file: normalizedPath,
      line: Number(match[2]),
      column: Number(match[3]),
      message: match[4].trim(),
      raw: line
    });
  }

  return errors;
}

function main() {
  const result = runTsc();
  const combinedOutput = `${result.stdout || ''}\n${result.stderr || ''}`;
  const allErrors = parseTscErrors(combinedOutput);
  const integrationErrors = allErrors.filter(error => isIntegrationPath(error.file));

  if (integrationErrors.length > 0) {
    console.error('Integration TypeScript guard failed. Errors in integration tests:');
    for (const error of integrationErrors) {
      console.error(`- ${error.file}:${error.line}:${error.column} ${error.message}`);
    }
    process.exit(1);
  }

  if (result.status !== 0) {
    console.log('Integration TypeScript guard passed.');
    console.log('Note: TypeScript reported non-integration errors elsewhere in the repository.');
    process.exit(0);
  }

  console.log('Integration TypeScript guard passed with zero TypeScript errors.');
}

main();
