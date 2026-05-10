#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = process.cwd();
const distEntry = path.join(repoRoot, 'dist', 'src', 'main.js');
const mode = (process.env.DOCKER_DEV_MODE || 'compiled').trim().toLowerCase();

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });

  if (result.error) {
    console.error(`[dev-container-start] failed to run ${command}: ${result.error.message}`);
    process.exit(1);
  }

  process.exit(result.status ?? 0);
}

function ensureCompiledOutput() {
  if (fs.existsSync(distEntry)) {
    return;
  }

  console.log('[dev-container-start] dist output missing, running npm run build once');
  const buildResult = spawnSync('npm', ['run', 'build'], { stdio: 'inherit' });

  if (buildResult.error) {
    console.error(`[dev-container-start] build failed: ${buildResult.error.message}`);
    process.exit(1);
  }

  if ((buildResult.status ?? 1) !== 0) {
    process.exit(buildResult.status ?? 1);
  }

  if (!fs.existsSync(distEntry)) {
    console.error('[dev-container-start] build completed but dist/src/main.js is still missing');
    process.exit(1);
  }
}

if (mode === 'tsx') {
  console.log('[dev-container-start] starting Docker dev container in tsx mode');
  run('npx', ['tsx', 'src/main.ts']);
}

ensureCompiledOutput();
console.log('[dev-container-start] starting Docker dev container in compiled mode');
run('node', ['dist/src/main.js']);
