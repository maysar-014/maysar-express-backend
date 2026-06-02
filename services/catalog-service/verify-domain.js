#!/usr/bin/env node

/**
 * Domain Layer Verification Script
 * Comprehensive verification of domain layer purity and constitution compliance
 * Run with: node verify-domain.js
 */

const fs = require('fs');
const path = require('path');

class DomainVerifier {
  constructor() {
    this.domainRoot = path.join(__dirname, 'src', 'domain');
    this.results = {
      files: [],
      violations: [],
      warnings: [],
      stats: {
        totalFiles: 0,
        pureFiles: 0,
        violationsFound: 0,
        warningsFound: 0
      }
    };
  }

  async runVerification() {
    console.log('🔍 Starting Domain Layer Verification...\n');

    try {
      // Get all domain files
      this.results.files = this.getDomainFiles();
      this.results.stats.totalFiles = this.results.files.length;

      console.log(`📁 Found ${this.results.files.length} domain files to verify`);

      // Run all verification checks
      await this.runCompilationCheck();
      await this.runPurityCheck();
      await this.runIsolationCheck();
      await this.runConstitutionCheck();

      // Generate report
      this.generateReport();

      // Exit with appropriate code
      const hasViolations = this.results.violations.length > 0;
      process.exit(hasViolations ? 1 : 0);

    } catch (error) {
      console.error('❌ Verification failed:', error.message);
      process.exit(1);
    }
  }

  getDomainFiles() {
    const files = [];

    function scanDirectory(dir) {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      }
    }

    scanDirectory(this.domainRoot);
    return files;
  }

  async runCompilationCheck() {
    console.log('\n📝 Running Compilation Purity Check...');

    const prohibitedImports = [
      'fs', 'path', 'os', 'child_process', 'http', 'https', 'net',
      'prisma', 'mongoose', 'sequelize', 'typeorm', 'redis', 'memcached',
      'aws-sdk', 'google-cloud', '@aws-sdk', 'paymentGateway',
      'axios', 'request', 'node-fetch', 'got'
    ];

    let pureFiles = 0;

    for (const file of this.results.files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const relativePath = path.relative(this.domainRoot, file);
        let fileViolations = [];

        // Check for external imports
        const importRegex = /import\s+.*from\s+['"]([^'"]+)['"]/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
          const importPath = match[1];
          if (!importPath.startsWith('./') && !importPath.startsWith('../') &&
              !importPath.startsWith('@types/') && !this.isAllowedImport(importPath)) {
            fileViolations.push(`External import: ${importPath}`);
          }
        }

        // Check for require statements
        const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
        while ((match = requireRegex.exec(content)) !== null) {
          const requirePath = match[1];
          if (prohibitedImports.includes(requirePath) ||
              prohibitedImports.some(lib => requirePath.includes(lib))) {
            fileViolations.push(`Prohibited require: ${requirePath}`);
          }
        }

        if (fileViolations.length === 0) {
          pureFiles++;
        } else {
          this.results.violations.push({
            type: 'compilation',
            file: relativePath,
            violations: fileViolations
          });
        }

      } catch (error) {
        this.results.violations.push({
          type: 'compilation',
          file: path.relative(this.domainRoot, file),
          violations: [`File read error: ${error.message}`]
        });
      }
    }

    this.results.stats.pureFiles = pureFiles;
    const purityRate = ((pureFiles / this.results.files.length) * 100).toFixed(1);

    console.log(`✅ Compilation check complete: ${pureFiles}/${this.results.files.length} files pure (${purityRate}%)`);
  }

  async runPurityCheck() {
    console.log('\n🧹 Running Domain Purity Check...');

    const prohibitedPatterns = [
      { pattern: /\bprocess\.env\b/g, type: 'environment_variable', description: 'Environment variable access' },
      { pattern: /\bDeno\.env\b/g, type: 'environment_variable', description: 'Deno environment access' },
      { pattern: /\bfs\./g, type: 'file_system', description: 'File system operation' },
      { pattern: /\brequire\s*\(/g, type: 'dynamic_import', description: 'Dynamic require statement' },
      { pattern: /\bfetch\s*\(/g, type: 'network', description: 'Network fetch call' },
      { pattern: /\bXMLHttpRequest\b/g, type: 'network', description: 'XMLHttpRequest usage' },
      { pattern: /\baxios\b/g, type: 'external_library', description: 'Axios HTTP client' },
      { pattern: /\bprisma\b/g, type: 'database', description: 'Prisma database client' },
      { pattern: /\bmongoose\b/g, type: 'database', description: 'Mongoose ODM' },
      { pattern: /\bredis\b/g, type: 'cache', description: 'Redis cache client' },
      { pattern: /\baws-sdk\b/g, type: 'external_service', description: 'AWS SDK' },
      { pattern: /\bpaymentGateway\b/g, type: 'external_service', description: 'PaymentGateway payment service' },
    ];

    for (const file of this.results.files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const relativePath = path.relative(this.domainRoot, file);
        let fileViolations = [];

        for (const { pattern, type, description } of prohibitedPatterns) {
          const matches = content.match(pattern);
          if (matches) {
            for (const match of matches) {
              fileViolations.push(`${description}: ${match}`);
            }
          }
        }

        if (fileViolations.length > 0) {
          this.results.violations.push({
            type: 'purity',
            file: relativePath,
            violations: fileViolations
          });
        }

      } catch (error) {
        this.results.violations.push({
          type: 'purity',
          file: path.relative(this.domainRoot, file),
          violations: [`File read error: ${error.message}`]
        });
      }
    }

    const violationsFound = this.results.violations.filter(v => v.type === 'purity').length;
    console.log(`✅ Purity check complete: ${violationsFound} purity violations found`);
  }

  async runIsolationCheck() {
    console.log('\n🔒 Running Isolation Test...');

    // Test if domain modules can be imported without external dependencies
    const testResults = [];

    for (const file of this.results.files) {
      const relativePath = path.relative(this.domainRoot, file);
      const moduleName = relativePath.replace(/\.ts$/, '').replace(/\\/g, '/');

      try {
        // In a real scenario, we would attempt to require the module
        // For now, we'll do static analysis
        const content = fs.readFileSync(file, 'utf8');

        // Check for infrastructure patterns
        const infraPatterns = [
          'database', 'prisma', 'mongoose', 'redis', 'cache', 'message', 'queue',
          'aws', 'gcp', 'azure', 'paymentGateway', 'africastalking'
        ];

        let infraDependencies = [];
        for (const pattern of infraPatterns) {
          if (content.toLowerCase().includes(pattern)) {
            infraDependencies.push(pattern);
          }
        }

        if (infraDependencies.length > 0) {
          testResults.push({
            module: moduleName,
            status: 'failed',
            dependencies: infraDependencies
          });
        } else {
          testResults.push({
            module: moduleName,
            status: 'passed',
            dependencies: []
          });
        }

      } catch (error) {
        testResults.push({
          module: moduleName,
          status: 'error',
          error: error.message
        });
      }
    }

    const failedModules = testResults.filter(r => r.status === 'failed');
    if (failedModules.length > 0) {
      this.results.violations.push({
        type: 'isolation',
        file: 'multiple_modules',
        violations: failedModules.map(m => `${m.module}: depends on ${m.dependencies.join(', ')}`)
      });
    }

    console.log(`✅ Isolation test complete: ${failedModules.length} modules with infrastructure dependencies`);
  }

  async runConstitutionCheck() {
    console.log('\n📋 Running Constitution Compliance Check...');

    // Check Clean Architecture principles
    const constitutionViolations = [];

    // Check for domain layer structure
    const requiredDirectories = ['entities', 'value-objects', 'events', 'services', 'policies', 'algorithms'];
    const existingDirectories = fs.readdirSync(this.domainRoot)
      .filter(item => fs.statSync(path.join(this.domainRoot, item)).isDirectory());

    const missingDirectories = requiredDirectories.filter(dir => !existingDirectories.includes(dir));
    if (missingDirectories.length > 0) {
      constitutionViolations.push(`Missing required directories: ${missingDirectories.join(', ')}`);
    }

    // Check for interface definitions
    let hasInterfaces = false;
    for (const file of this.results.files) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('interface ') || content.includes('export interface')) {
        hasInterfaces = true;
        break;
      }
    }

    if (!hasInterfaces) {
      constitutionViolations.push('No interface definitions found in domain layer');
    }

    if (constitutionViolations.length > 0) {
      this.results.violations.push({
        type: 'constitution',
        file: 'domain_layer',
        violations: constitutionViolations
      });
    }

    console.log(`✅ Constitution check complete: ${constitutionViolations.length} violations found`);
  }

  isAllowedImport(importPath) {
    const allowedImports = [
      'typescript',
      'path', 'url', 'util', 'events', 'stream', 'buffer', 'crypto'
    ];

    return allowedImports.includes(importPath) ||
           importPath.startsWith('./') ||
           importPath.startsWith('../') ||
           importPath.startsWith('@types/');
  }

  generateReport() {
    console.log('\n📊 Domain Verification Results\n');

    this.results.stats.violationsFound = this.results.violations.length;

    // Summary
    console.log('='.repeat(60));
    console.log('DOMAIN LAYER VERIFICATION REPORT');
    console.log('='.repeat(60));
    console.log(`Total Files Analyzed: ${this.results.stats.totalFiles}`);
    console.log(`Pure Files: ${this.results.stats.pureFiles}`);
    console.log(`Violations Found: ${this.results.stats.violationsFound}`);
    console.log(`Purity Rate: ${((this.results.stats.pureFiles / this.results.stats.totalFiles) * 100).toFixed(1)}%`);

    if (this.results.violations.length === 0) {
      console.log('\n🎉 ALL CHECKS PASSED! Domain layer is pure and compliant.');
      console.log('\n✅ Clean Architecture Constitution Maintained');
      console.log('✅ Domain Layer Isolation Verified');
      console.log('✅ No External Dependencies Found');
      console.log('✅ Infrastructure Independence Confirmed');
    } else {
      console.log('\n❌ VIOLATIONS FOUND! Domain layer purity compromised.\n');

      // Group violations by type
      const violationsByType = {};
      for (const violation of this.results.violations) {
        if (!violationsByType[violation.type]) {
          violationsByType[violation.type] = [];
        }
        violationsByType[violation.type].push(violation);
      }

      for (const [type, violations] of Object.entries(violationsByType)) {
        console.log(`\n🔴 ${type.toUpperCase()} VIOLATIONS:`);
        for (const violation of violations) {
          console.log(`  📁 ${violation.file}:`);
          for (const v of violation.violations) {
            console.log(`    ❌ ${v}`);
          }
        }
      }

      console.log('\n💡 RECOMMENDATIONS:');
      console.log('  • Move external dependencies to Infrastructure layer');
      console.log('  • Remove environment variable access from domain logic');
      console.log('  • Use dependency injection for external services');
      console.log('  • Ensure domain logic is pure and testable in isolation');
    }

    console.log('\n' + '='.repeat(60));

    // Save detailed report
    this.saveDetailedReport();
  }

  saveDetailedReport() {
    const reportPath = path.join(__dirname, 'domain-verification-report.json');

    const report = {
      timestamp: new Date().toISOString(),
      summary: this.results.stats,
      violations: this.results.violations,
      files: this.results.files.map(f => path.relative(this.domainRoot, f)),
      constitution: {
        compliant: this.results.violations.length === 0,
        purity_score: ((this.results.stats.pureFiles / this.results.stats.totalFiles) * 100).toFixed(1) + '%',
        isolation_verified: this.results.violations.filter(v => v.type === 'isolation').length === 0,
        architecture_compliant: this.results.violations.filter(v => v.type === 'constitution').length === 0
      }
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Detailed report saved to: ${reportPath}`);
  }
}

// Run verification if called directly
if (require.main === module) {
  const verifier = new DomainVerifier();
  verifier.runVerification().catch(error => {
    console.error('Verification failed:', error);
    process.exit(1);
  });
}

module.exports = DomainVerifier;

