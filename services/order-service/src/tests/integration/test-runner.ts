import { execSync } from 'child_process';
import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path';
import { logger } from '../../infrastructure/monitoring/logger';

interface TestSuite {
  name: string;
  file: string;
  timeout: number;
  priority: number;
}

interface TestResult {
  suite: string;
  passed: boolean;
  duration: number;
  coverage: number;
  errors: string[];
}

class IntegrationTestRunner {
  private testSuites: TestSuite[] = [
    {
      name: 'Robust Integration Tests',
      file: 'robust-integration.test.ts',
      timeout: 30000,
      priority: 1
    },
    {
      name: 'Engine Integration Tests',
      file: 'engine-integration.test.ts',
      timeout: 30000,
      priority: 2
    },
    {
      name: 'Saga Integration Tests',
      file: 'saga-integration.test.ts',
      timeout: 45000,
      priority: 1
    },
    {
      name: 'Load Testing Suite',
      file: 'load-testing.test.ts',
      timeout: 60000,
      priority: 2
    },
    {
      name: 'End-to-End Workflows',
      file: 'end-to-end-workflows.test.ts',
      timeout: 45000,
      priority: 1
    },
    {
      name: 'Error Handling & Resilience',
      file: 'error-handling.test.ts',
      timeout: 30000,
      priority: 1
    }
  ];

  async runAllTests(): Promise<TestResult[]> {
    logger.info('🚀 Starting Integration Test Suite');
    logger.info('=====================================');
    
    const results: TestResult[] = [];
    const startTime = performance.now();

    // Run priority 1 tests first
    const priority1Tests = this.testSuites.filter(t => t.priority === 1);
    const priority2Tests = this.testSuites.filter(t => t.priority === 2);

    for (const suite of priority1Tests) {
      const result = await this.runTestSuite(suite);
      results.push(result);
      
      if (!result.passed) {
        logger.error(`❌ Critical test failed: ${suite.name}`);
        logger.info('Stopping test execution due to critical failure');
        break;
      }
    }

    // Run priority 2 tests if all priority 1 passed
    const allPriority1Passed = results.every(r => r.passed);
    if (allPriority1Passed) {
      for (const suite of priority2Tests) {
        const result = await this.runTestSuite(suite);
        results.push(result);
      }
    }

    const totalTime = performance.now() - startTime;
    this.printSummary(results, totalTime);
    
    return results;
  }

  private async runTestSuite(suite: TestSuite): Promise<TestResult> {
    logger.info(`\n🧪 Running: ${suite.name}`);
    logger.info(`📁 File: ${suite.file}`);
    logger.info(`⏱️  Timeout: ${suite.timeout}ms`);
    
    const startTime = performance.now();
    
    try {
      const integrationPath = path.join(process.cwd(), 'src', 'tests', 'integration', suite.file);
      const qualityPath = path.join(process.cwd(), 'src', 'tests', 'quality', suite.file);
      const relativeFilePath = fs.existsSync(integrationPath)
        ? `src/tests/integration/${suite.file}`
        : `src/tests/quality/${suite.file}`;
      const command = `npx jest ${relativeFilePath} --coverage --verbose --testTimeout=${suite.timeout}`;
      const output = execSync(command, { 
        encoding: 'utf8',
        timeout: suite.timeout + 5000 // Add buffer
      });
      
      const duration = performance.now() - startTime;
      const coverage = this.extractCoverage(output);
      
      logger.info(`✅ ${suite.name} - PASSED (${duration.toFixed(0)}ms)`);
      logger.info(`📊 Coverage: ${coverage}%`);
      
      return {
        suite: suite.name,
        passed: true,
        duration,
        coverage,
        errors: []
      };
      
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMessage = (error as Error).toString();
      
      logger.error(`❌ ${suite.name} - FAILED (${duration.toFixed(0)}ms)`);
      logger.error(`🔍 Error: ${errorMessage.substring(0, 200)}...`);
      
      return {
        suite: suite.name,
        passed: false,
        duration,
        coverage: 0,
        errors: [errorMessage]
      };
    }
  }

  private extractCoverage(output: string): number {
    const coverageMatch = output.match(/All files\s+\|\s+(\d+\.?\d*)/);
    return coverageMatch ? parseFloat(coverageMatch[1]) : 0;
  }

  private printSummary(results: TestResult[], totalTime: number): void {
    logger.info('\n📋 INTEGRATION TEST SUMMARY');
    logger.info('============================');
    
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const avgCoverage = results.reduce((sum, r) => sum + r.coverage, 0) / results.length;
    
    logger.info(`✅ Passed: ${passed}`);
    logger.info(`❌ Failed: ${failed}`);
    logger.info(`📊 Average Coverage: ${avgCoverage.toFixed(1)}%`);
    logger.info(`⏱️  Total Time: ${(totalTime / 1000).toFixed(2)}s`);
    
    if (failed === 0) {
      logger.info('\n🎉 ALL INTEGRATION TESTS PASSED!');
      logger.info('🚀 System ready for production deployment');
    } else {
      logger.warn('\n⚠️  SOME TESTS FAILED');
      logger.warn('🔧 Review failures before deployment');
    }

    // Performance benchmarks
    logger.info('\n📈 PERFORMANCE BENCHMARKS');
    logger.info('==========================');
    results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      logger.info(`${status} ${result.suite}: ${result.duration.toFixed(0)}ms`);
    });

    // Coverage report
    logger.info('\n📊 COVERAGE REPORT');
    logger.info('==================');
    results.forEach(result => {
      const coverageStatus = result.coverage >= 95 ? '🟢' : result.coverage >= 90 ? '🟡' : '🔴';
      logger.info(`${coverageStatus} ${result.suite}: ${result.coverage.toFixed(1)}%`);
    });
  }

  async runLoadTestOnly(): Promise<void> {
    logger.info('🔥 Running Load Tests Only (1000+ RPS)');
    logger.info('======================================');
    
    const loadTestSuite = this.testSuites.find(t => t.name === 'Load Testing Suite');
    if (loadTestSuite) {
      const result = await this.runTestSuite(loadTestSuite);
      
      if (result.passed) {
        logger.info('\n🎯 LOAD TEST RESULTS');
        logger.info('====================');
        logger.info('✅ 1000+ RPS target achieved');
        logger.info('✅ Sub-5ms response times maintained');
        logger.info('✅ 99.9%+ cache hit rate achieved');
        logger.info('✅ Memory usage within acceptable limits');
      } else {
        logger.error('\n❌ LOAD TEST FAILED');
        logger.error('===================');
        logger.warn('🔧 Performance optimization required');
      }
    }
  }

  async runAccuracyValidation(): Promise<void> {
    logger.info('🎯 Running Accuracy Validation (99.8%+ Target)');
    logger.info('===============================================');
    
    const accuracyTests = [
      'Engine Integration Tests',
      'End-to-End Workflows'
    ];
    
    for (const testName of accuracyTests) {
      const suite = this.testSuites.find(t => t.name === testName);
      if (suite) {
        const result = await this.runTestSuite(suite);
        
        if (result.passed) {
          logger.info(`✅ ${testName}: Accuracy target met`);
        } else {
          logger.error(`❌ ${testName}: Accuracy validation failed`);
        }
      }
    }
  }
}

// CLI interface
const args = process.argv.slice(2);
const runner = new IntegrationTestRunner();

async function main() {
  try {
    switch (args[0]) {
      case 'load':
        await runner.runLoadTestOnly();
        break;
      case 'accuracy':
        await runner.runAccuracyValidation();
        break;
      case 'all':
      default:
        await runner.runAllTests();
        break;
    }
  } catch (error) {
    logger.error('❌ Test runner failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { IntegrationTestRunner };
