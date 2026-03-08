#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const REPORT_DIR = path.join(ROOT, 'reports', 'testing');
const REPORT_JSON = path.join(REPORT_DIR, 'constitution-compliance-report.json');
const REPORT_MD = path.join(REPORT_DIR, 'CONSTITUTION_TEST_GAP_REPORT.md');
const COVERAGE_SUMMARY_PATH = path.join(ROOT, 'coverage', 'coverage-summary.json');
const FAIL_ON_VIOLATIONS = process.argv.includes('--fail');

const SOURCE_ROOTS = ['services', 'shared', 'src', 'events', 'shared-contracts'];
const TEST_SUFFIX_RE = /\.(test|spec)\.ts$/i;
const FORBIDDEN_DOMAIN_IMPORTS = [
  '@prisma/client',
  'express',
  'axios',
  'ioredis',
  'redis',
  'kafkajs',
  'fs',
  'node:fs',
  'http',
  'https',
  'net',
  'tls',
  'child_process'
];

const toUnix = value => value.replace(/\\/g, '/');
const normalizePath = value => toUnix(path.resolve(value)).toLowerCase();

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function walk(dirPath) {
  const files = [];
  if (!fs.existsSync(dirPath)) {
    return files;
  }

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    const rel = toUnix(path.relative(ROOT, fullPath));
    if (
      rel.includes('/node_modules/') ||
      rel.includes('/dist/') ||
      rel.includes('/coverage/') ||
      rel.includes('/reports/') ||
      rel.includes('/.git/')
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

function isSourceFile(filePath) {
  const rel = toUnix(path.relative(ROOT, filePath));
  if (!rel.endsWith('.ts') || rel.endsWith('.d.ts')) {
    return false;
  }

  if (TEST_SUFFIX_RE.test(rel) || rel.includes('/__tests__/') || rel.includes('/tests/')) {
    return false;
  }

  if (rel.includes('/prisma/migrations/')) {
    return false;
  }

  return SOURCE_ROOTS.some(root => rel === root || rel.startsWith(`${root}/`));
}

function isTestFile(filePath) {
  const rel = toUnix(path.relative(ROOT, filePath));
  return rel.endsWith('.ts') && (TEST_SUFFIX_RE.test(rel) || rel.includes('/__tests__/'));
}

function getLayer(filePath) {
  const rel = toUnix(path.relative(ROOT, filePath));
  if (rel.includes('/domain/')) return 'domain';
  if (rel.includes('/application/')) return 'application';
  if (rel.includes('/infrastructure/')) return 'infrastructure';
  if (rel.includes('/api/')) return 'api';
  return 'shared';
}

function getComponentType(filePath) {
  const rel = toUnix(path.relative(ROOT, filePath));
  if (rel.includes('/domain/entities/')) return 'domain-entity';
  if (rel.includes('/domain/value-objects/')) return 'value-object';
  if (rel.includes('/domain/algorithms/')) return 'algorithm';
  if (rel.includes('/domain/policies/')) return 'policy';
  if (rel.includes('/domain/engines/')) return 'engine';
  if (rel.includes('/application/use-cases/')) return 'use-case';
  if (rel.includes('/application/sagas/')) return 'saga';
  if (rel.includes('/infrastructure/')) return 'infrastructure';
  if (rel.includes('/api/controllers/')) return 'api-controller';
  if (rel.includes('/messaging/') || rel.endsWith('.handler.ts')) return 'event-handler';
  return 'other';
}

function getCoverageTarget(filePath) {
  switch (getComponentType(filePath)) {
    case 'domain-entity':
      return 95;
    case 'value-object':
      return 98;
    case 'algorithm':
      return 98;
    case 'policy':
      return 95;
    case 'engine':
      return 95;
    case 'use-case':
      return 90;
    case 'saga':
      return 95;
    case 'infrastructure':
      return 80;
    case 'api-controller':
      return 85;
    case 'event-handler':
      return 90;
    default:
      return 80;
  }
}

function extractImports(filePath) {
  const content = readText(filePath);
  const imports = [];
  const importRe = /\bfrom\s+['"]([^'"]+)['"]/g;
  const requireRe = /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match;

  while ((match = importRe.exec(content)) !== null) {
    imports.push(match[1]);
  }

  while ((match = requireRe.exec(content)) !== null) {
    imports.push(match[1]);
  }

  return imports;
}

function hasForbiddenDomainImport(importValue) {
  if (FORBIDDEN_DOMAIN_IMPORTS.some(prefix => importValue === prefix || importValue.startsWith(`${prefix}/`))) {
    return true;
  }
  return false;
}

function checkDomainPurity(sourceFile) {
  const rel = toUnix(path.relative(ROOT, sourceFile));
  if (!rel.includes('/domain/')) {
    return [];
  }

  const violations = [];
  for (const imported of extractImports(sourceFile)) {
    const isRelative = imported.startsWith('.');
    if (!isRelative && hasForbiddenDomainImport(imported)) {
      violations.push({ file: rel, import: imported, reason: 'forbidden external dependency in domain layer' });
      continue;
    }

    if (isRelative && (imported.includes('/infrastructure/') || imported.includes('/api/'))) {
      violations.push({ file: rel, import: imported, reason: 'domain depends on outward layer' });
    }
  }

  const content = readText(sourceFile);
  if (content.includes('process.env')) {
    violations.push({ file: rel, import: 'process.env', reason: 'domain accesses environment variables' });
  }

  return violations;
}

function checkDomainTestPurity(testFile) {
  const rel = toUnix(path.relative(ROOT, testFile));
  if (!rel.includes('/domain/')) {
    return [];
  }

  const violations = [];
  for (const imported of extractImports(testFile)) {
    if (hasForbiddenDomainImport(imported)) {
      violations.push({ file: rel, import: imported, reason: 'domain tests should not depend on infrastructure/network' });
    }
  }

  if (readText(testFile).includes('process.env')) {
    violations.push({ file: rel, import: 'process.env', reason: 'domain tests should not depend on env vars' });
  }

  return violations;
}

function buildTestIndex(testFiles) {
  const byStem = new Map();
  const normalizedSet = new Set(testFiles.map(file => normalizePath(file)));

  for (const file of testFiles) {
    const name = path.basename(file);
    const stem = name.replace(/\.(test|spec)\.ts$/i, '');
    const bucket = byStem.get(stem) || [];
    bucket.push(file);
    byStem.set(stem, bucket);
  }

  return { byStem, normalizedSet };
}

function findRelatedTests(sourceFile, testIndex) {
  const sourceDir = path.dirname(sourceFile);
  const stem = path.basename(sourceFile, '.ts');
  const directCandidates = [
    path.join(sourceDir, `${stem}.test.ts`),
    path.join(sourceDir, `${stem}.spec.ts`),
    path.join(sourceDir, '__tests__', `${stem}.test.ts`),
    path.join(sourceDir, '__tests__', `${stem}.spec.ts`)
  ];

  const related = [];
  for (const candidate of directCandidates) {
    if (testIndex.normalizedSet.has(normalizePath(candidate))) {
      related.push(candidate);
    }
  }

  const indexed = testIndex.byStem.get(stem) || [];
  for (const file of indexed) {
    if (!related.some(existing => normalizePath(existing) === normalizePath(file))) {
      related.push(file);
    }
  }

  return related;
}

function getCoverageMap() {
  if (!fs.existsSync(COVERAGE_SUMMARY_PATH)) {
    return new Map();
  }

  const raw = JSON.parse(readText(COVERAGE_SUMMARY_PATH));
  const coverage = new Map();
  for (const [filePath, entry] of Object.entries(raw)) {
    if (filePath === 'total') {
      continue;
    }
    coverage.set(normalizePath(filePath), entry);
  }
  return coverage;
}

function lineCount(filePath) {
  return readText(filePath).split(/\r?\n/).length;
}

function rel(filePath) {
  return toUnix(path.relative(ROOT, filePath));
}

function toMarkdown(report) {
  const lines = [];
  lines.push('# Constitution Compliance Audit');
  lines.push('');
  lines.push(`- Generated At: ${report.generatedAt}`);
  lines.push(`- Source Files Audited: ${report.summary.sourceFiles}`);
  lines.push(`- Test Files Audited: ${report.summary.testFiles}`);
  lines.push(`- Missing Test Mappings: ${report.summary.missingTests}`);
  lines.push(`- Domain Purity Violations: ${report.summary.domainPurityViolations}`);
  lines.push(`- Domain Test Purity Violations: ${report.summary.domainTestPurityViolations}`);
  lines.push(`- Coverage Target Violations: ${report.summary.coverageViolations}`);
  lines.push(`- Files Missing Coverage Data: ${report.summary.filesWithoutCoverageData}`);
  lines.push('');

  lines.push('## Highest Priority Missing Tests');
  lines.push('');
  lines.push('| File | Layer | Component | Target Coverage | Lines |');
  lines.push('|---|---|---|---:|---:|');
  for (const item of report.missingTests.slice(0, 50)) {
    lines.push(`| ${item.file} | ${item.layer} | ${item.component} | ${item.targetCoverage}% | ${item.lines} |`);
  }
  if (report.missingTests.length === 0) {
    lines.push('| (none) | - | - | - | - |');
  }
  lines.push('');

  lines.push('## Coverage Violations');
  lines.push('');
  lines.push('| File | Component | Target | Actual |');
  lines.push('|---|---|---:|---:|');
  for (const item of report.coverageViolations.slice(0, 100)) {
    lines.push(`| ${item.file} | ${item.component} | ${item.targetCoverage}% | ${item.actualCoverage.toFixed(2)}% |`);
  }
  if (report.coverageViolations.length === 0) {
    lines.push('| (none) | - | - | - |');
  }
  lines.push('');

  lines.push('## Domain Purity Violations');
  lines.push('');
  lines.push('| File | Import/Usage | Reason |');
  lines.push('|---|---|---|');
  for (const item of report.domainPurityViolations.slice(0, 100)) {
    lines.push(`| ${item.file} | ${item.import} | ${item.reason} |`);
  }
  if (report.domainPurityViolations.length === 0) {
    lines.push('| (none) | - | - |');
  }
  lines.push('');

  lines.push('## Domain Test Purity Violations');
  lines.push('');
  lines.push('| File | Import/Usage | Reason |');
  lines.push('|---|---|---|');
  for (const item of report.domainTestPurityViolations.slice(0, 100)) {
    lines.push(`| ${item.file} | ${item.import} | ${item.reason} |`);
  }
  if (report.domainTestPurityViolations.length === 0) {
    lines.push('| (none) | - | - |');
  }
  lines.push('');

  return lines.join('\n');
}

function main() {
  const allFiles = SOURCE_ROOTS.flatMap(root => walk(path.join(ROOT, root)));
  const sourceFiles = allFiles.filter(isSourceFile);
  const testFiles = allFiles.filter(isTestFile);
  const testIndex = buildTestIndex(testFiles);
  const coverageMap = getCoverageMap();

  const missingTests = [];
  const coverageViolations = [];
  const filesWithoutCoverageData = [];
  const domainPurityViolations = [];
  const domainTestPurityViolations = [];

  for (const sourceFile of sourceFiles) {
    const layer = getLayer(sourceFile);
    const component = getComponentType(sourceFile);
    const targetCoverage = getCoverageTarget(sourceFile);
    const relatedTests = findRelatedTests(sourceFile, testIndex);
    const sourceRel = rel(sourceFile);

    if (relatedTests.length === 0) {
      missingTests.push({
        file: sourceRel,
        layer,
        component,
        targetCoverage,
        lines: lineCount(sourceFile)
      });
    }

    const coverageEntry = coverageMap.get(normalizePath(sourceFile));
    if (!coverageEntry) {
      filesWithoutCoverageData.push({
        file: sourceRel,
        layer,
        component
      });
    } else {
      const actualCoverage = Number(coverageEntry.lines?.pct || 0);
      if (actualCoverage < targetCoverage) {
        coverageViolations.push({
          file: sourceRel,
          component,
          targetCoverage,
          actualCoverage
        });
      }
    }

    domainPurityViolations.push(...checkDomainPurity(sourceFile));
  }

  for (const testFile of testFiles) {
    domainTestPurityViolations.push(...checkDomainTestPurity(testFile));
  }

  missingTests.sort((a, b) => b.lines - a.lines);
  coverageViolations.sort((a, b) => a.actualCoverage - b.actualCoverage);

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      sourceFiles: sourceFiles.length,
      testFiles: testFiles.length,
      missingTests: missingTests.length,
      domainPurityViolations: domainPurityViolations.length,
      domainTestPurityViolations: domainTestPurityViolations.length,
      coverageViolations: coverageViolations.length,
      filesWithoutCoverageData: filesWithoutCoverageData.length
    },
    missingTests,
    coverageViolations,
    domainPurityViolations,
    domainTestPurityViolations,
    filesWithoutCoverageData
  };

  ensureDir(REPORT_DIR);
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2));
  fs.writeFileSync(REPORT_MD, toMarkdown(report));

  console.log('Constitution compliance audit complete.');
  console.log(`Source files: ${report.summary.sourceFiles}`);
  console.log(`Test files: ${report.summary.testFiles}`);
  console.log(`Missing test mappings: ${report.summary.missingTests}`);
  console.log(`Domain purity violations: ${report.summary.domainPurityViolations}`);
  console.log(`Domain test purity violations: ${report.summary.domainTestPurityViolations}`);
  console.log(`Coverage violations: ${report.summary.coverageViolations}`);
  console.log(`Coverage data missing: ${report.summary.filesWithoutCoverageData}`);
  console.log(`JSON report: ${toUnix(path.relative(ROOT, REPORT_JSON))}`);
  console.log(`Markdown report: ${toUnix(path.relative(ROOT, REPORT_MD))}`);

  const hasViolations =
    report.summary.missingTests > 0 ||
    report.summary.domainPurityViolations > 0 ||
    report.summary.domainTestPurityViolations > 0 ||
    report.summary.coverageViolations > 0;

  if (FAIL_ON_VIOLATIONS && hasViolations) {
    process.exit(1);
  }
}

main();
