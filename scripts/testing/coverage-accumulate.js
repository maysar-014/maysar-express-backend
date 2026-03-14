#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const COVERAGE_ROOT = path.join(ROOT, 'coverage');
const BY_PROJECT_DIR = path.join(COVERAGE_ROOT, 'by-project');
const OUTPUT_SUMMARY = path.join(COVERAGE_ROOT, 'coverage-summary.json');
const REPORT_PATH = path.join(BY_PROJECT_DIR, 'accumulation-report.json');

const JEST_CONFIG = require(path.join(ROOT, 'jest.config.js'));
const ALL_PROJECTS = (JEST_CONFIG.projects || []).map(p => p.displayName).filter(Boolean);

const args = process.argv.slice(2);
const requestedProjects = args
  .filter(arg => arg.startsWith('--projects='))
  .flatMap(arg => arg.replace('--projects=', '').split(','))
  .map(x => x.trim())
  .filter(Boolean);

const projects = requestedProjects.length > 0 ? requestedProjects : ALL_PROJECTS;

const toWinPath = value => value.replace(/\//g, '\\');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getCoveragePattern(projectName) {
  if (projectName === 'shared') {
    return 'shared/**/*.ts';
  }
  if (projectName === 'order-service-integration') {
    return 'services/order-service/src/**/*.ts';
  }
  return `services/${projectName}/src/**/*.ts`;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function pickBetterEntry(existing, candidate) {
  if (!existing) return candidate;
  const existingPct = Number(existing.lines?.pct || 0);
  const candidatePct = Number(candidate.lines?.pct || 0);
  if (candidatePct > existingPct) return candidate;

  // Tie-break by covered lines for deterministic merges.
  const existingCovered = Number(existing.lines?.covered || 0);
  const candidateCovered = Number(candidate.lines?.covered || 0);
  return candidateCovered > existingCovered ? candidate : existing;
}

function buildTotal(entries) {
  const total = {
    lines: { total: 0, covered: 0, skipped: 0, pct: 0 },
    statements: { total: 0, covered: 0, skipped: 0, pct: 0 },
    functions: { total: 0, covered: 0, skipped: 0, pct: 0 },
    branches: { total: 0, covered: 0, skipped: 0, pct: 0 },
    branchesTrue: { total: 0, covered: 0, skipped: 0, pct: 0 }
  };

  for (const entry of Object.values(entries)) {
    for (const key of ['lines', 'statements', 'functions', 'branches', 'branchesTrue']) {
      const src = entry[key];
      if (!src) continue;
      total[key].total += Number(src.total || 0);
      total[key].covered += Number(src.covered || 0);
      total[key].skipped += Number(src.skipped || 0);
    }
  }

  for (const key of ['lines', 'statements', 'functions', 'branches', 'branchesTrue']) {
    const metric = total[key];
    metric.pct = metric.total > 0 ? (metric.covered / metric.total) * 100 : 100;
  }

  return total;
}

function runProject(projectName) {
  const projectDir = path.join(BY_PROJECT_DIR, projectName);
  ensureDir(projectDir);

  const collectPattern = getCoveragePattern(projectName);
  const commandArgs = [
    'jest',
    '--runInBand',
    `--selectProjects=${projectName}`,
    '--coverage',
    '--coverageReporters=json-summary',
    `--coverageDirectory=${toWinPath(path.relative(ROOT, projectDir))}`,
    '--coverageThreshold={}',
    `--collectCoverageFrom=${collectPattern}`,
    '--collectCoverageFrom=!**/*.test.ts',
    '--collectCoverageFrom=!**/*.spec.ts',
    '--collectCoverageFrom=!**/__tests__/**',
    '--silent'
  ];

  const startedAt = new Date().toISOString();
  const result = spawnSync('npx', commandArgs, {
    cwd: ROOT,
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' }
  });
  const endedAt = new Date().toISOString();

  const summaryPath = path.join(projectDir, 'coverage-summary.json');
  const hasSummary = fs.existsSync(summaryPath);
  return {
    project: projectName,
    collectPattern,
    startedAt,
    endedAt,
    exitCode: typeof result.status === 'number' ? result.status : 1,
    hasSummary,
    summaryPath
  };
}

function main() {
  ensureDir(COVERAGE_ROOT);
  ensureDir(BY_PROJECT_DIR);

  const mergeEntries = {};
  const executions = [];
  const failures = [];

  for (const projectName of projects) {
    if (!ALL_PROJECTS.includes(projectName)) {
      failures.push({
        project: projectName,
        reason: 'Unknown project name in jest config'
      });
      continue;
    }

    const run = runProject(projectName);
    executions.push(run);

    if (run.exitCode !== 0) {
      failures.push({
        project: projectName,
        reason: `Coverage run exited with code ${run.exitCode}`
      });
    }

    if (!run.hasSummary) {
      failures.push({
        project: projectName,
        reason: 'coverage-summary.json not found after run'
      });
      continue;
    }

    const summary = readJson(run.summaryPath);
    for (const [filePath, entry] of Object.entries(summary)) {
      if (filePath === 'total') continue;
      mergeEntries[filePath] = pickBetterEntry(mergeEntries[filePath], entry);
    }
  }

  const total = buildTotal(mergeEntries);
  const output = { total, ...mergeEntries };
  fs.writeFileSync(OUTPUT_SUMMARY, JSON.stringify(output, null, 2));

  const report = {
    generatedAt: new Date().toISOString(),
    requestedProjects: projects,
    executedProjects: executions.length,
    mergedFiles: Object.keys(mergeEntries).length,
    failures,
    executions
  };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log(`Coverage accumulation complete. Merged files: ${report.mergedFiles}`);
  console.log(`Summary: ${path.relative(ROOT, OUTPUT_SUMMARY).replace(/\\/g, '/')}`);
  console.log(`Report: ${path.relative(ROOT, REPORT_PATH).replace(/\\/g, '/')}`);
  if (failures.length > 0) {
    console.log(`Projects with issues: ${failures.length}`);
    for (const failure of failures) {
      console.log(`- ${failure.project}: ${failure.reason}`);
    }
  }
}

main();

