#!/usr/bin/env node

/**
 * Development Setup Helper
 * Helps set up local development environment for Order Service
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('ðŸš€ Order Service Development Setup Helper\n');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
  console.error('âŒ Error: Run this script from the order-service directory');
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (packageJson.name !== '@maysar/order-service') {
  console.error('âŒ Error: This script should be run in the order-service directory');
  process.exit(1);
}

console.log('âœ… Running in Order Service directory\n');

// Check current environment setup
console.log('ðŸ” Checking environment setup...');

const envLocalExists = fs.existsSync('.env.local');
const envExists = fs.existsSync('.env');
const envExampleExists = fs.existsSync('.env.example');

console.log(`ðŸ“„ .env.local: ${envLocalExists ? 'âœ… Exists' : 'âŒ Missing'}`);
console.log(`ðŸ“„ .env: ${envExists ? 'âœ… Exists' : 'âŒ Missing'}`);
console.log(`ðŸ“„ .env.example: ${envExampleExists ? 'âœ… Exists' : 'âŒ Missing'}\n`);

// Check Node.js and npm versions
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();

  console.log('ðŸ”§ Development Environment:');
  console.log(`   Node.js: ${nodeVersion}`);
  console.log(`   npm: ${npmVersion}`);

  // Check if Node version is compatible
  const nodeMajorVersion = parseInt(nodeVersion.split('.')[0].replace('v', ''));
  if (nodeMajorVersion < 18) {
    console.log('   âš ï¸  Warning: Node.js 18+ recommended\n');
  } else {
    console.log('   âœ… Node.js version compatible\n');
  }
} catch (error) {
  console.log('   âŒ Could not determine Node.js/npm versions\n');
}

// Check Docker availability
let dockerAvailable = false;
try {
  execSync('docker --version', { stdio: 'pipe' });
  dockerAvailable = true;
  console.log('ðŸ³ Docker: âœ… Available');
} catch {
  console.log('ðŸ³ Docker: âŒ Not available');
}

// Check Docker Compose availability
let dockerComposeAvailable = false;
try {
  execSync('docker-compose --version', { stdio: 'pipe' });
  dockerComposeAvailable = true;
  console.log('ðŸ³ Docker Compose: âœ… Available\n');
} catch {
  console.log('ðŸ³ Docker Compose: âŒ Not available\n');
}

// Setup recommendations
console.log('ðŸ’¡ Development Setup Recommendations:\n');

if (dockerComposeAvailable) {
  console.log('1. ðŸš€ Quick Start with Docker Compose (Recommended):');
  console.log('   docker-compose up -d');
  console.log('   npm run dev');
  console.log('');
}

if (!envLocalExists && envExampleExists) {
  console.log('2. ðŸ“ Configure Local Environment:');
  console.log('   cp .env.example .env.local');
  console.log('   # Edit .env.local with your local database settings');
  console.log('');
}

console.log('3. ðŸ§ª Run Tests:');
console.log('   npm run test:unit        # Unit tests only');
console.log('   npm run test:coverage    # Full test coverage');
console.log('   node test-api.js         # API contract tests');
console.log('');

console.log('4. ðŸ“¡ API Testing:');
console.log('   Import order-service-api.postman_collection.json into Postman');
console.log('   Use http://localhost:3002/api as base URL');
console.log('');

console.log('5. ðŸ”’ Security & Quality:');
console.log('   node scripts/security-scan.js    # Security scan');
console.log('   node scripts/api-coverage-verification.js  # API coverage');
console.log('   node performance-benchmarks.js   # Performance tests');
console.log('');

// Health check instructions
console.log('6. ðŸ¥ Health Checks:');
console.log('   curl http://localhost:3002/health          # Basic health');
console.log('   curl http://localhost:3002/health/live     # Liveness probe');
console.log('   curl http://localhost:3002/health/ready    # Readiness probe');
console.log('');

// Troubleshooting
console.log('ðŸ”§ Troubleshooting:\n');

if (!dockerComposeAvailable) {
  console.log('ðŸ³ Docker Setup:');
  console.log('   â€¢ Install Docker Desktop: https://docker.com/get-started');
  console.log('   â€¢ Enable Orchestrator in Docker Desktop for Orchestrator testing');
  console.log('');
}

console.log('ðŸ—„ï¸ Database Issues:');
console.log('   â€¢ Docker Compose includes PostgreSQL + Redis');
console.log('   â€¢ For manual setup: brew install postgresql redis');
console.log('   â€¢ Update DATABASE_URL in .env.local');
console.log('');

console.log('ðŸ§ª Test Issues:');
console.log('   â€¢ Run unit tests first: npm run test:unit');
console.log('   â€¢ Check test environment: cat test/setup.ts');
console.log('   â€¢ Clear Jest cache: npx jest --clearCache');
console.log('');

console.log('ðŸ“š Documentation:');
console.log('   â€¢ README.md - Complete setup guide');
console.log('   â€¢ openapi.yaml - API specification');
console.log('   â€¢ ROBUSTNESS_ENHANCEMENT_PLAN.md - Implementation details');
console.log('');

// Final status
console.log('ðŸŽ¯ Order Service is ready for development!');
console.log('ðŸ“– See README.md for detailed instructions.');
console.log('ðŸš€ Happy coding!\n');

// Exit with success
process.exit(0);
