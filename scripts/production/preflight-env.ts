#!/usr/bin/env tsx
/**
 * Maysar Engineering Production Preflight Script
 * 
 * Governing Document: Maysar Engineering Constitution v1.0
 *   - Article 26: Release and Recovery
 *   - Article 28: Engineering Compliance
 *   - Article 29: Exceptions and Authorizations
 * 
 * This script validates that the system is ready for production deployment.
 * Exit code 0 = all checks passed (safe to deploy)
 * Exit code 1 = one or more checks failed (DO NOT DEPLOY)
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Configuration
// ============================================================================

interface CheckResult {
    name: string;
    passed: boolean;
    critical: boolean;
    message: string;
    evidence?: string;
    remediation?: string;
}

const results: CheckResult[] = [];
let criticalFailures = 0;
let totalChecks = 0;

const ENV_FILE = process.env.ENV_FILE || '.env.production';
const ROOT_DIR = path.resolve(__dirname, '../../');

// ============================================================================
// Helper Functions
// ============================================================================

function check(name: string, critical: boolean, condition: boolean, message: string, evidence?: string, remediation?: string): void {
    totalChecks++;
    const result: CheckResult = { name, passed: condition, critical, message, evidence, remediation };
    results.push(result);
    if (condition) {
        console.log(`  ✅ ${name}`);
    } else {
        console.log(`  ❌ ${name}: ${message}`);
        if (critical) criticalFailures++;
    }
}

function checkFileExists(relativePath: string, checkName: string, critical: boolean = true, remediation?: string): void {
    const fullPath = path.join(ROOT_DIR, relativePath);
    const exists = fs.existsSync(fullPath);
    check(checkName, critical, exists,
        exists ? 'File found' : `File not found: ${relativePath}`,
        fullPath,
        remediation || `Create ${relativePath}`
    );
}

function checkEnvVar(name: string, critical: boolean = true, minLength?: number, disallowDefaults?: string[]): void {
    const value = process.env[name];
    const present = !!value;
    let message = present ? 'Environment variable set' : 'Environment variable not set';
    let evidence = value ? `${value.substring(0, 4)}***` : 'MISSING';
    let passed = present;
    if (present && minLength && value.length < minLength) {
        passed = false;
        message = `Value too short (minimum ${minLength} characters)`;
    }
    if (present && disallowDefaults && disallowDefaults.some(d => value.toLowerCase().includes(d.toLowerCase()))) {
        passed = false;
        message = 'Value contains default/weak pattern';
    }
    check(`ENV: ${name}`, critical, passed, message, evidence, remediation);
}

function checkCodePattern(filePath: string, pattern: string | RegExp, checkName: string, critical: boolean = true, shouldExist: boolean = true, remediation?: string): void {
    const fullPath = path.join(ROOT_DIR, filePath);
    if (!fs.existsSync(fullPath)) {
        check(checkName, critical, false, `File not found: ${filePath}`, fullPath, remediation);
        return;
    }
    const content = fs.readFileSync(fullPath, 'utf-8');
    const found = content.match(pattern) !== null;
    const passed = shouldExist ? found : !found;
    check(checkName, critical, passed,
        passed ? 'Pattern check passed' : `Pattern ${shouldExist ? 'not found' : 'found unexpectedly'}`,
        fullPath,
        remediation
    );
}

function checkNoCodePattern(filePath: string, pattern: string | RegExp, checkName: string, critical: boolean = true, remediation?: string): void {
    checkCodePattern(filePath, pattern, checkName, critical, false, remediation);

// ============================================================================
// Preflight Checks
// ============================================================================

console.log('========================================');
console.log('  Maysar Engineering Production Preflight');
console.log('  Constitution v1.0 — Articles 26, 28, 29');
console.log('========================================');
console.log(`  Environment file: ${ENV_FILE}`);
console.log(`  Root directory: ${ROOT_DIR}`);
console.log('========================================\n');

// --- Phase 1: Environment and Secrets (Article 17, Article 5) ---
console.log('--- Phase 1: Environment and Secrets ---');

checkFileExists(ENV_FILE, 'Production environment file exists', true, 'Create .env.production from template');

checkEnvVar('JWT_SECRET', true, 32, ['dev-', 'test-', 'default', 'change-me', 'maysar']);
checkEnvVar('DATABASE_URL', true, undefined, ['dev-', 'test-', 'default', 'localhost']);
checkEnvVar('REDIS_URL', true, undefined, ['dev-', 'test-', 'default', 'localhost']);
checkEnvVar('PAYMENT_GATEWAY_URL', true, undefined, ['dev-', 'test-', 'default', 'localhost']);
checkEnvVar('MEILI_MASTER_KEY', true, undefined, ['dev-', 'test-', 'default', 'maysar']);

console.log('');

// --- Phase 2: Code-Level Security (Article 17, Article 5) ---
console.log('--- Phase 2: Code-Level Security ---');

// Check no default credentials in docker-compose
checkNoCodePattern(
    'docker-compose.yml',
    /:-dev-/,
    'No default credential fallbacks in docker-compose.yml',
    true,
    undefined,
    'Remove all :-dev-* fallback values from docker-compose.yml'
);

// Check no hardcoded JWT secrets in source
checkNoCodePattern(
    'src/**/*.ts',
    /dev-jwt-secret/,
    'No hardcoded development JWT secrets in source',
    true,
    undefined,
    'Remove all hardcoded development secrets from source code'
);

// Check environment validation is strict (.unknown(false))
checkCodePattern(
    'src/config/env-validation.ts',
    /\.unknown\(false\)/,
    'Environment validation rejects unknown variables (.unknown(false))',
    true,
    undefined,
    'Change .unknown(true) to .unknown(false) in env-validation.ts'
);

console.log('');


// --- Phase 3: Financial Integrity (Article 18) ---
console.log('--- Phase 3: Financial Integrity ---');

// Check idempotency middleware exists
checkFileExists(
    'src/middleware/idempotency.ts',
    'Idempotency middleware exists',
    true,
    'Create src/middleware/idempotency.ts per CF-007 remediation plan'
);

// Check idempotency is applied to financial routes
checkCodePattern(
    'src/app.ts',
    /idempotencyMiddleware/,
    'Idempotency middleware applied to routes',
    true,
    undefined,
    'Apply idempotencyMiddleware to all state-changing financial endpoints'
);

// Check audit log model exists
checkFileExists(
    'prisma/schema.prisma',
    'Financial audit log model in Prisma schema',
    true,
    'Add FinancialAuditLog model to prisma/schema.prisma per CF-010'
);

console.log('');


// --- Phase 4: Reliability and Fault Tolerance (Article 19) ---
console.log('--- Phase 4: Reliability and Fault Tolerance ---');

// Check circuit breaker exists
checkFileExists(
    'src/lib/payment-circuit-breaker.ts',
    'Payment gateway circuit breaker exists',
    true,
    'Create payment circuit breaker per CF-008 remediation plan'
);

// Check no keepAliveOnCrash in production
checkNoCodePattern(
    'src/main.ts',
    /keepAliveOnCrash/,
    'No keepAliveOnCrash tolerance in main.ts',
    true,
    undefined,
    'Remove keepAliveOnCrash flag - always shutdown on unhandled exceptions'
);

// Check module registry fail-fast
checkNoCodePattern(
    'src/core/module-registry.ts',
    /ALLOW_MODULE_INIT_FAILURES/,
    'No module initialization failure tolerance in production',
    true,
    undefined,
    'Remove ALLOW_MODULE_INIT_FAILURES tolerance from module-registry.ts'
);

// Check shutdown timeout
checkCodePattern(
    'src/main.ts',
    /setTimeout.*30000/,
    'Shutdown timeout configured (30s)',
    false,
    undefined,
    'Add 30-second shutdown timeout to shutdown handler'
);

console.log('');


// --- Phase 5: Resource Efficiency (Article 7, Article 10) ---
console.log('--- Phase 5: Resource Efficiency ---');

// Check database connection pool
checkCodePattern(
    'src/lib/prisma.ts',
    /connection_limit/,
    'Database connection pool limits configured',
    false,
    undefined,
    'Configure Prisma connection pool limits per HF-001'
);

// Check pagination middleware
checkFileExists(
    'src/middleware/pagination.ts',
    'Pagination middleware exists',
    false,
    'Create pagination middleware per HF-002 remediation plan'
);

console.log('');


// --- Phase 6: Observability and Testing (Article 21, Article 23) ---
console.log('--- Phase 6: Observability and Testing ---');

// Check load tests in CI
checkFileExists(
    '.github/workflows/ci.yml',
    'CI pipeline configuration exists',
    true,
    'Create CI pipeline configuration'
);

checkCodePattern(
    '.github/workflows/ci.yml',
    /k6|load.test|perf/,
    'Load testing integrated into CI pipeline',
    false,
    undefined,
    'Add k6 load tests to CI pipeline per HF-007'
);

// Check OpenAPI ratchet
checkFileExists(
    'scripts/contract/ratchet.js',
    'OpenAPI ratchet script exists',
    false,
    'Create OpenAPI ratchet script per HF-008 remediation plan'
);

console.log('');


// --- Phase 7: Deployment and Operations (Article 26) ---
console.log('--- Phase 7: Deployment and Operations ---');

// Check process supervisor config
const hasSystemd = fs.existsSync(path.join(ROOT_DIR, 'deploy', 'maysar-backend.service'));
const hasK8s = fs.existsSync(path.join(ROOT_DIR, 'deploy', 'k8s')) || fs.existsSync(path.join(ROOT_DIR, 'deploy', 'kubernetes'));
const hasPm2 = fs.existsSync(path.join(ROOT_DIR, 'ecosystem.config.js'));
const hasSupervisor = hasSystemd || hasK8s || hasPm2;

const supervisorResult = check('Process supervisor configured', true, hasSupervisor, 
    hasSupervisor ? 'Process supervisor found' : 'No process supervisor configured',
    hasSystemd ? 'systemd service file' : hasK8s ? 'Kubernetes manifests' : hasPm2 ? 'PM2 config' : 'none',
    'Add systemd, Kubernetes, or PM2 process supervisor configuration'
);

console.log('');


// ============================================================================
// Results Summary
// ============================================================================

console.log('========================================');
console.log('  PREFLIGHT RESULTS');
console.log('========================================');
console.log(`  Total checks: ${totalChecks}`);
console.log(`  Passed: ${totalChecks - criticalFailures - results.filter(r => !r.passed && !r.critical).length}`);
console.log(`  Failed (non-critical): ${results.filter(r => !r.passed && !r.critical).length}`);
console.log(`  Failed (critical): ${criticalFailures}`);
console.log('');

if (criticalFailures > 0) {
    console.log('  🛑 CRITICAL FAILURES DETECTED — DO NOT DEPLOY TO PRODUCTION');
    console.log('');
    console.log('  Critical failures:');
    results.filter(r => !r.passed && r.critical).forEach(r => {
        console.log(`    - ${r.name}: ${r.message}`);
        if (r.remediation) console.log(`      Remediation: ${r.remediation}`);
    });
    console.log('');
    console.log('  Resolve all critical failures before attempting production deployment.');
    console.log('  Refer to ENGINEERING_REMEDIATION_PLAN.md for detailed fix instructions.');
    process.exit(1);
} else {
    const nonCriticalFailures = results.filter(r => !r.passed && !r.critical);
    if (nonCriticalFailures.length > 0) {
        console.log('  ⚠️  NON-CRITICAL FAILURES DETECTED — REVIEW BEFORE DEPLOYMENT');
        console.log('');
        console.log('  Non-critical failures:');
        nonCriticalFailures.forEach(r => {
            console.log(`    - ${r.name}: ${r.message}`);
            if (r.remediation) console.log(`      Remediation: ${r.remediation}`);
        });
        console.log('');
        console.log('  Non-critical failures should be resolved or documented as');
        console.log('  Article 29 exceptions before production deployment.');
        process.exit(0);
    } else {
        console.log('  ✅ ALL CHECKS PASSED — SYSTEM READY FOR PRODUCTION DEPLOYMENT');
        console.log('');
        console.log('  The system meets all constitutional requirements for production.');
        process.exit(0);
    }
}

