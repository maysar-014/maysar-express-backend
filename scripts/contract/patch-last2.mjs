/**
 * Adds the final 2 undocumented routes:
 * 1. POST /api/business-registry  (root endpoint, lost when auth routes shifted things)
 * 2. PUT /api/enabler/enablers/seller/{sellerId}/promotion-offer
 */
import fs from 'fs';
import { execSync } from 'child_process';

const file = 'openapi.yaml';
const rawContent = fs.readFileSync(file, 'utf-8');
const crlf = rawContent.includes('\r\n');
const EOL = crlf ? '\r\n' : '\n';
const lines = rawContent.split(/\r?\n/);

const stdBlock = (path, ops, tag) => {
  const params = [...path.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
  const paramLines = params.length > 0
    ? ["      parameters:", ...params.flatMap(p => [`        - name: ${p}`, "          in: path", "          required: true", "          schema:", "            type: string"])]
    : ["      parameters: []"];
  const r = ["      responses:", "        '200':", "          description: OK", "          content:", "            application/json:", "              schema: {}", "            text/plain:", "              schema: {}",
    "        '400':", "          description: Validation error", "          content:", "            application/json:", "              schema: {}", "            text/plain:", "              schema: {}",
    "        '401':", "          description: Unauthorized", "          content:", "            application/json:", "              schema: {}", "            text/plain:", "              schema: {}",
    "        '403':", "          description: Forbidden", "          content:", "            application/json:", "              schema: {}", "            text/plain:", "              schema: {}",
    "        '404':", "          description: Not Found", "          content:", "            application/json:", "              schema: {}", "            text/plain:", "              schema: {}",
    "        '500':", "          description: Internal Server Error", "          content:", "            application/json:", "              schema: {}", "            text/plain:", "              schema: {}",
  ];
  const block = [`  ${path}:`, "    parameters: []"];
  for (const [m, s] of Object.entries(ops)) {
    block.push(`    ${m.toLowerCase()}:`, "      tags:", `        - ${tag}`, `      summary: ${s}`, ...r, ...paramLines, "      security:", "        - BearerAuth: []");
  }
  return block;
};

const result = [...lines];

// 1. POST /api/business-registry — insert before /api/business-registry/ routes
// The first /api/business-registry/{id} entry exists, add the root before it
const brIdIdx = result.findIndex(l => l.trim() === "'/api/business-registry/{id}':");
const brRootExists = result.some(l => l.trim() === '/api/business-registry:');
if (brIdIdx !== -1 && !brRootExists) {
  const block = stdBlock('/api/business-registry', { post: 'Create business record' }, 'Business');
  result.splice(brIdIdx, 0, ...block, '');
  console.log(`✓ Inserted POST /api/business-registry before line ${brIdIdx+1}`);
} else {
  console.log(`⚠ POST /api/business-registry: exists=${brRootExists}, anchor found=${brIdIdx !== -1}`);
}

// 2. PUT promotion-offer — add PUT method to existing path block
// The path '/api/enabler/enablers/seller/{sellerId}/promotion-offer': already has GET
// We need to add put: method to that block
const promoGetIdx = result.findIndex(l => l.trim() === "'/api/enabler/enablers/seller/{sellerId}/promotion-offer':");
if (promoGetIdx !== -1) {
  // Find where the existing GET block for this path ends (next top-level path)
  let endIdx = promoGetIdx + 1;
  while (endIdx < result.length && !result[endIdx].match(/^  ['"]?\/api\//)) endIdx++;
  
  // Insert PUT method right before the end of this block
  const putBlock = [
    "    put:",
    "      tags:",
    "        - Enabler",
    "      summary: Update seller promotion offer",
    "      responses:",
    "        '200':",
    "          description: OK",
    "          content:",
    "            application/json:",
    "              schema: {}",
    "            text/plain:",
    "              schema: {}",
    "        '400':",
    "          description: Validation error",
    "          content:",
    "            application/json:",
    "              schema: {}",
    "            text/plain:",
    "              schema: {}",
    "        '401':",
    "          description: Unauthorized",
    "          content:",
    "            application/json:",
    "              schema: {}",
    "            text/plain:",
    "              schema: {}",
    "        '403':",
    "          description: Forbidden",
    "          content:",
    "            application/json:",
    "              schema: {}",
    "            text/plain:",
    "              schema: {}",
    "        '404':",
    "          description: Not Found",
    "          content:",
    "            application/json:",
    "              schema: {}",
    "            text/plain:",
    "              schema: {}",
    "        '500':",
    "          description: Internal Server Error",
    "          content:",
    "            application/json:",
    "              schema: {}",
    "            text/plain:",
    "              schema: {}",
    "      parameters:",
    "        - name: sellerId",
    "          in: path",
    "          required: true",
    "          schema:",
    "            type: string",
    "      security:",
    "        - BearerAuth: []",
  ];
  result.splice(endIdx, 0, ...putBlock);
  console.log(`✓ Added PUT method to /api/enabler/enablers/seller/{sellerId}/promotion-offer at line ${endIdx+1}`);
} else {
  console.log(`✗ Could not find promotion-offer path block`);
}

fs.writeFileSync(file, result.join(EOL), 'utf-8');
console.log(`\nFile now has ${result.length} lines.`);
try {
  execSync(`node -e "const yaml=require('js-yaml');const fs=require('fs');yaml.load(fs.readFileSync('openapi.yaml','utf-8'));console.log('YAML valid')"`, { stdio: 'inherit' });
} catch { console.error('YAML validation failed!'); }
