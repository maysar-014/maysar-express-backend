#!/usr/bin/env node

const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const JEST_BIN = path.join(ROOT, 'node_modules', 'jest', 'bin', 'jest.js');
const JEST_CONFIG = require(path.join(ROOT, 'jest.config.js'));

const ALL_PROJECTS = (JEST_CONFIG.projects || [])
  .map(project => project.displayName)
  .filter(Boolean);

const args = process.argv.slice(2);
const requestedProjects = args
  .filter(arg => arg.startsWith('--projects='))
  .flatMap(arg => arg.replace('--projects=', '').split(','))
  .map(project => project.trim())
  .filter(Boolean);

const forwardedArgs = args.filter(arg =>
  !arg.startsWith('--projects=') &&
  arg !== '--runInBand' &&
  arg !== '--passWithNoTests'
);

const projects = requestedProjects.length > 0 ? requestedProjects : ALL_PROJECTS;

if (projects.length === 0) {
  console.error('No Jest projects were found in jest.config.js');
  process.exit(1);
}

const env = { ...process.env };
if (!env.NODE_OPTIONS) {
  env.NODE_OPTIONS = '--max-old-space-size=4096';
}

for (const projectName of projects) {
  if (!ALL_PROJECTS.includes(projectName)) {
    console.error(`Unknown Jest project: ${projectName}`);
    process.exit(1);
  }

  console.log(`\nRunning Jest project: ${projectName}`);
  const result = spawnSync(process.execPath, [
    JEST_BIN,
    `--selectProjects=${projectName}`,
    '--runInBand',
    '--passWithNoTests',
    ...forwardedArgs
  ], {
    cwd: ROOT,
    env,
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    process.exit(typeof result.status === 'number' ? result.status : 1);
  }
}
