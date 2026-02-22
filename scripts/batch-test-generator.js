#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PHASES = {
  1: ['user-service', 'catalog-service', 'checkout-service'],
  2: ['inventory-service', 'compliance-service', 'session-service', 'maps-service'],
  3: [
    'order-service', 'logistics-service', 'campaign-service', 'two-factor-service',
    'support-service', 'business-registry-service', 'community-service', 'enabler-service',
    'pricing-service', 'production-service', 'analytics-service'
  ],
  4: [
    'commission-service', 'wallet-service', 'notification-service', 'training-service'
  ],
  5: [
    'payout-service', 'payment-service', 'sms-service', 'auth-service'
  ]
};

class BatchTestGenerator {
  constructor(phase) {
    this.phase = phase;
    this.services = PHASES[phase] || [];
    this.results = [];
  }

  async run() {
    console.log(`\n\x1b[1m\x1b[36m🚀 BATCH TEST GENERATION - PHASE ${this.phase}\x1b[0m\n`);
    console.log(`Services: ${this.services.length}\n`);

    const startTime = Date.now();

    for (const service of this.services) {
      await this.generateForService(service);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    this.printSummary(duration);
  }

  async generateForService(service) {
    return new Promise((resolve) => {
      console.log(`\x1b[34m▶\x1b[0m Generating tests for ${service}...`);

      const proc = spawn('node', [
        path.join(__dirname, 'turbo-test-generator.js'),
        service
      ], { stdio: 'pipe' });

      let output = '';
      proc.stdout.on('data', (data) => { output += data.toString(); });
      proc.stderr.on('data', (data) => { output += data.toString(); });

      proc.on('close', (code) => {
        const match = output.match(/Generated: (\d+) \| Skipped: (\d+)/);
        const generated = match ? parseInt(match[1]) : 0;
        const skipped = match ? parseInt(match[2]) : 0;

        this.results.push({
          service,
          generated,
          skipped,
          success: code === 0
        });

        if (code === 0) {
          console.log(`\x1b[32m✓\x1b[0m ${service}: ${generated} tests generated\n`);
        } else {
          console.log(`\x1b[31m✗\x1b[0m ${service}: Failed\n`);
        }

        resolve();
      });
    });
  }

  printSummary(duration) {
    console.log(`\n\x1b[1m\x1b[36m═══════════════════════════════════════\x1b[0m`);
    console.log(`\x1b[1m\x1b[36m  BATCH GENERATION SUMMARY\x1b[0m`);
    console.log(`\x1b[1m\x1b[36m═══════════════════════════════════════\x1b[0m\n`);

    const totalGenerated = this.results.reduce((sum, r) => sum + r.generated, 0);
    const totalSkipped = this.results.reduce((sum, r) => sum + r.skipped, 0);
    const successful = this.results.filter(r => r.success).length;

    console.log(`Phase: ${this.phase}`);
    console.log(`Duration: ${duration}s`);
    console.log(`Services: ${this.services.length}`);
    console.log(`\x1b[32mSuccessful: ${successful}\x1b[0m`);
    console.log(`\x1b[33mTests Generated: ${totalGenerated}\x1b[0m`);
    console.log(`\x1b[90mTests Skipped: ${totalSkipped}\x1b[0m\n`);

    const report = {
      phase: this.phase,
      timestamp: new Date().toISOString(),
      duration: `${duration}s`,
      summary: {
        services: this.services.length,
        successful,
        testsGenerated: totalGenerated,
        testsSkipped: totalSkipped
      },
      details: this.results
    };

    const reportPath = path.join(__dirname, '..', `PHASE${this.phase}-TEST-GENERATION.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\x1b[32m✓\x1b[0m Report saved: PHASE${this.phase}-TEST-GENERATION.json\n`);
  }
}

const phase = parseInt(process.argv[2]);
if (!phase || !PHASES[phase]) {
  console.error('Usage: node batch-test-generator.js <phase>');
  console.error('Available phases: 1, 2, 3, 4, 5');
  process.exit(1);
}

const generator = new BatchTestGenerator(phase);
generator.run().catch(error => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
