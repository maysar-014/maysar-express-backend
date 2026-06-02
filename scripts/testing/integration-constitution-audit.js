#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const REPORT_DIR = path.join(ROOT, 'reports', 'testing');
const REPORT_JSON = path.join(REPORT_DIR, 'integration-constitution-report.json');
const REPORT_MD = path.join(REPORT_DIR, 'INTEGRATION_CONSTITUTION_GAP_REPORT.md');
const FAIL_ON_VIOLATIONS = process.argv.includes('--fail');

const SERVICES_ROOT = path.join(ROOT, 'services');
const SKIP_DIR_NAMES = new Set(['node_modules', 'dist', 'coverage', 'reports', '.git', '.next', 'build']);

const INTERNAL_ALIAS_PREFIXES = [
  '@api/',
  '@application/',
  '@domain/',
  '@infrastructure/',
  '@shared/',
  '@shared-events/',
  '@auth/',
  '@user/',
  '@order/',
  '@catalog/',
  '@inventory/',
  '@wallet/',
  '@payment/',
  '@logistics/',
  '@compliance/',
  '@community/',
  '@checkout/',
  '@training/',
  '@support/',
  '@notification/',
  '@analytics/',
  '@campaign/',
  '@commission/',
  '@enabler/',
  '@payout/',
  '@maps/',
  '@production/',
  '@session/',
  '@sms/',
  '@two-factor/',
  '@business-registry/'
];

const INTEGRATION_ALLOWED_PATH_SNIPPETS = [
  '/src/infrastructure/',
  '/src/api/routes/',
  '/src/application/sagas/',
  '/src/__tests__/application/sagas/',
  '/src/tests/integration/',
  '/src/__tests__/integration/',
  '/tests/integration/'
];

function toUnix(value) {
  return value.replace(/\\/g, '/');
}

function rel(filePath) {
  return toUnix(path.relative(ROOT, filePath));
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function walk(dirPath) {
  const files = [];
  if (!fs.existsSync(dirPath)) {
    return files;
  }

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry.name)) {
        continue;
      }
      files.push(...walk(fullPath));
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

function isTestFile(relativePath) {
  return /\.(test|spec)\.ts$/i.test(relativePath);
}

function isIntegrationTestFile(relativePath) {
  const lower = relativePath.toLowerCase();
  return (
    lower.endsWith('.integration.test.ts') ||
    lower.endsWith('.integration.spec.ts') ||
    lower.includes('/__tests__/integration/') ||
    lower.includes('/tests/integration/')
  );
}

function getServiceName(relativePath) {
  const normalized = toUnix(relativePath);
  const match = normalized.match(/^services\/([^/]+)\//);
  return match ? match[1] : null;
}

function getMockTargets(content) {
  const targets = [];
  const mockRe = /jest\.mock\(\s*['"]([^'"]+)['"]/g;
  let match;

  while ((match = mockRe.exec(content)) !== null) {
    targets.push(match[1]);
  }

  return targets;
}

function isInternalMockTarget(target) {
  const normalized = target.replace(/\\/g, '/');
  if (normalized.startsWith('.')) {
    return true;
  }

  if (normalized.startsWith('services/')) {
    return true;
  }

  return INTERNAL_ALIAS_PREFIXES.some(prefix => normalized.startsWith(prefix));
}

function isAllowedIntegrationTestLocation(relativePath) {
  const lower = `/${relativePath.toLowerCase()}`;

  if (lower.startsWith('/shared/')) {
    return true;
  }

  return INTEGRATION_ALLOWED_PATH_SNIPPETS.some(snippet => lower.includes(snippet));
}

function hasAssertion(content) {
  return /\bexpect\s*\(/.test(content);
}

function fileContainsIoSignals(content) {
  const signalPattern = new RegExp(
    [
      'new\\s+PrismaClient',
      'supertest',
      '@testcontainers',
      'ioredis',
      'redis',
      'nock',
      'fetch\\(',
      'global\\.fetch',
      'axios\\.',
      'request\\(',
      '\\$transaction',
      'eventBus\\.publish',
      'inMemoryEventBus\\.subscribe',
      'OutboxEventPublisher'
    ].join('|')
  );
  return signalPattern.test(content);
}

function listServices() {
  if (!fs.existsSync(SERVICES_ROOT)) {
    return [];
  }

  return fs
    .readdirSync(SERVICES_ROOT, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .filter(name => fs.existsSync(path.join(SERVICES_ROOT, name, 'src')))
    .sort();
}

function hasPathWithKeywords(files, keywords) {
  return files.some(file => keywords.every(keyword => file.toLowerCase().includes(keyword)));
}

function evaluatePriorityCoverage(integrationRelFiles) {
  const files = integrationRelFiles.map(file => file.toLowerCase());

  const hasService = serviceName => files.some(file => file.includes(`services/${serviceName}/`));

  return [
    {
      id: 'priority-1-order-payment-inventory-delivery',
      description: 'Order -> Payment -> Inventory -> Delivery integration flow coverage exists',
      required: true,
      passed:
        hasService('order-service') &&
        hasService('payment-service') &&
        hasService('inventory-service') &&
        hasService('logistics-service')
    },
    {
      id: 'priority-1-user-auth-verification',
      description: 'User registration/auth verification flow has integration coverage',
      required: true,
      passed: hasService('user-service') && hasService('auth-service')
    },
    {
      id: 'priority-1-paymentGateway',
      description: 'PaymentGateway payment gateway integration is covered',
      required: true,
      passed: hasPathWithKeywords(files, ['payment-service']) && files.some(file => file.includes('paymentGateway'))
    },
    {
      id: 'priority-1-wallet-operations',
      description: 'Wallet credit/debit/freeze integration is covered',
      required: true,
      passed: hasService('wallet-service')
    },
    {
      id: 'priority-1-outbox-pattern',
      description: 'Outbox pattern integration is covered',
      required: true,
      passed: files.some(file => file.includes('outbox'))
    },
    {
      id: 'priority-1-order-fulfillment-saga',
      description: 'Order fulfillment saga integration/compensation is covered',
      required: true,
      passed:
        files.some(file => file.includes('saga')) &&
        (hasService('order-service') || hasService('logistics-service'))
    }
  ];
}

function toMarkdown(report) {
  const lines = [];
  lines.push('# Integration Constitution Audit');
  lines.push('');
  lines.push(`- Generated At: ${report.generatedAt}`);
  lines.push(`- Services Audited: ${report.summary.servicesAudited}`);
  lines.push(`- Integration Tests Found: ${report.summary.integrationTests}`);
  lines.push(`- Location Violations: ${report.summary.locationViolations}`);
  lines.push(`- Internal Mock Violations: ${report.summary.internalMockViolations}`);
  lines.push(`- Assertion Violations: ${report.summary.assertionViolations}`);
  lines.push(`- Services Missing Integration Tests: ${report.summary.servicesMissingIntegrationTests}`);
  lines.push(`- Priority 1 Coverage Failures: ${report.summary.priority1CoverageFailures}`);
  lines.push('');

  lines.push('## Service Coverage Matrix');
  lines.push('');
  lines.push('| Service | Integration Test Count |');
  lines.push('|---|---:|');
  for (const row of report.serviceMatrix) {
    lines.push(`| ${row.service} | ${row.integrationTests} |`);
  }
  lines.push('');

  lines.push('## Violations - Integration Test Location');
  lines.push('');
  lines.push('| File | Reason |');
  lines.push('|---|---|');
  if (report.locationViolations.length === 0) {
    lines.push('| (none) | - |');
  } else {
    for (const item of report.locationViolations) {
      lines.push(`| ${item.file} | ${item.reason} |`);
    }
  }
  lines.push('');

  lines.push('## Violations - Internal Mocks in Integration Tests');
  lines.push('');
  lines.push('| File | Mock Target | Reason |');
  lines.push('|---|---|---|');
  if (report.internalMockViolations.length === 0) {
    lines.push('| (none) | - | - |');
  } else {
    for (const item of report.internalMockViolations) {
      lines.push(`| ${item.file} | ${item.target} | ${item.reason} |`);
    }
  }
  lines.push('');

  lines.push('## Violations - Missing Assertions');
  lines.push('');
  lines.push('| File | Reason |');
  lines.push('|---|---|');
  if (report.assertionViolations.length === 0) {
    lines.push('| (none) | - |');
  } else {
    for (const item of report.assertionViolations) {
      lines.push(`| ${item.file} | ${item.reason} |`);
    }
  }
  lines.push('');

  lines.push('## Services Missing Integration Tests');
  lines.push('');
  if (report.servicesMissingIntegrationTests.length === 0) {
    lines.push('- (none)');
  } else {
    for (const service of report.servicesMissingIntegrationTests) {
      lines.push(`- ${service}`);
    }
  }
  lines.push('');

  lines.push('## Priority 1 Coverage Checks (INTEGRATION_TEST_CATALOG.md)');
  lines.push('');
  lines.push('| Check | Required | Passed |');
  lines.push('|---|---|---|');
  for (const check of report.priority1Checks) {
    lines.push(`| ${check.description} | ${check.required ? 'Yes' : 'No'} | ${check.passed ? 'Yes' : 'No'} |`);
  }
  lines.push('');

  lines.push('## Warnings - No Real I/O Signal Detected');
  lines.push('');
  lines.push('| File | Note |');
  lines.push('|---|---|');
  if (report.ioSignalWarnings.length === 0) {
    lines.push('| (none) | - |');
  } else {
    for (const item of report.ioSignalWarnings.slice(0, 200)) {
      lines.push(`| ${item.file} | ${item.note} |`);
    }
  }
  lines.push('');

  return lines.join('\n');
}

function main() {
  const allFiles = walk(ROOT).map(filePath => ({
    abs: filePath,
    rel: rel(filePath)
  }));

  const testFiles = allFiles.filter(file => isTestFile(file.rel));
  const integrationTestFiles = testFiles.filter(file => isIntegrationTestFile(file.rel));
  const services = listServices();

  const locationViolations = [];
  const internalMockViolations = [];
  const assertionViolations = [];
  const ioSignalWarnings = [];

  for (const file of integrationTestFiles) {
    const content = readText(file.abs);
    const lowerRel = file.rel.toLowerCase();

    if (lowerRel.includes('/src/domain/')) {
      locationViolations.push({
        file: file.rel,
        reason: 'integration tests must not be placed in domain layer paths'
      });
    } else if (!isAllowedIntegrationTestLocation(file.rel)) {
      locationViolations.push({
        file: file.rel,
        reason: 'integration test path is outside allowed constitutional locations'
      });
    }

    const mockTargets = getMockTargets(content);
    for (const target of mockTargets) {
      if (isInternalMockTarget(target)) {
        internalMockViolations.push({
          file: file.rel,
          target,
          reason: 'integration tests should not mock internal module implementations'
        });
      }
    }

    if (!hasAssertion(content)) {
      assertionViolations.push({
        file: file.rel,
        reason: 'integration test has no explicit assertions'
      });
    }

    if (!fileContainsIoSignals(content)) {
      ioSignalWarnings.push({
        file: file.rel,
        note: 'no explicit real-I/O signal detected (DB/Redis/HTTP/testcontainer marker missing)'
      });
    }
  }

  const integrationByService = new Map();
  for (const file of integrationTestFiles) {
    const service = getServiceName(file.rel);
    if (!service) {
      continue;
    }
    integrationByService.set(service, (integrationByService.get(service) || 0) + 1);
  }

  const serviceMatrix = services.map(service => ({
    service,
    integrationTests: integrationByService.get(service) || 0
  }));

  const servicesMissingIntegrationTests = serviceMatrix
    .filter(item => item.integrationTests === 0)
    .map(item => item.service);

  const priority1Checks = evaluatePriorityCoverage(integrationTestFiles.map(file => file.rel));
  const priority1CoverageFailures = priority1Checks.filter(check => check.required && !check.passed);

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      servicesAudited: services.length,
      integrationTests: integrationTestFiles.length,
      locationViolations: locationViolations.length,
      internalMockViolations: internalMockViolations.length,
      assertionViolations: assertionViolations.length,
      servicesMissingIntegrationTests: servicesMissingIntegrationTests.length,
      priority1CoverageFailures: priority1CoverageFailures.length,
      ioSignalWarnings: ioSignalWarnings.length
    },
    serviceMatrix,
    locationViolations,
    internalMockViolations,
    assertionViolations,
    servicesMissingIntegrationTests,
    priority1Checks,
    priority1CoverageFailures,
    ioSignalWarnings
  };

  ensureDir(REPORT_DIR);
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2));
  fs.writeFileSync(REPORT_MD, toMarkdown(report));

  console.log('Integration constitution audit complete.');
  console.log(`Services audited: ${report.summary.servicesAudited}`);
  console.log(`Integration tests found: ${report.summary.integrationTests}`);
  console.log(`Location violations: ${report.summary.locationViolations}`);
  console.log(`Internal mock violations: ${report.summary.internalMockViolations}`);
  console.log(`Assertion violations: ${report.summary.assertionViolations}`);
  console.log(`Services missing integration tests: ${report.summary.servicesMissingIntegrationTests}`);
  console.log(`Priority 1 coverage failures: ${report.summary.priority1CoverageFailures}`);
  console.log(`Warnings (no real-I/O signal): ${report.summary.ioSignalWarnings}`);
  console.log(`JSON report: ${rel(REPORT_JSON)}`);
  console.log(`Markdown report: ${rel(REPORT_MD)}`);

  const hasViolations =
    report.summary.locationViolations > 0 ||
    report.summary.internalMockViolations > 0 ||
    report.summary.assertionViolations > 0 ||
    report.summary.servicesMissingIntegrationTests > 0 ||
    report.summary.priority1CoverageFailures > 0;

  if (FAIL_ON_VIOLATIONS && hasViolations) {
    process.exit(1);
  }
}

main();
