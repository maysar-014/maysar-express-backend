#!/usr/bin/env node

/**
 * Professional Coverage Verification Script
 * Runs tests and verifies coverage targets for multiple services
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.cyan}${msg}${colors.reset}\n`)
};

class CoverageVerifier {
  constructor(services) {
    this.services = services;
    this.results = [];
    this.startTime = Date.now();
  }

  async verifyAll() {
    log.header('═══════════════════════════════════════════════════════');
    log.header('  COVERAGE VERIFICATION - PHASE 2');
    log.header('═══════════════════════════════════════════════════════');

    for (const service of this.services) {
      await this.verifyService(service);
    }

    this.printSummary();
    this.generateReport();
    
    return this.results.every(r => r.passed);
  }

  async verifyService(service) {
    log.header(`Testing: ${service.name}`);
    
    const servicePath = path.join(__dirname, '..', 'services', service.name);
    
    // Check if service exists
    if (!fs.existsSync(servicePath)) {
      log.error(`Service directory not found: ${servicePath}`);
      this.results.push({ ...service, passed: false, error: 'Directory not found' });
      return;
    }

    // Check if package.json exists
    const packageJsonPath = path.join(servicePath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      log.error(`package.json not found in ${service.name}`);
      this.results.push({ ...service, passed: false, error: 'No package.json' });
      return;
    }

    try {
      log.info(`Running tests for ${service.name}...`);
      
      // Run tests with coverage
      const output = execSync(
        'npm test -- --coverage --watchAll=false --silent --coverageReporters=json-summary',
        { 
          cwd: servicePath,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        }
      );

      // Read coverage summary
      const coveragePath = path.join(servicePath, 'coverage', 'coverage-summary.json');
      
      if (!fs.existsSync(coveragePath)) {
        log.warn(`Coverage file not found for ${service.name}`);
        this.results.push({ ...service, passed: false, error: 'No coverage file' });
        return;
      }

      const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      const total = coverage.total;
      
      const metrics = {
        statements: total.statements.pct,
        branches: total.branches.pct,
        functions: total.functions.pct,
        lines: total.lines.pct
      };

      const avgCoverage = (metrics.statements + metrics.branches + metrics.functions + metrics.lines) / 4;
      const passed = avgCoverage >= service.target;

      log.success(`${service.name}: ${avgCoverage.toFixed(2)}% (target: ${service.target}%)`);
      log.info(`  Statements: ${metrics.statements}% | Branches: ${metrics.branches}%`);
      log.info(`  Functions: ${metrics.functions}% | Lines: ${metrics.lines}%`);

      this.results.push({
        ...service,
        passed,
        coverage: avgCoverage,
        metrics,
        testsPassed: true
      });

    } catch (error) {
      log.error(`Failed to test ${service.name}`);
      log.error(`  ${error.message.split('\n')[0]}`);
      
      this.results.push({
        ...service,
        passed: false,
        error: error.message.substring(0, 200),
        testsPassed: false
      });
    }
  }

  printSummary() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    
    log.header('═══════════════════════════════════════════════════════');
    log.header('  VERIFICATION SUMMARY');
    log.header('═══════════════════════════════════════════════════════');

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;

    console.log(`\nServices Verified: ${this.results.length}`);
    console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
    console.log(`Duration: ${duration}s\n`);

    if (failed > 0) {
      log.warn('Failed Services:');
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.name}: ${r.error || `Coverage ${r.coverage?.toFixed(2)}% < ${r.target}%`}`);
      });
    }

    console.log();
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      phase: 'Phase 2',
      duration: ((Date.now() - this.startTime) / 1000).toFixed(2),
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.passed).length,
        failed: this.results.filter(r => !r.passed).length
      },
      services: this.results.map(r => ({
        name: r.name,
        target: r.target,
        coverage: r.coverage?.toFixed(2),
        passed: r.passed,
        metrics: r.metrics,
        error: r.error
      }))
    };

    const reportPath = path.join(__dirname, '..', 'PHASE2-VERIFICATION-REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    log.success(`Report saved: PHASE2-VERIFICATION-REPORT.json`);
  }
}

// Phase 2 Services
const phase2Services = [
  { name: 'inventory-service', target: 95 },
  { name: 'compliance-service', target: 95 },
  { name: 'session-service', target: 95 },
  { name: 'maps-service', target: 90 }
];

// Run verification
const verifier = new CoverageVerifier(phase2Services);
verifier.verifyAll().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  log.error(`Verification failed: ${error.message}`);
  process.exit(1);
});
