const fs = require('fs');
const path = require('path');
const { normalizeOpenApiFile } = require('./normalize-openapi');

const root = path.resolve(__dirname, '..', '..');
const openApiPath = path.join(root, 'openapi.yaml');
const legacyPath = path.join(root, 'api-contract.yaml');

if (!fs.existsSync(openApiPath)) {
  console.error('openapi.yaml not found. Expected at:', openApiPath);
  process.exit(1);
}

const result = normalizeOpenApiFile(openApiPath);
fs.copyFileSync(openApiPath, legacyPath);
console.log('Normalized and synced openapi.yaml -> api-contract.yaml');
console.log(`- Generated request examples present: ${result.exampleStats.generatedExamplesPresent}`);
console.log(`- Request examples backfilled this run: ${result.exampleStats.generatedExamplesBackfilled}`);
