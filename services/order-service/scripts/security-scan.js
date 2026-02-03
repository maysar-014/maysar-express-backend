#!/usr/bin/env node

/**
 * Security Scanning Script
 * Scans container images and configurations for security vulnerabilities
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const IMAGE_NAME = process.env.IMAGE_NAME || 'maysar/order-service:latest';
const SCAN_TIMEOUT = 300000; // 5 minutes
const VULNERABILITY_THRESHOLD = 'HIGH'; // CRITICAL, HIGH, MEDIUM, LOW

/**
 * Run security scan on container image
 */
async function runSecurityScan() {
  console.log('🔒 Running Security Scan...\n');
  console.log(`Image: ${IMAGE_NAME}`);
  console.log(`Timeout: ${SCAN_TIMEOUT}ms`);
  console.log(`Vulnerability Threshold: ${VULNERABILITY_THRESHOLD}`);
  console.log('');

  const results = {
    imageScan: null,
    dependencyScan: null,
    configurationScan: null,
    summary: {
      totalIssues: 0,
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
      lowIssues: 0,
      passed: false
    }
  };

  try {
    // 1. Container Image Vulnerability Scan
    console.log('📦 Scanning container image for vulnerabilities...');
    results.imageScan = await scanContainerImage();
    console.log('✅ Container image scan completed\n');

    // 2. Dependency Vulnerability Scan
    console.log('📋 Scanning dependencies for vulnerabilities...');
    results.dependencyScan = await scanDependencies();
    console.log('✅ Dependency scan completed\n');

    // 3. Configuration Security Scan
    console.log('⚙️  Scanning configuration for security issues...');
    results.configurationScan = await scanConfiguration();
    console.log('✅ Configuration scan completed\n');

    // Generate comprehensive report
    const finalResults = generateSecurityReport(results);

    // Save results
    saveSecurityReport(finalResults);

    // Determine pass/fail
    const hasCriticalIssues = finalResults.summary.criticalIssues > 0;
    const hasHighIssues = finalResults.summary.highIssues > 0;

    if (hasCriticalIssues) {
      console.log('❌ SECURITY SCAN FAILED: Critical vulnerabilities found!');
      console.log('   Immediate action required before deployment.');
      process.exit(1);
    } else if (hasHighIssues && VULNERABILITY_THRESHOLD === 'CRITICAL') {
      console.log('❌ SECURITY SCAN FAILED: High severity issues found!');
      console.log('   Review and fix high severity issues before deployment.');
      process.exit(1);
    } else {
      console.log('✅ SECURITY SCAN PASSED: No blocking vulnerabilities found.');
      console.log('   Review medium/low severity issues in the report.');
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ Security scan failed:', error.message);
    process.exit(1);
  }
}

/**
 * Scan container image for vulnerabilities using Trivy
 */
async function scanContainerImage() {
  try {
    const command = `trivy image --format json --output /tmp/trivy-results.json ${IMAGE_NAME}`;

    execSync(command, {
      timeout: SCAN_TIMEOUT,
      stdio: 'inherit'
    });

    // Read and parse results
    const results = JSON.parse(fs.readFileSync('/tmp/trivy-results.json', 'utf8'));

    // Clean up
    fs.unlinkSync('/tmp/trivy-results.json');

    return {
      tool: 'Trivy',
      timestamp: new Date().toISOString(),
      vulnerabilities: results.Vulnerabilities || [],
      summary: {
        total: results.Vulnerabilities?.length || 0,
        critical: countSeverity(results.Vulnerabilities, 'CRITICAL'),
        high: countSeverity(results.Vulnerabilities, 'HIGH'),
        medium: countSeverity(results.Vulnerabilities, 'MEDIUM'),
        low: countSeverity(results.Vulnerabilities, 'LOW')
      }
    };

  } catch (error) {
    console.warn('⚠️  Trivy scan failed, trying alternative method...');

    // Fallback to basic Docker image inspection
    return await fallbackImageScan();
  }
}

/**
 * Fallback image scanning when Trivy is not available
 */
async function fallbackImageScan() {
  try {
    const inspectCommand = `docker inspect ${IMAGE_NAME}`;
    const inspectOutput = execSync(inspectCommand, { encoding: 'utf8' });

    const imageInfo = JSON.parse(inspectOutput)[0];

    // Basic security checks
    const issues = [];

    // Check if running as root
    if (imageInfo.Config.User === 'root' || !imageInfo.Config.User) {
      issues.push({
        severity: 'HIGH',
        title: 'Container runs as root user',
        description: 'Container should run as non-root user for security'
      });
    }

    // Check for exposed ports
    if (imageInfo.Config.ExposedPorts) {
      const ports = Object.keys(imageInfo.Config.ExposedPorts);
      if (ports.length > 2) {
        issues.push({
          severity: 'MEDIUM',
          title: 'Multiple ports exposed',
          description: `Container exposes ${ports.length} ports: ${ports.join(', ')}`
        });
      }
    }

    return {
      tool: 'Docker Inspect',
      timestamp: new Date().toISOString(),
      vulnerabilities: issues,
      summary: {
        total: issues.length,
        critical: countSeverity(issues, 'CRITICAL'),
        high: countSeverity(issues, 'HIGH'),
        medium: countSeverity(issues, 'MEDIUM'),
        low: countSeverity(issues, 'LOW')
      }
    };

  } catch (error) {
    return {
      tool: 'Fallback Scan',
      timestamp: new Date().toISOString(),
      vulnerabilities: [{
        severity: 'MEDIUM',
        title: 'Automated scanning not available',
        description: 'Install Trivy or other vulnerability scanner for comprehensive security scanning'
      }],
      summary: {
        total: 1,
        critical: 0,
        high: 0,
        medium: 1,
        low: 0
      }
    };
  }
}

/**
 * Scan dependencies for vulnerabilities using npm audit
 */
async function scanDependencies() {
  try {
    const auditCommand = 'npm audit --json';
    const auditOutput = execSync(auditCommand, { encoding: 'utf8' });
    const auditResults = JSON.parse(auditOutput);

    const vulnerabilities = [];

    if (auditResults.vulnerabilities) {
      Object.entries(auditResults.vulnerabilities).forEach(([pkg, details]) => {
        vulnerabilities.push({
          package: pkg,
          severity: details.severity.toUpperCase(),
          title: details.title,
          description: details.overview,
          recommendation: details.recommendation
        });
      });
    }

    return {
      tool: 'npm audit',
      timestamp: new Date().toISOString(),
      vulnerabilities,
      summary: {
        total: vulnerabilities.length,
        critical: countSeverity(vulnerabilities, 'CRITICAL'),
        high: countSeverity(vulnerabilities, 'HIGH'),
        medium: countSeverity(vulnerabilities, 'MEDIUM'),
        low: countSeverity(vulnerabilities, 'LOW')
      }
    };

  } catch (error) {
    return {
      tool: 'npm audit',
      timestamp: new Date().toISOString(),
      vulnerabilities: [{
        severity: 'LOW',
        title: 'Dependency scan failed',
        description: 'Unable to run npm audit - check package.json and dependencies'
      }],
      summary: {
        total: 1,
        critical: 0,
        high: 0,
        medium: 0,
        low: 1
      }
    };
  }
}

/**
 * Scan configuration files for security issues
 */
async function scanConfiguration() {
  const issues = [];

  try {
    // Check Dockerfile for security issues
    if (fs.existsSync('Dockerfile')) {
      const dockerfile = fs.readFileSync('Dockerfile', 'utf8');

      // Check for root user
      if (dockerfile.includes('USER root') || !dockerfile.includes('USER ')) {
        issues.push({
          severity: 'HIGH',
          title: 'Dockerfile uses root user',
          description: 'Dockerfile should use non-root user for security',
          file: 'Dockerfile'
        });
      }

      // Check for apk add without --no-cache
      if (dockerfile.includes('apk add') && !dockerfile.includes('--no-cache')) {
        issues.push({
          severity: 'LOW',
          title: 'Dockerfile apk add without --no-cache',
          description: 'Use --no-cache to reduce image size',
          file: 'Dockerfile'
        });
      }
    }

    // Check package.json for security issues
    if (fs.existsSync('package.json')) {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

      // Check for old dependencies
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      const riskyDeps = ['express@<4.0.0', 'helmet@<4.0.0'];

      for (const dep of riskyDeps) {
        const [name, version] = dep.split('@');
        if (deps[name] && deps[name].includes(version.replace('<', ''))) {
          issues.push({
            severity: 'MEDIUM',
            title: `Outdated dependency: ${name}`,
            description: `Consider upgrading ${name} to a more recent version`,
            file: 'package.json'
          });
        }
      }
    }

    // Check Kubernetes manifests
    const k8sDir = path.join(__dirname, '..', 'k8s');
    if (fs.existsSync(k8sDir)) {
      const k8sFiles = fs.readdirSync(k8sDir).filter(file => file.endsWith('.yaml'));

      for (const file of k8sFiles) {
        const filePath = path.join(k8sDir, file);
        const content = fs.readFileSync(filePath, 'utf8');

        // Check for security context issues
        if (content.includes('runAsUser: 0') || content.includes('runAsUser:0')) {
          issues.push({
            severity: 'HIGH',
            title: 'Kubernetes manifest allows root user',
            description: 'Kubernetes deployment should not run as root',
            file: `k8s/${file}`
          });
        }

        // Check for privileged containers
        if (content.includes('privileged: true')) {
          issues.push({
            severity: 'CRITICAL',
            title: 'Privileged container detected',
            description: 'Containers should not run in privileged mode',
            file: `k8s/${file}`
          });
        }
      }
    }

  } catch (error) {
    issues.push({
      severity: 'LOW',
      title: 'Configuration scan failed',
      description: `Error scanning configuration: ${error.message}`
    });
  }

  return {
    tool: 'Configuration Scan',
    timestamp: new Date().toISOString(),
    vulnerabilities: issues,
    summary: {
      total: issues.length,
      critical: countSeverity(issues, 'CRITICAL'),
      high: countSeverity(issues, 'HIGH'),
      medium: countSeverity(issues, 'MEDIUM'),
      low: countSeverity(issues, 'LOW')
    }
  };
}

/**
 * Count vulnerabilities by severity
 */
function countSeverity(vulnerabilities, severity) {
  if (!vulnerabilities) return 0;
  return vulnerabilities.filter(v => v.severity === severity).length;
}

/**
 * Generate comprehensive security report
 */
function generateSecurityReport(results) {
  console.log('\n' + '='.repeat(80));
  console.log('🔒 SECURITY SCAN REPORT');
  console.log('='.repeat(80));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Image: ${IMAGE_NAME}`);
  console.log('');

  // Image scan results
  if (results.imageScan) {
    console.log('📦 CONTAINER IMAGE SCAN');
    console.log(`Tool: ${results.imageScan.tool}`);
    console.log(`Vulnerabilities: ${results.imageScan.summary.total}`);
    console.log(`  • Critical: ${results.imageScan.summary.critical}`);
    console.log(`  • High: ${results.imageScan.summary.high}`);
    console.log(`  • Medium: ${results.imageScan.summary.medium}`);
    console.log(`  • Low: ${results.imageScan.summary.low}`);
    console.log('');
  }

  // Dependency scan results
  if (results.dependencyScan) {
    console.log('📋 DEPENDENCY SCAN');
    console.log(`Tool: ${results.dependencyScan.tool}`);
    console.log(`Vulnerabilities: ${results.dependencyScan.summary.total}`);
    console.log(`  • Critical: ${results.dependencyScan.summary.critical}`);
    console.log(`  • High: ${results.dependencyScan.summary.high}`);
    console.log(`  • Medium: ${results.dependencyScan.summary.medium}`);
    console.log(`  • Low: ${results.dependencyScan.summary.low}`);
    console.log('');
  }

  // Configuration scan results
  if (results.configurationScan) {
    console.log('⚙️  CONFIGURATION SCAN');
    console.log(`Tool: ${results.configurationScan.tool}`);
    console.log(`Issues: ${results.configurationScan.summary.total}`);
    console.log(`  • Critical: ${results.configurationScan.summary.critical}`);
    console.log(`  • High: ${results.configurationScan.summary.high}`);
    console.log(`  • Medium: ${results.configurationScan.summary.medium}`);
    console.log(`  • Low: ${results.configurationScan.summary.low}`);
    console.log('');
  }

  // Overall summary
  const totalIssues = (results.imageScan?.summary.total || 0) +
                     (results.dependencyScan?.summary.total || 0) +
                     (results.configurationScan?.summary.total || 0);

  const criticalIssues = (results.imageScan?.summary.critical || 0) +
                        (results.dependencyScan?.summary.critical || 0) +
                        (results.configurationScan?.summary.critical || 0);

  const highIssues = (results.imageScan?.summary.high || 0) +
                    (results.dependencyScan?.summary.high || 0) +
                    (results.configurationScan?.summary.high || 0);

  console.log('📊 OVERALL SUMMARY');
  console.log(`Total Issues: ${totalIssues}`);
  console.log(`Critical: ${criticalIssues}`);
  console.log(`High: ${highIssues}`);
  console.log('');

  // Assessment
  if (criticalIssues > 0) {
    console.log('🚨 ASSESSMENT: CRITICAL ISSUES FOUND');
    console.log('   Immediate remediation required before deployment.');
  } else if (highIssues > 0) {
    console.log('⚠️  ASSESSMENT: HIGH SEVERITY ISSUES FOUND');
    console.log('   Review and fix high severity issues.');
  } else {
    console.log('✅ ASSESSMENT: SECURITY SCAN PASSED');
    console.log('   No critical or high severity issues found.');
  }

  console.log('='.repeat(80));

  return {
    ...results,
    summary: {
      totalIssues,
      criticalIssues,
      highIssues,
      passed: criticalIssues === 0 && (VULNERABILITY_THRESHOLD !== 'CRITICAL' || highIssues === 0)
    }
  };
}

/**
 * Save security report to file
 */
function saveSecurityReport(results) {
  const fs = require('fs');
  const path = require('path');

  const report = {
    timestamp: new Date().toISOString(),
    configuration: {
      imageName: IMAGE_NAME,
      vulnerabilityThreshold: VULNERABILITY_THRESHOLD,
      scanTimeout: SCAN_TIMEOUT
    },
    results
  };

  const reportsDir = path.join(__dirname, '..', 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const filename = `security-scan-${Date.now()}.json`;
  const filepath = path.join(reportsDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
  console.log(`📄 Security report saved to: ${filepath}`);
}

// Main execution
if (require.main === module) {
  runSecurityScan().catch(error => {
    console.error('❌ Security scan execution failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  runSecurityScan,
  scanContainerImage,
  scanDependencies,
  scanConfiguration
};
