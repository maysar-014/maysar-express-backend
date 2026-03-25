require('dotenv').config();

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const { normalizeOpenApiFile } = require('../contract/normalize-openapi');
const { inspectOpenApi, writeAuditReports, formatAuditSummary } = require('./audit-openapi-contract');

const root = path.resolve(__dirname, '..', '..');
const openApiPath = path.join(root, 'openapi.yaml');
const reportsDir = path.join(root, 'tests', 'contract', 'reports');
const schemathesisHooksPath = path.join(root, 'scripts', 'testing', 'schemathesis-hooks.py');
const schemathesisBaseUrl = String(process.env.SCHEMATHESIS_BASE_URL || 'http://localhost:3000').trim().replace(/\/+$/, '');
const contractUserId = process.env.SCHEMATHESIS_USER_ID || process.env.CONTRACT_TEST_USER_ID || 'usr_test_0001';
const contractUserRoles = process.env.SCHEMATHESIS_USER_ROLES || process.env.CONTRACT_TEST_USER_ROLES || 'admin,agent,seller,buyer,enabler,supplier';
const shouldSeedContractData = !['0', 'false'].includes(String(
  process.env.SCHEMATHESIS_SEED ?? process.env.CONTRACT_TEST_SEED ?? '1'
).toLowerCase());

const toBool = (value, fallback = false) => {
  if (value === undefined) return fallback;
  return !['0', 'false', 'no', 'off'].includes(String(value).toLowerCase());
};

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const hasCommand = (cmd, args = ['--version']) => {
  const result = spawnSync(cmd, args, { stdio: 'ignore', shell: true });
  return result.status === 0;
};

const quoteShellArg = (value) => {
  if (!/[\s()^|&<>]/.test(value)) return value;
  return `"${String(value).replace(/"/g, '\\"')}"`;
};

const pushHeaderArg = (args, header) => {
  args.push('--header', quoteShellArg(header));
};

const runSync = (cmd, args) => {
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
  if (result.status !== 0) process.exit(result.status || 1);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const SERVICE_KEY_MAINTENANCE_PATH_REGEX = '^/api/.+/system/maintenance/cleanup(?:/.*)?$';

const requestStatus = (urlString) => new Promise((resolve) => {
  try {
    const client = urlString.startsWith('https://') ? https : http;
    const req = client.request(urlString, { method: 'GET', timeout: 5000 }, (res) => {
      const { statusCode = 0 } = res;
      res.resume();
      resolve(statusCode);
    });
    req.on('error', () => resolve(0));
    req.on('timeout', () => {
      req.destroy();
      resolve(0);
    });
    req.end();
  } catch (_) {
    resolve(0);
  }
});

const waitForServerReadiness = async () => {
  const readinessUrls = String(
    process.env.SCHEMATHESIS_READY_URLS
    || `${schemathesisBaseUrl}/health,${schemathesisBaseUrl}/api/auth/2fa/health/ready`
  )
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (readinessUrls.length === 0) return;

  const timeoutMs = Number(process.env.SCHEMATHESIS_READINESS_TIMEOUT_MS || '30000');
  const intervalMs = Number(process.env.SCHEMATHESIS_READINESS_INTERVAL_MS || '1000');
  const deadline = Date.now() + timeoutMs;

  console.log('Waiting for API readiness...');

  while (Date.now() < deadline) {
    const statuses = await Promise.all(readinessUrls.map((url) => requestStatus(url)));
    const allReady = statuses.every((statusCode) => statusCode >= 200 && statusCode < 400);

    if (allReady) {
      readinessUrls.forEach((url, index) => {
        console.log(`- Ready: ${url} (${statuses[index]})`);
      });
      return;
    }

    await sleep(intervalMs);
  }

  const finalStatuses = await Promise.all(readinessUrls.map((url) => requestStatus(url)));
  console.error('API readiness check failed before running Schemathesis.');
  readinessUrls.forEach((url, index) => {
    console.error(`- ${url}: ${finalStatuses[index] || 'unreachable'}`);
  });
  process.exit(1);
};

const runOpenApiAudit = (phases) => {
  console.log('Normalizing OpenAPI contract...');
  const normalizationResult = normalizeOpenApiFile(openApiPath);
  console.log(`- Generated request examples present: ${normalizationResult.exampleStats.generatedExamplesPresent}`);
  console.log(`- Request examples backfilled this run: ${normalizationResult.exampleStats.generatedExamplesBackfilled}`);
  console.log('Auditing OpenAPI contract...');

  const summary = inspectOpenApi(openApiPath);
  writeAuditReports(summary, reportsDir);
  console.log(formatAuditSummary(summary));

  const normalizedPhases = String(phases || '')
    .split(',')
    .map((phase) => phase.trim().toLowerCase())
    .filter(Boolean);

  const isExamplesOnly = normalizedPhases.length === 1 && normalizedPhases[0] === 'examples';
  const allowExamplesOnly = toBool(process.env.SCHEMATHESIS_ALLOW_EXAMPLES_ONLY, false);

  if (summary.duplicateKeys.length > 0) {
    console.error('\nOpenAPI audit failed: duplicate YAML keys were found. Fix the schema before trusting contract results.');
    process.exit(1);
  }

  if (summary.requestSchemaCoverage.missingSchemas > 0 || summary.responseCoverage.responsesMissingSchemas > 0) {
    console.error('\nOpenAPI audit failed: request or response schemas are missing for one or more operations.');
    process.exit(1);
  }

  if (isExamplesOnly && summary.requestExampleCoverage.missingExamples > 0 && !allowExamplesOnly) {
    console.error(
      `\nExamples-only mode would skip ${summary.requestExampleCoverage.missingExamples + summary.requestExampleCoverage.operationsWithoutRequestInput} operations: `
      + `${summary.requestExampleCoverage.missingExamples} input-bearing operations have no request examples and `
      + `${summary.requestExampleCoverage.operationsWithoutRequestInput} operations have no request input to example.`
    );
    console.error('Use coverage/fuzzing phases for full contract validation, or set SCHEMATHESIS_ALLOW_EXAMPLES_ONLY=1 for a deliberate smoke run.');
    process.exit(1);
  }

  if (summary.responseCoverage.operationsWithoutSuccessResponse > 0 && toBool(process.env.OPENAPI_AUDIT_FAIL_ON_MISSING_SUCCESS_RESPONSE, false)) {
    console.error('\nOpenAPI audit failed: some operations do not document any 2xx response.');
    process.exit(1);
  }

  if (
    toBool(process.env.OPENAPI_AUDIT_FAIL_ON_GLOBAL_TEST_AUTH, true)
    && (summary.authCoverage.globalSecurityIncludesTestBypass || summary.authCoverage.globalSecurityIncludesServiceKey)
  ) {
    const badSchemes = [
      summary.authCoverage.globalSecurityIncludesTestBypass ? 'ContractTestBypass' : null,
      summary.authCoverage.globalSecurityIncludesServiceKey ? 'ServiceKey' : null,
    ].filter(Boolean);
    console.error(
      `\nOpenAPI audit failed: root security still exposes test/internal auth schemes (${badSchemes.join(', ')}).`
      + ' Move these off the global contract or make them operation-specific so auth checks are not masked.'
    );
    process.exit(1);
  }

  if (
    toBool(process.env.OPENAPI_AUDIT_FAIL_ON_PUBLIC_SECURITY_MISMATCH, true)
    && summary.authCoverage.likelyPublicOperationsWithInheritedSecurity > 0
  ) {
    console.error(
      `\nOpenAPI audit failed: ${summary.authCoverage.likelyPublicOperationsWithInheritedSecurity} likely-public operations still inherit auth from the root security block.`
    );
    console.error('This makes Schemathesis auth failures misleading because public endpoints are being treated as protected.');
    for (const operation of summary.authCoverage.likelyPublicOperationsWithInheritedSecurityList.slice(0, 20)) {
      console.error(`- ${operation.method} ${operation.path}`);
    }
    process.exit(1);
  }
};

const seedContractData = () => {
  if (!shouldSeedContractData) return;

  const seedScriptPath = path.join(root, 'scripts', 'testing', 'seed-contract-data.js');
  if (!fs.existsSync(seedScriptPath)) return;

  console.log('Seeding contract test data...');
  const result = spawnSync('node', [seedScriptPath], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      CONTRACT_TEST_USER_ID: contractUserId,
      CONTRACT_TEST_USER_ROLES: contractUserRoles
    }
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
};

const runStreaming = (cmd, args, label, options = {}) => new Promise((resolve, reject) => {
  const timeoutMs = Number(options.timeoutMs || 0);
  const startedAt = Date.now();
  console.log(`[${label}] Starting: ${cmd} ${args.join(' ')}`);
  const child = spawn(cmd, args, { stdio: 'inherit', shell: true });
  let timedOut = false;

  const heartbeat = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    console.log(`[${label}] Still running... ${Math.floor(elapsed / 60)}m ${elapsed % 60}s elapsed`);
  }, 30000);

  const timeoutHandle = timeoutMs > 0
    ? setTimeout(() => {
        timedOut = true;
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        console.error(`[${label}] Timed out after ${elapsed}s. Stopping...`);
        child.kill();
        setTimeout(() => { if (!child.killed) child.kill('SIGKILL'); }, 5000);
      }, timeoutMs)
    : null;

  child.on('error', (err) => { clearInterval(heartbeat); if (timeoutHandle) clearTimeout(timeoutHandle); reject(err); });
  child.on('close', (code) => {
    clearInterval(heartbeat);
    if (timeoutHandle) clearTimeout(timeoutHandle);
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    const exitCode = timedOut ? 124 : (code ?? 1);
    console.log(`[${label}] Finished in ${elapsed}s with exit code ${exitCode}`);
    resolve(exitCode);
  });
});

const parseCsvOption = (value) => String(value || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const mergeCsvOption = (...values) => {
  const merged = [];
  for (const value of values) {
    for (const item of parseCsvOption(value)) {
      if (!merged.includes(item)) merged.push(item);
    }
  }
  return merged.join(',');
};

const escapeRegex = (value) => String(value).replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');

const buildPathPrefixRegex = (value) => {
  const prefixes = parseCsvOption(value);
  if (prefixes.length === 0) return undefined;
  return `^(?:${prefixes.map((prefix) => `${escapeRegex(prefix)}(?:/.*)?`).join('|')})$`;
};

const mergeRegexOption = (...values) => {
  const parts = values
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .map((value) => `(?:${value})`);

  if (parts.length === 0) return undefined;
  if (parts.length === 1) return parts[0].slice(3, -1);
  return parts.join('|');
};

if (!fs.existsSync(openApiPath)) {
  console.error('openapi.yaml not found at:', openApiPath);
  process.exit(1);
}

ensureDir(reportsDir);

const autoInstall = String(process.env.CONTRACT_TEST_AUTO_INSTALL || '').toLowerCase() === 'true'
  || process.env.CONTRACT_TEST_AUTO_INSTALL === '1';

const ensureSchemathesis = () => {
  if (hasCommand('schemathesis')) return { cmd: 'schemathesis', argsPrefix: [] };
  if (hasCommand('python', ['-m', 'schemathesis', '--version'])) return { cmd: 'python', argsPrefix: ['-m', 'schemathesis'] };
  if (autoInstall) {
    console.log('Installing Schemathesis...');
    runSync('python', ['-m', 'pip', 'install', 'schemathesis']);
    return { cmd: 'python', argsPrefix: ['-m', 'schemathesis'] };
  }
  console.error('Schemathesis not found. Install with: pip install schemathesis');
  process.exit(1);
};

const schemathesis = ensureSchemathesis();

const runSchemathesis = async () => {
  console.log('Running Schemathesis...');
  process.env.PYTHONIOENCODING = process.env.PYTHONIOENCODING || 'utf-8';
  process.env.PYTHONUTF8 = process.env.PYTHONUTF8 || '1';

  const timeoutMs = Number(process.env.SCHEMATHESIS_TIMEOUT_MS || '0');
  const excludeChecks = process.env.SCHEMATHESIS_EXCLUDE_CHECKS ?? 'unsupported_method';
  const checks = process.env.SCHEMATHESIS_CHECKS || 'all';
  const warnings = process.env.SCHEMATHESIS_WARNINGS;
  const maxFailures = process.env.SCHEMATHESIS_MAX_FAILURES;
  const requestTimeoutSeconds = process.env.SCHEMATHESIS_REQUEST_TIMEOUT_SECONDS;
  const maxResponseTimeSeconds = process.env.SCHEMATHESIS_MAX_RESPONSE_TIME_SECONDS;
  const uniqueInputs = toBool(process.env.SCHEMATHESIS_UNIQUE_INPUTS, true);
  const phases = process.env.SCHEMATHESIS_PHASES || process.env.SCHEMATHESIS_DEFAULT_PHASES || 'examples,coverage,fuzzing';
  const mode = process.env.SCHEMATHESIS_MODE || 'all';
  const authMode = String(process.env.SCHEMATHESIS_AUTH_MODE || 'strict').trim().toLowerCase();
  const globalIncludePathRegex = mergeRegexOption(
    process.env.SCHEMATHESIS_INCLUDE_PATH_REGEX,
    buildPathPrefixRegex(process.env.SCHEMATHESIS_INCLUDE_PATH_PREFIXES)
  );
  const globalExcludePathRegex = process.env.SCHEMATHESIS_EXCLUDE_PATH_REGEX;

  if (!['strict', 'bypass'].includes(authMode)) {
    console.error(`Unsupported SCHEMATHESIS_AUTH_MODE: "${authMode}". Use "strict" or "bypass".`);
    process.exit(1);
  }

  const shouldUseBypassDefaults = authMode === 'bypass';
  const shouldAutoGenerateJwt = toBool(process.env.SCHEMATHESIS_FORCE_JWT, !shouldUseBypassDefaults);
  const includeContractTestHeader = toBool(process.env.SCHEMATHESIS_INCLUDE_CONTRACT_TEST_HEADER, true);
  const includeGatewayHeaders = toBool(process.env.SCHEMATHESIS_INCLUDE_GATEWAY_HEADERS, shouldUseBypassDefaults);
  const includeServiceKeyHeader = toBool(process.env.SCHEMATHESIS_INCLUDE_SERVICE_KEY, shouldUseBypassDefaults);
  const includeInternalCallHeader = toBool(process.env.SCHEMATHESIS_INCLUDE_INTERNAL_CALL_HEADER, false);
  const splitServiceKeyMaintenancePass = authMode === 'strict'
    && toBool(process.env.SCHEMATHESIS_SPLIT_SERVICE_KEY_MAINTENANCE, true);

  runOpenApiAudit(phases);
  await waitForServerReadiness();

  console.log(`Schemathesis auth mode: ${authMode}`);

  if (!process.env.SCHEMATHESIS_HOOKS && fs.existsSync(schemathesisHooksPath)) {
    process.env.SCHEMATHESIS_HOOKS = schemathesisHooksPath;
  }

  let authorizationHeader = process.env.SCHEMATHESIS_AUTH_TOKEN;
  if (!authorizationHeader && shouldAutoGenerateJwt) {
    const jwtSecret = process.env.JWT_SECRET || process.env.DREDD_JWT_SECRET;
    if (jwtSecret) {
      try {
        const jwt = require('jsonwebtoken');
        const userId = contractUserId;
        const roles = contractUserRoles.split(',').map(r => r.trim());
        authorizationHeader = `Bearer ${jwt.sign({ userId, email: 'schemathesis@example.com', roles }, jwtSecret, { expiresIn: '2h' })}`;
      } catch (_) {}
    }
  }

  if (shouldAutoGenerateJwt && !authorizationHeader) {
    console.error('SCHEMATHESIS_FORCE_JWT=1 was set, but no JWT could be generated. Ensure JWT_SECRET is available in the environment or .env.');
    process.exit(1);
  }

  const buildArgs = ({
    reportPath,
    includePathRegex,
    excludePathRegex,
    useAuthorization = Boolean(authorizationHeader),
    useGatewayHeaders = includeGatewayHeaders,
    useServiceKeyHeader = includeServiceKeyHeader,
    useInternalCallHeader = includeInternalCallHeader,
    excludeChecksOverride = excludeChecks,
    idempotencySuffix = 'default',
  }) => {
    const args = [
      ...schemathesis.argsPrefix,
      'run',
      'openapi.yaml',
      `--url=${schemathesisBaseUrl}`,
      '--report', 'junit',
      '--report-junit-path', reportPath,
    ];

    pushHeaderArg(
      args,
      `Idempotency-Key:${process.env.SCHEMATHESIS_IDEMPOTENCY_KEY || `schemathesis-${idempotencySuffix}-${Date.now()}`}`
    );

    if (includeContractTestHeader) {
      pushHeaderArg(args, `X-Contract-Test:${process.env.SCHEMATHESIS_CONTRACT_TEST || '1'}`);
    }
    if (useGatewayHeaders) {
      pushHeaderArg(args, `X-User-Id:${contractUserId}`);
      pushHeaderArg(args, `X-User-Roles:${contractUserRoles}`);
    }
    if (useServiceKeyHeader) {
      pushHeaderArg(args, `X-Service-Key:${process.env.SCHEMATHESIS_SERVICE_KEY || 'dev-service-key'}`);
    }
    if (useInternalCallHeader) {
      pushHeaderArg(args, `x-internal-call:${process.env.SCHEMATHESIS_INTERNAL_CALLER || 'auth-service'}`);
    }
    if (useAuthorization && authorizationHeader) {
      pushHeaderArg(args, `Authorization:${authorizationHeader}`);
    }
    if (checks) args.push('--checks', checks);
    if (warnings) args.push('--warnings', warnings);
    if (excludeChecksOverride) args.push('--exclude-checks', excludeChecksOverride);
    if (maxFailures) args.push('--max-failures', String(maxFailures));
    if (requestTimeoutSeconds) args.push('--request-timeout', String(requestTimeoutSeconds));
    if (maxResponseTimeSeconds) args.push('--max-response-time', String(maxResponseTimeSeconds));
    if (uniqueInputs) args.push('--generation-unique-inputs');
    if (phases) args.push('--phases', phases);
    if (mode) args.push('--mode', mode);
    const effectiveIncludePathRegex = mergeRegexOption(globalIncludePathRegex, includePathRegex);
    const effectiveExcludePathRegex = mergeRegexOption(globalExcludePathRegex, excludePathRegex);
    if (effectiveIncludePathRegex) args.push('--include-path-regex', quoteShellArg(effectiveIncludePathRegex));
    if (effectiveExcludePathRegex) args.push('--exclude-path-regex', quoteShellArg(effectiveExcludePathRegex));
    return args;
  };

  const runs = [];
  if (splitServiceKeyMaintenancePass) {
    runs.push({
      label: 'Schemathesis/Bearer',
      reportPath: path.join('tests', 'contract', 'reports', 'schemathesis-junit.xml'),
      excludePathRegex: SERVICE_KEY_MAINTENANCE_PATH_REGEX,
      useAuthorization: true,
      useGatewayHeaders: includeGatewayHeaders,
      useServiceKeyHeader: false,
      useInternalCallHeader: includeInternalCallHeader,
      excludeChecksOverride: excludeChecks,
      idempotencySuffix: 'bearer',
    });
    runs.push({
      label: 'Schemathesis/ServiceKey',
      reportPath: path.join('tests', 'contract', 'reports', 'schemathesis-service-key-junit.xml'),
      includePathRegex: SERVICE_KEY_MAINTENANCE_PATH_REGEX,
      useAuthorization: false,
      useGatewayHeaders: false,
      useServiceKeyHeader: true,
      useInternalCallHeader: false,
      excludeChecksOverride: mergeCsvOption(excludeChecks, 'ignored_auth'),
      idempotencySuffix: 'service-key',
    });
  } else {
    runs.push({
      label: 'Schemathesis',
      reportPath: path.join('tests', 'contract', 'reports', 'schemathesis-junit.xml'),
      useAuthorization: Boolean(authorizationHeader),
      useGatewayHeaders: includeGatewayHeaders,
      useServiceKeyHeader: includeServiceKeyHeader,
      useInternalCallHeader: includeInternalCallHeader,
      excludeChecksOverride: excludeChecks,
      idempotencySuffix: 'default',
    });
  }

  for (const run of runs) {
    const code = await runStreaming(
      schemathesis.cmd,
      buildArgs(run),
      run.label,
      { timeoutMs: timeoutMs > 0 ? timeoutMs : undefined },
    );

    if (code !== 0) process.exit(code || 1);
  }
};

seedContractData();

runSchemathesis().catch((err) => {
  console.error('Contract test runner failed:', err);
  process.exit(1);
});
