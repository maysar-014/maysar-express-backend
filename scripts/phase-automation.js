#!/usr/bin/env node

/**
 * Phase Automation Master Script
 * Orchestrates test generation, execution, and verification for any phase
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.cyan}${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.magenta}▶${colors.reset} ${colors.bold}${msg}${colors.reset}`)
};

class PhaseAutomation {
  constructor(phase, services) {
    this.phase = phase;
    this.services = services;
    this.results = {
      generated: [],
      tested: [],
      passed: [],
      failed: []
    };
    this.startTime = Date.now();
  }

  async execute() {
    log.header('═══════════════════════════════════════════════════════');
    log.header(`  PHASE ${this.phase} AUTOMATION`);
    log.header('═══════════════════════════════════════════════════════');

    try {
      // Step 1: Verify services exist
      log.section('Step 1: Verifying Services');
      await this.verifyServices();

      // Step 2: Run tests with coverage
      log.section('Step 2: Running Coverage Tests');
      await this.runCoverageTests();

      // Step 3: Generate report
      log.section('Step 3: Generating Report');
      await this.generateReport();

      // Step 4: Summary
      this.printSummary();

      return this.results.failed.length === 0;

    } catch (error) {
      log.error(`Automation failed: ${error.message}`);
      return false;
    }
  }

  async verifyServices() {
    for (const service of this.services) {
      const servicePath = path.join(__dirname, '..', 'services', service.name);
      
      if (!fs.existsSync(servicePath)) {
        log.error(`Service not found: ${service.name}`);
        this.results.failed.push({ service: service.name, reason: 'Not found' });
        continue;
      }

      // Check for tests directory
      const testsPath = path.join(servicePath, 'tests');
      const testFiles = fs.existsSync(testsPath) 
        ? fs.readdirSync(testsPath, { recursive: true })
            .filter(f => f.endsWith('.test.ts')).length
        : 0;

      log.info(`${service.name}: ${testFiles} test files found`);
      
      if (testFiles === 0) {
        log.warn(`No tests found for ${service.name}`);
      }
    }
  }

  async runCoverageTests() {
    const maxParallel = 3; // Run 3 services in parallel
    const chunks = this.chunkArray(this.services, maxParallel);

    for (const chunk of chunks) {
      await Promise.all(chunk.map(service => this.testService(service)));
    }
  }

  async testService(service) {
    const servicePath = path.join(__dirname, '..', 'services', service.name);
    
    try {
      log.info(`Testing ${service.name}...`);

      // Run tests with coverage
      execSync(
        'npm test -- --coverage --watchAll=false --silent --coverageReporters=json-summary',
        { 
          cwd: servicePath,
          encoding: 'utf8',
          stdio: 'pipe'
        }
      );

      // Read coverage
      const coveragePath = path.join(servicePath, 'coverage', 'coverage-summary.json');
      
      if (!fs.existsSync(coveragePath)) {
        throw new Error('Coverage file not generated');
      }

      const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      const total = coverage.total;
      
      const avgCoverage = (
        total.statements.pct + 
        total.branches.pct + 
        total.functions.pct + 
        total.lines.pct
      ) / 4;

      const passed = avgCoverage >= service.target;

      if (passed) {
        log.success(`${service.name}: ${avgCoverage.toFixed(2)}% ✓`);
        this.results.passed.push({
          service: service.name,
          coverage: avgCoverage,
          target: service.target,
          metrics: {
            statements: total.statements.pct,
            branches: total.branches.pct,
            functions: total.functions.pct,
            lines: total.lines.pct
          }
        });
      } else {
        log.warn(`${service.name}: ${avgCoverage.toFixed(2)}% (target: ${service.target}%)`);
        this.results.failed.push({
          service: service.name,
          coverage: avgCoverage,
          target: service.target,
          gap: service.target - avgCoverage
        });
      }

      this.results.tested.push(service.name);

    } catch (error) {
      log.error(`${service.name}: Test execution failed`);
      this.results.failed.push({
        service: service.name,
        error: error.message.substring(0, 100)
      });
    }
  }

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  async generateReport() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    
    const report = {
      phase: this.phase,
      timestamp: new Date().toISOString(),
      duration: `${duration}s`,
      summary: {
        total: this.services.length,
        tested: this.results.tested.length,
        passed: this.results.passed.length,
        failed: this.results.failed.length,
        successRate: `${((this.results.passed.length / this.services.length) * 100).toFixed(1)}%`
      },
      passed: this.results.passed,
      failed: this.results.failed
    };

    const reportPath = path.join(__dirname, '..', `PHASE${this.phase}-AUTOMATION-REPORT.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    log.success(`Report saved: PHASE${this.phase}-AUTOMATION-REPORT.json`);

    // Generate markdown report
    const mdReport = this.generateMarkdownReport(report);
    const mdPath = path.join(__dirname, '..', `PHASE${this.phase}-AUTOMATION-REPORT.md`);
    fs.writeFileSync(mdPath, mdReport);
    log.success(`Markdown report: PHASE${this.phase}-AUTOMATION-REPORT.md`);
  }

  generateMarkdownReport(report) {
    let md = `# Phase ${this.phase} Automation Report\n\n`;
    md += `**Date:** ${new Date(report.timestamp).toLocaleString()}\n`;
    md += `**Duration:** ${report.duration}\n\n`;
    
    md += `## Summary\n\n`;
    md += `- Total Services: ${report.summary.total}\n`;
    md += `- Tested: ${report.summary.tested}\n`;
    md += `- ✅ Passed: ${report.summary.passed}\n`;
    md += `- ❌ Failed: ${report.summary.failed}\n`;
    md += `- Success Rate: ${report.summary.successRate}\n\n`;

    if (report.passed.length > 0) {
      md += `## ✅ Passed Services\n\n`;
      md += `| Service | Coverage | Target | Statements | Branches | Functions | Lines |\n`;
      md += `|---------|----------|--------|------------|----------|-----------|-------|\n`;
      report.passed.forEach(s => {
        md += `| ${s.service} | ${s.coverage.toFixed(2)}% | ${s.target}% | ${s.metrics.statements}% | ${s.metrics.branches}% | ${s.metrics.functions}% | ${s.metrics.lines}% |\n`;
      });
      md += `\n`;
    }

    if (report.failed.length > 0) {
      md += `## ❌ Failed Services\n\n`;
      md += `| Service | Coverage | Target | Gap | Error |\n`;
      md += `|---------|----------|--------|-----|-------|\n`;
      report.failed.forEach(s => {
        const coverage = s.coverage ? `${s.coverage.toFixed(2)}%` : 'N/A';
        const gap = s.gap ? `${s.gap.toFixed(2)}%` : 'N/A';
        const error = s.error ? s.error.substring(0, 50) : '-';
        md += `| ${s.service} | ${coverage} | ${s.target}% | ${gap} | ${error} |\n`;
      });
      md += `\n`;
    }

    return md;
  }

  printSummary() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    
    log.header('═══════════════════════════════════════════════════════');
    log.header('  AUTOMATION SUMMARY');
    log.header('═══════════════════════════════════════════════════════');

    console.log(`\nPhase: ${this.phase}`);
    console.log(`Duration: ${duration}s`);
    console.log(`Services: ${this.services.length}`);
    console.log(`${colors.green}Passed: ${this.results.passed.length}${colors.reset}`);
    console.log(`${colors.red}Failed: ${this.results.failed.length}${colors.reset}`);
    
    const successRate = ((this.results.passed.length / this.services.length) * 100).toFixed(1);
    console.log(`Success Rate: ${successRate}%\n`);

    if (this.results.failed.length > 0) {
      log.warn('Services needing attention:');
      this.results.failed.forEach(f => {
        const msg = f.error || `Coverage ${f.coverage?.toFixed(2)}% < ${f.target}%`;
        console.log(`  - ${f.service}: ${msg}`);
      });
    } else {
      log.success('All services passed! 🎉');
    }

    console.log();
  }
}

// Phase configurations
const phases = {
  2: [
    { name: 'inventory-service', target: 95 },
    { name: 'compliance-service', target: 95 },
    { name: 'session-service', target: 95 },
    { name: 'maps-service', target: 90 }
  ],
  3: [
    { name: 'order-service', target: 95 },
    { name: 'logistics-service', target: 95 },
    { name: 'campaign-service', target: 95 },
    { name: 'two-factor-service', target: 95 },
    { name: 'support-service', target: 95 },
    { name: 'business-registry-service', target: 95 },
    { name: 'community-service', target: 90 },
    { name: 'enabler-service', target: 90 },
    { name: 'pricing-service', target: 95 },
    { name: 'production-service', target: 90 },
    { name: 'analytics-service', target: 95 }
  ]
};

// CLI
const phaseNumber = parseInt(process.argv[2]);

if (!phaseNumber || !phases[phaseNumber]) {
  console.error('Usage: node phase-automation.js <phase-number>');
  console.error('Available phases: 2, 3');
  process.exit(1);
}

const automation = new PhaseAutomation(phaseNumber, phases[phaseNumber]);
automation.execute().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  log.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
