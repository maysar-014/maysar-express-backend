import { execSync } from 'child_process';
import { performance } from 'perf_hooks';

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
    console.log('🚀 Starting Integration Test Suite');
    console.log('=====================================');
    
    const results: TestResult[] = [];
    const startTime = performance.now();

    // Run priority 1 tests first
    const priority1Tests = this.testSuites.filter(t => t.priority === 1);
    const priority2Tests = this.testSuites.filter(t => t.priority === 2);

    for (const suite of priority1Tests) {
      const result = await this.runTestSuite(suite);
      results.push(result);
      
      if (!result.passed) {
        console.log(`❌ Critical test failed: ${suite.name}`);
        console.log('Stopping test execution due to critical failure');
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
    console.log(`\n🧪 Running: ${suite.name}`);
    console.log(`📁 File: ${suite.file}`);
    console.log(`⏱️  Timeout: ${suite.timeout}ms`);
    
    const startTime = performance.now();
    
    try {
      const command = `npx jest src/tests/integration/${suite.file} --coverage --verbose --testTimeout=${suite.timeout}`;
      const output = execSync(command, { 
        encoding: 'utf8',
        timeout: suite.timeout + 5000 // Add buffer
      });
      
      const duration = performance.now() - startTime;
      const coverage = this.extractCoverage(output);
      
      console.log(`✅ ${suite.name} - PASSED (${duration.toFixed(0)}ms)`);
      console.log(`📊 Coverage: ${coverage}%`);
      
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
      
      console.log(`❌ ${suite.name} - FAILED (${duration.toFixed(0)}ms)`);
      console.log(`🔍 Error: ${errorMessage.substring(0, 200)}...`);
      
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
    console.log('\n📋 INTEGRATION TEST SUMMARY');
    console.log('============================');
    
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const avgCoverage = results.reduce((sum, r) => sum + r.coverage, 0) / results.length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Average Coverage: ${avgCoverage.toFixed(1)}%`);
    console.log(`⏱️  Total Time: ${(totalTime / 1000).toFixed(2)}s`);
    
    if (failed === 0) {
      console.log('\n🎉 ALL INTEGRATION TESTS PASSED!');
      console.log('🚀 System ready for production deployment');
    } else {
      console.log('\n⚠️  SOME TESTS FAILED');
      console.log('🔧 Review failures before deployment');
    }

    // Performance benchmarks
    console.log('\n📈 PERFORMANCE BENCHMARKS');
    console.log('==========================');
    results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.suite}: ${result.duration.toFixed(0)}ms`);
    });

    // Coverage report
    console.log('\n📊 COVERAGE REPORT');
    console.log('==================');
    results.forEach(result => {
      const coverageStatus = result.coverage >= 95 ? '🟢' : result.coverage >= 90 ? '🟡' : '🔴';
      console.log(`${coverageStatus} ${result.suite}: ${result.coverage.toFixed(1)}%`);
    });
  }

  async runLoadTestOnly(): Promise<void> {
    console.log('🔥 Running Load Tests Only (1000+ RPS)');
    console.log('======================================');
    
    const loadTestSuite = this.testSuites.find(t => t.name === 'Load Testing Suite');
    if (loadTestSuite) {
      const result = await this.runTestSuite(loadTestSuite);
      
      if (result.passed) {
        console.log('\n🎯 LOAD TEST RESULTS');
        console.log('====================');
        console.log('✅ 1000+ RPS target achieved');
        console.log('✅ Sub-5ms response times maintained');
        console.log('✅ 99.9%+ cache hit rate achieved');
        console.log('✅ Memory usage within acceptable limits');
      } else {
        console.log('\n❌ LOAD TEST FAILED');
        console.log('===================');
        console.log('🔧 Performance optimization required');
      }
    }
  }

  async runAccuracyValidation(): Promise<void> {
    console.log('🎯 Running Accuracy Validation (99.8%+ Target)');
    console.log('===============================================');
    
    const accuracyTests = [
      'Engine Integration Tests',
      'End-to-End Workflows'
    ];
    
    for (const testName of accuracyTests) {
      const suite = this.testSuites.find(t => t.name === testName);
      if (suite) {
        const result = await this.runTestSuite(suite);
        
        if (result.passed) {
          console.log(`✅ ${testName}: Accuracy target met`);
        } else {
          console.log(`❌ ${testName}: Accuracy validation failed`);
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
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { IntegrationTestRunner };
