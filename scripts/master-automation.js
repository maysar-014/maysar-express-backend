#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TARGETS = {
  1: { services: ['user-service', 'catalog-service', 'checkout-service'], coverage: 90 },
  2: { services: ['inventory-service', 'compliance-service', 'session-service', 'maps-service'], coverage: 90 },
  3: { services: ['order-service', 'logistics-service', 'campaign-service', 'two-factor-service', 'support-service', 'business-registry-service', 'community-service', 'enabler-service', 'pricing-service', 'production-service', 'analytics-service'], coverage: 90 },
  4: { services: ['commission-service', 'wallet-service', 'notification-service', 'training-service'], coverage: 95 },
  5: { services: ['payout-service', 'payment-service', 'sms-service', 'auth-service'], coverage: 95 }
};

class MasterAutomation {
  constructor(phase) {
    this.phase = phase;
    this.config = TARGETS[phase];
    this.startTime = Date.now();
  }

  async execute() {
    console.log('\n\x1b[1m\x1b[35m╔═══════════════════════════════════════════════════════╗\x1b[0m');
    console.log('\x1b[1m\x1b[35m║         MASTER TEST AUTOMATION SYSTEM                ║\x1b[0m');
    console.log('\x1b[1m\x1b[35m╚═══════════════════════════════════════════════════════╝\x1b[0m\n');

    try {
      console.log(`\x1b[36m▶ Phase ${this.phase}\x1b[0m`);
      console.log(`\x1b[36m▶ Services: ${this.config.services.length}\x1b[0m`);
      console.log(`\x1b[36m▶ Target Coverage: ${this.config.coverage}%\x1b[0m\n`);

      // Step 1: Generate Tests
      console.log('\x1b[1m\x1b[33m[STEP 1/3] Generating Tests...\x1b[0m\n');
      await this.generateTests();

      // Step 2: Run Tests
      console.log('\n\x1b[1m\x1b[33m[STEP 2/3] Running Tests with Coverage...\x1b[0m\n');
      const coverage = await this.runTests();

      // Step 3: Verify Coverage
      console.log('\n\x1b[1m\x1b[33m[STEP 3/3] Verifying Coverage...\x1b[0m\n');
      const verification = this.verifyCoverage(coverage);

      // Generate Report
      this.generateReport(verification);

      return verification.passed;

    } catch (error) {
      console.error(`\x1b[31m✗ Automation failed: ${error.message}\x1b[0m`);
      return false;
    }
  }

  async generateTests() {
    try {
      execSync(`node ${path.join(__dirname, 'batch-test-generator.js')} ${this.phase}`, {
        stdio: 'inherit',
        cwd: __dirname
      });
      console.log('\x1b[32m✓ Test generation completed\x1b[0m');
    } catch (error) {
      console.log('\x1b[33m⚠ Some tests may have failed to generate\x1b[0m');
    }
  }

  async runTests() {
    const results = {};

    for (const service of this.config.services) {
      try {
        console.log(`\x1b[34m▶\x1b[0m Testing ${service}...`);
        
        const servicePath = path.join(__dirname, '..', 'services', service);
        
        execSync('npm test -- --coverage --watchAll=false --silent', {
          cwd: servicePath,
          stdio: 'pipe'
        });

        const coveragePath = path.join(servicePath, 'coverage', 'coverage-summary.json');
        
        if (fs.existsSync(coveragePath)) {
          const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
          const total = coverage.total;
          
          const avg = (
            total.statements.pct + 
            total.branches.pct + 
            total.functions.pct + 
            total.lines.pct
          ) / 4;

          results[service] = {
            coverage: avg,
            metrics: {
              statements: total.statements.pct,
              branches: total.branches.pct,
              functions: total.functions.pct,
              lines: total.lines.pct
            }
          };

          console.log(`\x1b[32m✓\x1b[0m ${service}: ${avg.toFixed(2)}%`);
        } else {
          results[service] = { coverage: 0, error: 'No coverage file' };
          console.log(`\x1b[33m⚠\x1b[0m ${service}: No coverage data`);
        }

      } catch (error) {
        results[service] = { coverage: 0, error: error.message.substring(0, 100) };
        console.log(`\x1b[31m✗\x1b[0m ${service}: Test failed`);
      }
    }

    return results;
  }

  verifyCoverage(coverage) {
    const passed = [];
    const failed = [];

    for (const [service, data] of Object.entries(coverage)) {
      if (data.coverage >= this.config.coverage) {
        passed.push({ service, coverage: data.coverage, metrics: data.metrics });
      } else {
        failed.push({ 
          service, 
          coverage: data.coverage, 
          target: this.config.coverage,
          gap: this.config.coverage - data.coverage,
          error: data.error
        });
      }
    }

    return { passed, failed };
  }

  generateReport(verification) {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    
    console.log('\n\x1b[1m\x1b[35m╔═══════════════════════════════════════════════════════╗\x1b[0m');
    console.log('\x1b[1m\x1b[35m║              AUTOMATION SUMMARY                       ║\x1b[0m');
    console.log('\x1b[1m\x1b[35m╚═══════════════════════════════════════════════════════╝\x1b[0m\n');

    console.log(`Phase: ${this.phase}`);
    console.log(`Duration: ${duration}s`);
    console.log(`Target Coverage: ${this.config.coverage}%`);
    console.log(`\x1b[32m✓ Passed: ${verification.passed.length}/${this.config.services.length}\x1b[0m`);
    console.log(`\x1b[31m✗ Failed: ${verification.failed.length}/${this.config.services.length}\x1b[0m`);

    const successRate = ((verification.passed.length / this.config.services.length) * 100).toFixed(1);
    console.log(`Success Rate: ${successRate}%\n`);

    if (verification.failed.length > 0) {
      console.log('\x1b[33mServices needing attention:\x1b[0m');
      verification.failed.forEach(f => {
        console.log(`  • ${f.service}: ${f.coverage.toFixed(2)}% (gap: ${f.gap.toFixed(2)}%)`);
      });
      console.log();
    }

    const report = {
      phase: this.phase,
      timestamp: new Date().toISOString(),
      duration: `${duration}s`,
      target: this.config.coverage,
      summary: {
        total: this.config.services.length,
        passed: verification.passed.length,
        failed: verification.failed.length,
        successRate: `${successRate}%`
      },
      passed: verification.passed,
      failed: verification.failed
    };

    const reportPath = path.join(__dirname, '..', `PHASE${this.phase}-COMPLETE-REPORT.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    const mdPath = path.join(__dirname, '..', `PHASE${this.phase}-COMPLETE-REPORT.md`);
    fs.writeFileSync(mdPath, this.generateMarkdown(report));
    
    console.log(`\x1b[32m✓\x1b[0m Reports saved: PHASE${this.phase}-COMPLETE-REPORT.{json,md}\n`);
  }

  generateMarkdown(report) {
    let md = `# Phase ${this.phase} - Complete Automation Report\n\n`;
    md += `**Date:** ${new Date(report.timestamp).toLocaleString()}  \n`;
    md += `**Duration:** ${report.duration}  \n`;
    md += `**Target Coverage:** ${report.target}%  \n\n`;
    
    md += `## Summary\n\n`;
    md += `- Total Services: ${report.summary.total}\n`;
    md += `- ✅ Passed: ${report.summary.passed}\n`;
    md += `- ❌ Failed: ${report.summary.failed}\n`;
    md += `- Success Rate: ${report.summary.successRate}\n\n`;

    if (report.passed.length > 0) {
      md += `## ✅ Passed Services\n\n`;
      md += `| Service | Coverage | Statements | Branches | Functions | Lines |\n`;
      md += `|---------|----------|------------|----------|-----------|-------|\n`;
      report.passed.forEach(s => {
        const m = s.metrics || {};
        md += `| ${s.service} | ${s.coverage.toFixed(2)}% | ${m.statements?.toFixed(2) || 'N/A'}% | ${m.branches?.toFixed(2) || 'N/A'}% | ${m.functions?.toFixed(2) || 'N/A'}% | ${m.lines?.toFixed(2) || 'N/A'}% |\n`;
      });
      md += `\n`;
    }

    if (report.failed.length > 0) {
      md += `## ❌ Failed Services\n\n`;
      md += `| Service | Coverage | Target | Gap | Issue |\n`;
      md += `|---------|----------|--------|-----|-------|\n`;
      report.failed.forEach(s => {
        const issue = s.error || 'Below target';
        md += `| ${s.service} | ${s.coverage.toFixed(2)}% | ${s.target}% | ${s.gap.toFixed(2)}% | ${issue} |\n`;
      });
      md += `\n`;
    }

    md += `## Next Steps\n\n`;
    if (report.failed.length > 0) {
      md += `1. Review failed services and add missing tests\n`;
      md += `2. Focus on uncovered branches and edge cases\n`;
      md += `3. Re-run automation for failed services\n`;
    } else {
      md += `🎉 All services passed! Ready for next phase.\n`;
    }

    return md;
  }
}

const phase = parseInt(process.argv[2]);
if (!phase || !TARGETS[phase]) {
  console.error('Usage: node master-automation.js <phase>');
  console.error('Available phases: 1, 2, 3, 4, 5');
  process.exit(1);
}

const automation = new MasterAutomation(phase);
automation.execute().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
