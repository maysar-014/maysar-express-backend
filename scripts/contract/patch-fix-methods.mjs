/**
 * Fixes the remaining 14 undocumented routes:
 * - Adds missing HTTP methods to existing path blocks
 * - Adds missing path blocks entirely
 */
import fs from 'fs';
import { execSync } from 'child_process';

const file = 'openapi.yaml';
const rawContent = fs.readFileSync(file, 'utf-8');
const crlf = rawContent.includes('\r\n');
const EOL = crlf ? '\r\n' : '\n';
const lines = rawContent.split(/\r?\n/);

// Standard response block lines
const stdResponses = [
  "      responses:",
  "        '200':", "          description: OK", "          content:", "            application/json:", "              schema: {}", "            text/plain:", "              schema: {}",
  "        '400':", "          description: Validation error", "          content:", "            application/json:", "              schema: {}", "            text/plain:", "              schema: {}",
  "        '401':", "          description: Unauthorized", "          content:", "            application/json:", "              schema: {}", "            text/plain:", "              schema: {}",
  "        '403':", "          description: Forbidden", "          content:", "            application/json:", "              schema: {}", "            text/plain:", "              schema: {}",
  "        '404':", "          description: Not Found", "          content:", "            application/json:", "              schema: {}", "            text/plain:", "              schema: {}",
  "        '500':", "          description: Internal Server Error", "          content:", "            application/json:", "              schema: {}", "            text/plain:", "              schema: {}",
];

function methodBlock(method, tag, summary, pathParams = []) {
  const paramLines = pathParams.length > 0
    ? ["      parameters:", ...pathParams.flatMap(p => [`        - name: ${p}`, "          in: path", "          required: true", "          schema:", "            type: string"])]
    : ["      parameters: []"];
  return [
    `    ${method.toLowerCase()}:`, "      tags:", `        - ${tag}`,
    `      summary: ${summary}`,
    ...stdResponses,
    ...paramLines,
    "      security:", "        - BearerAuth: []",
  ];
}

function fullPathBlock(path, operations, tag) {
  const paramNames = [...path.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
  const block = [`  ${path}:`, "    parameters: []"];
  for (const [method, summary] of Object.entries(operations)) {
    block.push(...methodBlock(method, tag, summary, paramNames));
  }
  return block;
}

const result = [...lines];

// Helper: add a method to an existing path block
function addMethodToPath(pathKey, method, tag, summary) {
  // Find the path entry line
  const idx = result.findIndex(l => {
    const t = l.trim();
    return t === `${pathKey}:` || t === `'${pathKey}':` || t === `"${pathKey}":`;
  });
  if (idx === -1) { console.log(`✗ Path not found: ${pathKey}`); return false; }
  
  // Find end of this path block (next top-level path or end of file)
  let end = idx + 1;
  while (end < result.length && !result[end].match(/^  ['"]?\/api\//)) end++;
  
  // Extract path params
  const paramNames = [...pathKey.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
  const block = methodBlock(method, tag, summary, paramNames);
  result.splice(end, 0, ...block);
  console.log(`✓ Added ${method} to ${pathKey}`);
  return true;
}

// Helper: add a full path block before an anchor
function addPathBlock(anchorLine, path, operations, tag) {
  const alreadyExists = result.some(l => {
    const t = l.trim();
    return t === `${path}:` || t === `'${path}':`;
  });
  if (alreadyExists) { console.log(`⚠ Already exists: ${path}`); return; }
  
  const idx = result.findIndex(l => l.trimEnd() === anchorLine.trimEnd());
  if (idx === -1) { console.log(`✗ Anchor not found: ${anchorLine}`); return; }
  
  const block = fullPathBlock(path, operations, tag);
  result.splice(idx, 0, ...block, '');
  console.log(`✓ Added path block ${path}`);
}

// 1. Add GET to /api/kyc/admin/{userId}
addMethodToPath('/api/kyc/admin/{userId}', 'GET', 'KYC', 'Admin get KYC record by user ID');

// 2. Add POST to /api/logistics/api/v1/couriers
addMethodToPath('/api/logistics/api/v1/couriers', 'POST', 'Logistics', 'Register a new courier');

// 3. Add PATCH to /api/logistics/api/v1/couriers/{courierId}/status
addMethodToPath('/api/logistics/api/v1/couriers/{courierId}/status', 'PATCH', 'Logistics', 'Update courier availability status');

// 4. Add PATCH to /api/logistics/api/v1/deliveries/{deliveryId}/status
addMethodToPath('/api/logistics/api/v1/deliveries/{deliveryId}/status', 'PATCH', 'Logistics', 'Update delivery status');

// 5. Add missing COD OTP paths
addPathBlock(
  '  /api/logistics/api/v1/routes/optimize:',
  '/api/logistics/api/v1/deliveries/{deliveryId}/cod/generate-otp',
  { POST: 'Generate COD OTP for delivery verification' },
  'Logistics'
);
addPathBlock(
  '  /api/logistics/api/v1/routes/optimize:',
  '/api/logistics/api/v1/deliveries/{deliveryId}/cod/verify',
  { POST: 'Verify COD OTP for delivery' },
  'Logistics'
);

// 6. Add POST /api/business-registry (root)
addPathBlock(
  "  '/api/business-registry/{id}':",
  '/api/business-registry',
  { POST: 'Create business record (legacy endpoint)' },
  'Business'
);

// 7. Add /api/catalog/seller-locations (GET + POST)
addPathBlock(
  '  /api/catalog/seller-locations/geography/regions:',
  '/api/catalog/seller-locations',
  { GET: 'List seller locations', POST: 'Create a seller location' },
  'Catalog'
);

// 8. Add /api/catalog/seller-locations/{locationId} (GET, PUT, DELETE)
addPathBlock(
  '  /api/catalog/seller-locations/geography/regions:',
  '/api/catalog/seller-locations/{locationId}',
  { GET: 'Get seller location by ID', PUT: 'Update seller location', DELETE: 'Delete seller location' },
  'Catalog'
);

// 9. Add activate/deactivate
addPathBlock(
  '  /api/catalog/seller-locations/geography/regions:',
  '/api/catalog/seller-locations/{locationId}/activate',
  { PATCH: 'Activate seller location' },
  'Catalog'
);
addPathBlock(
  '  /api/catalog/seller-locations/geography/regions:',
  '/api/catalog/seller-locations/{locationId}/deactivate',
  { PATCH: 'Deactivate seller location' },
  'Catalog'
);

fs.writeFileSync(file, result.join(EOL), 'utf-8');
console.log(`\nFile now has ${result.length} lines.`);
try {
  execSync(`node -e "const yaml=require('js-yaml');const fs=require('fs');yaml.load(fs.readFileSync('openapi.yaml','utf-8'));console.log('YAML valid')"`, { stdio: 'inherit' });
} catch { console.error('YAML validation failed!'); }
