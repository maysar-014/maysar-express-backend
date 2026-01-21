#!/usr/bin/env node

/**
 * API Contract Testing Framework
 * Automated contract testing with schema validation and compliance checking
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Ajv = require('ajv');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002';
const CONTRACTS_DIR = path.join(__dirname, '..', 'contracts');

/**
 * API Contract Tester Class
 */
class ContractTester {
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  /**
   * Load contract definitions
   */
  loadContracts() {
    const contracts = {};

    if (!fs.existsSync(CONTRACTS_DIR)) {
      console.warn(`⚠️  Contracts directory not found: ${CONTRACTS_DIR}`);
      return contracts;
    }

    const contractFiles = fs.readdirSync(CONTRACTS_DIR).filter(file =>
      file.endsWith('.json') || file.endsWith('.js')
    );

    contractFiles.forEach(file => {
      try {
        const filePath = path.join(CONTRACTS_DIR, file);
        const contract = require(filePath);

        if (contract.endpoints) {
          Object.assign(contracts, contract.endpoints);
        }
      } catch (error) {
        console.warn(`⚠️  Failed to load contract ${file}:`, error.message);
      }
    });

    return contracts;
  }

  /**
   * Validate response against schema
   */
  validateResponse(response, schema) {
    if (!schema) return { valid: true };

    try {
      const validate = this.ajv.compile(schema);
      const valid = validate(response);

      return {
        valid,
        errors: validate.errors || []
      };
    } catch (error) {
      return {
        valid: false,
        errors: [{ message: `Schema compilation error: ${error.message}` }]
      };
    }
  }

  /**
   * Test single endpoint contract
   */
  async testEndpointContract(endpoint, contract) {
    console.log(`🔍 Testing ${contract.method.toUpperCase()} ${endpoint}`);

    try {
      const url = `${this.baseUrl}${endpoint}`;
      const options = {
        method: contract.method,
        headers: {
          'Content-Type': 'application/json',
          ...contract.headers
        }
      };

      // Add body for POST/PUT/PATCH requests
      if (['POST', 'PUT', 'PATCH'].includes(contract.method.toUpperCase()) && contract.requestBody) {
        options.body = JSON.stringify(contract.requestBody);
      }

      // Make request (simplified - in real implementation use a proper HTTP client)
      const mockResponse = this.getMockResponse(endpoint, contract);

      // Validate response status
      const expectedStatus = contract.expectedStatus || 200;
      if (mockResponse.status !== expectedStatus) {
        throw new Error(`Expected status ${expectedStatus}, got ${mockResponse.status}`);
      }

      // Validate response schema
      if (contract.responseSchema) {
        const validation = this.validateResponse(mockResponse.body, contract.responseSchema);
        if (!validation.valid) {
          throw new Error(`Schema validation failed: ${JSON.stringify(validation.errors, null, 2)}`);
        }
      }

      // Validate response headers
      if (contract.expectedHeaders) {
        Object.entries(contract.expectedHeaders).forEach(([header, expectedValue]) => {
          const actualValue = mockResponse.headers[header.toLowerCase()];
          if (actualValue !== expectedValue) {
            throw new Error(`Header ${header}: expected "${expectedValue}", got "${actualValue}"`);
          }
        });
      }

      console.log(`  ✅ PASSED`);
      this.results.passed++;
      return true;

    } catch (error) {
      console.log(`  ❌ FAILED: ${error.message}`);
      this.results.failed++;
      this.results.errors.push({
        endpoint,
        contract,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Mock response for testing (replace with real HTTP calls in production)
   */
  getMockResponse(endpoint, contract) {
    // Mock responses based on endpoint
    const responses = {
      '/api/orders': {
        status: 201,
        headers: { 'content-type': 'application/json' },
        body: {
          id: 'order_123',
          buyerId: 'buyer_123',
          sellerId: 'seller_456',
          status: 'pending'
        }
      },
      '/api/orders/order_123': {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: {
          id: 'order_123',
          buyerId: 'buyer_123',
          sellerId: 'seller_456',
          status: 'pending'
        }
      },
      '/api/health': {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: {
          status: 'healthy',
          services: {
            database: 'connected',
            cache: 'connected'
          }
        }
      }
    };

    return responses[endpoint] || {
      status: 404,
      headers: { 'content-type': 'application/json' },
      body: { error: 'Not found' }
    };
  }

  /**
   * Run all contract tests
   */
  async runContractTests() {
    console.log('🚀 Running API Contract Tests...\n');

    const contracts = this.loadContracts();
    const endpoints = Object.keys(contracts);

    if (endpoints.length === 0) {
      console.log('⚠️  No contracts found. Create contract files in contracts/ directory.');
      return;
    }

    console.log(`📋 Found ${endpoints.length} contract(s) to test\n`);

    this.results.total = endpoints.length;

    for (const endpoint of endpoints) {
      const contract = contracts[endpoint];
      await this.testEndpointContract(endpoint, contract);
    }

    this.printResults();
  }

  /**
   * Print test results
   */
  printResults() {
    console.log('\n📊 Contract Test Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Contracts: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (this.results.failed > 0) {
      console.log('\n❌ Failed Contracts:');
      this.results.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.endpoint}: ${error.error}`);
      });
    }

    const successRate = this.results.total > 0 ?
      ((this.results.passed / this.results.total) * 100).toFixed(1) : '0';

    console.log(`\n🎯 Success Rate: ${successRate}%`);

    if (this.results.failed === 0) {
      console.log('🎉 All contracts passed!');
      process.exit(0);
    } else {
      console.log('❌ Some contracts failed. Check errors above.');
      process.exit(1);
    }
  }

  /**
   * Generate contract template
   */
  generateContractTemplate(endpoint, method = 'GET') {
    const template = {
      [endpoint]: {
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {token}'
        },
        requestBody: method !== 'GET' ? {
          exampleField: 'example value'
        } : undefined,
        expectedStatus: 200,
        expectedHeaders: {
          'content-type': 'application/json'
        },
        responseSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            status: { type: 'string' }
          },
          required: ['id', 'status']
        }
      }
    };

    return template;
  }
}

/**
 * Create sample contracts
 */
function createSampleContracts() {
  const contracts = {
    endpoints: {
      '/api/health': {
        method: 'GET',
        expectedStatus: 200,
        expectedHeaders: {
          'content-type': 'application/json'
        },
        responseSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'unhealthy'] },
            timestamp: { type: 'string', format: 'date-time' },
            services: {
              type: 'object',
              properties: {
                database: { type: 'string' },
                cache: { type: 'string' },
                external: { type: 'string' }
              }
            }
          },
          required: ['status', 'services']
        }
      },

      '/api/orders': {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        requestBody: {
          buyerId: 'buyer_123',
          sellerId: 'seller_456',
          items: [{
            productId: 'prod_789',
            quantity: 2,
            price: { amount: 15000, currency: 'TZS' },
            weight: 1.5
          }],
          currency: 'TZS',
          deliveryAddress: {
            street: '123 Main St',
            city: 'Dar es Salaam',
            postalCode: '11101',
            country: 'TZ'
          },
          paymentMethod: 'COD'
        },
        expectedStatus: 201,
        expectedHeaders: {
          'content-type': 'application/json'
        },
        responseSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', pattern: '^order_' },
            buyerId: { type: 'string' },
            sellerId: { type: 'string' },
            status: { type: 'string', enum: ['pending'] },
            totalAmount: {
              type: 'object',
              properties: {
                amount: { type: 'number' },
                currency: { type: 'string' }
              }
            }
          },
          required: ['id', 'buyerId', 'sellerId', 'status']
        }
      },

      '/api/orders/{id}': {
        method: 'GET',
        expectedStatus: 200,
        expectedHeaders: {
          'content-type': 'application/json'
        },
        responseSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            buyerId: { type: 'string' },
            sellerId: { type: 'string' },
            status: { type: 'string' },
            totalAmount: {
              type: 'object',
              properties: {
                amount: { type: 'number' },
                currency: { type: 'string' }
              }
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  productId: { type: 'string' },
                  quantity: { type: 'number' },
                  price: {
                    type: 'object',
                    properties: {
                      amount: { type: 'number' },
                      currency: { type: 'string' }
                    }
                  },
                  weight: { type: 'number' }
                }
              }
            }
          },
          required: ['id', 'buyerId', 'sellerId', 'status', 'items']
        }
      }
    }
  };

  // Ensure contracts directory exists
  if (!fs.existsSync(CONTRACTS_DIR)) {
    fs.mkdirSync(CONTRACTS_DIR, { recursive: true });
  }

  // Write sample contracts
  const contractPath = path.join(CONTRACTS_DIR, 'api-contracts.json');
  fs.writeFileSync(contractPath, JSON.stringify(contracts, null, 2));

  console.log(`📄 Sample contracts created: ${contractPath}`);
}

/**
 * Main execution
 */
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'test':
      const tester = new ContractTester();
      await tester.runContractTests();
      break;

    case 'create-sample':
      createSampleContracts();
      break;

    case 'template':
      const templateEndpoint = process.argv[3] || '/api/example';
      const templateMethod = process.argv[4] || 'GET';
      const templateTester = new ContractTester();
      const template = templateTester.generateContractTemplate(templateEndpoint, templateMethod);
      console.log(JSON.stringify(template, null, 2));
      break;

    default:
      console.log(`
API Contract Testing Framework

Usage:
  node scripts/contract-tests.js test              # Run all contract tests
  node scripts/contract-tests.js create-sample     # Create sample contracts
  node scripts/contract-tests.js template [endpoint] [method]  # Generate contract template

Examples:
  node scripts/contract-tests.js test
  node scripts/contract-tests.js create-sample
  node scripts/contract-tests.js template /api/orders POST
      `);
      break;
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Contract testing failed:', error.message);
    process.exit(1);
  });
}

module.exports = { ContractTester };
