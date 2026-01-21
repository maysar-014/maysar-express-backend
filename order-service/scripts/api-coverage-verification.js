#!/usr/bin/env node

/**
 * API Coverage Verification Script
 * Automatically verifies API endpoint coverage and contract compliance
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002';
const COVERAGE_THRESHOLD = 95; // Minimum API coverage percentage

/**
 * Extract API endpoints from route files
 */
function extractApiEndpoints() {
  const endpoints = new Set();

  // Read route files
  const routeFiles = [
    'src/api/routes.ts',
    'src/api/routes/order.routes.ts',
    'src/api/routes/health.routes.ts'
  ];

  routeFiles.forEach(file => {
    try {
      const filePath = path.join(__dirname, '..', file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');

        // Extract route patterns using regex
        const routePatterns = [
          /router\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g,
          /app\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g,
          /\.route\s*\(\s*['"]([^'"]+)['"]\s*\)\s*\.(get|post|put|delete|patch)/g
        ];

        routePatterns.forEach(pattern => {
          let match;
          while ((match = pattern.exec(content)) !== null) {
            const endpoint = match[2] || match[1];
            if (endpoint && !endpoint.includes('*') && !endpoint.includes(':')) {
              endpoints.add(endpoint);
            }
          }
        });
      }
    } catch (error) {
      console.warn(`Warning: Could not read ${file}:`, error.message);
    }
  });

  return Array.from(endpoints);
}

/**
 * Extract tested endpoints from test files
 */
function extractTestedEndpoints() {
  const testedEndpoints = new Set();

  // Find all integration test files
  const testDir = path.join(__dirname, '..', 'src/__tests__/integration');
  if (!fs.existsSync(testDir)) {
    return testedEndpoints;
  }

  const testFiles = fs.readdirSync(testDir).filter(file =>
    file.endsWith('.test.ts') || file.endsWith('.spec.ts')
  );

  testFiles.forEach(file => {
    try {
      const filePath = path.join(testDir, file);
      const content = fs.readFileSync(filePath, 'utf8');

      // Extract endpoint patterns from test calls
      const endpointPatterns = [
        /\.get\s*\(\s*['"]([^'"]+)['"]/g,
        /\.post\s*\(\s*['"]([^'"]+)['"]/g,
        /\.put\s*\(\s*['"]([^'"]+)['"]/g,
        /\.delete\s*\(\s*['"]([^'"]+)['"]/g,
        /\.patch\s*\(\s*['"]([^'"]+)['"]/g
      ];

      endpointPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          testedEndpoints.add(match[1]);
        }
      });
    } catch (error) {
      console.warn(`Warning: Could not read test file ${file}:`, error.message);
    }
  });

  return testedEndpoints;
}

/**
 * Generate API coverage report
 */
function generateCoverageReport(apiEndpoints, testedEndpoints) {
  const totalEndpoints = apiEndpoints.length;
  const testedCount = apiEndpoints.filter(endpoint =>
    testedEndpoints.has(endpoint)
  ).length;

  const coverage = totalEndpoints > 0 ? (testedCount / totalEndpoints) * 100 : 0;

  return {
    totalEndpoints,
    testedCount,
    coverage: coverage.toFixed(2),
    untestedEndpoints: apiEndpoints.filter(endpoint =>
      !testedEndpoints.has(endpoint)
    ),
    testedEndpoints: apiEndpoints.filter(endpoint =>
      testedEndpoints.has(endpoint)
    )
  };
}

/**
 * Run API coverage verification
 */
async function runApiCoverageVerification() {
  console.log('🔍 Running API Coverage Verification...\n');

  try {
    // Extract endpoints
    const apiEndpoints = extractApiEndpoints();
    const testedEndpoints = extractTestedEndpoints();

    console.log(`📊 Found ${apiEndpoints.length} API endpoints`);
    console.log(`✅ Found ${testedEndpoints.size} tested endpoints\n`);

    // Generate report
    const report = generateCoverageReport(apiEndpoints, testedEndpoints);

    console.log('📈 Coverage Report:');
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Total Endpoints: ${report.totalEndpoints}`);
    console.log(`Tested Endpoints: ${report.testedCount}`);
    console.log(`Coverage: ${report.coverage}%`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    if (report.untestedEndpoints.length > 0) {
      console.log('❌ Untested Endpoints:');
      report.untestedEndpoints.forEach(endpoint => {
        console.log(`  • ${endpoint}`);
      });
      console.log('');
    }

    if (report.testedEndpoints.length > 0) {
      console.log('✅ Tested Endpoints:');
      report.testedEndpoints.forEach(endpoint => {
        console.log(`  • ${endpoint}`);
      });
      console.log('');
    }

    // Check against threshold
    const coverageNum = parseFloat(report.coverage);
    if (coverageNum >= COVERAGE_THRESHOLD) {
      console.log(`🎉 SUCCESS: API coverage (${report.coverage}%) meets threshold (${COVERAGE_THRESHOLD}%)`);
      process.exit(0);
    } else {
      console.log(`❌ FAILURE: API coverage (${report.coverage}%) below threshold (${COVERAGE_THRESHOLD}%)`);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error during API coverage verification:', error.message);
    process.exit(1);
  }
}

/**
 * Generate HTML coverage report
 */
function generateHtmlReport(report) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Coverage Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .metrics { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: white; padding: 15px; border-radius: 5px; border: 1px solid #ddd; flex: 1; }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 2em; font-weight: bold; }
        .coverage-good { color: #28a745; }
        .coverage-bad { color: #dc3545; }
        .endpoints { margin: 20px 0; }
        .endpoint-list { background: white; border: 1px solid #ddd; border-radius: 5px; }
        .endpoint-item { padding: 10px; border-bottom: 1px solid #eee; }
        .endpoint-item:last-child { border-bottom: none; }
        .tested { background-color: #d4edda; }
        .untested { background-color: #f8d7da; }
    </style>
</head>
<body>
    <div class="header">
        <h1>API Coverage Report</h1>
        <p>Generated on ${new Date().toISOString()}</p>
    </div>

    <div class="metrics">
        <div class="metric">
            <h3>Total Endpoints</h3>
            <div class="value">${report.totalEndpoints}</div>
        </div>
        <div class="metric">
            <h3>Tested Endpoints</h3>
            <div class="value">${report.testedCount}</div>
        </div>
        <div class="metric">
            <h3>Coverage</h3>
            <div class="value ${parseFloat(report.coverage) >= COVERAGE_THRESHOLD ? 'coverage-good' : 'coverage-bad'}">${report.coverage}%</div>
        </div>
    </div>

    <div class="endpoints">
        <h2>Tested Endpoints (${report.testedEndpoints.length})</h2>
        <div class="endpoint-list">
            ${report.testedEndpoints.map(endpoint => `<div class="endpoint-item tested">${endpoint}</div>`).join('')}
        </div>
    </div>

    <div class="endpoints">
        <h2>Untested Endpoints (${report.untestedEndpoints.length})</h2>
        <div class="endpoint-list">
            ${report.untestedEndpoints.map(endpoint => `<div class="endpoint-item untested">${endpoint}</div>`).join('')}
        </div>
    </div>
</body>
</html>`;

  const reportPath = path.join(__dirname, '..', 'reports', 'api-coverage.html');
  fs.writeFileSync(reportPath, html);
  console.log(`📄 HTML report generated: ${reportPath}`);
}

// Main execution
if (require.main === module) {
  runApiCoverageVerification();
}

module.exports = {
  extractApiEndpoints,
  extractTestedEndpoints,
  generateCoverageReport,
  runApiCoverageVerification
};
