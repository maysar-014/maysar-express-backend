import fs from 'fs';
import { execSync } from 'child_process';

const file = 'openapi.yaml';
const rawContent = fs.readFileSync(file, 'utf-8');
const crlf = rawContent.includes('\r\n');
const EOL = crlf ? '\r\n' : '\n';
const lines = rawContent.split(/\r?\n/);

function safe(s) {
  if (s.match(/[:#\[\]{}&*!|>'"%@`,]/)) return `"${s.replace(/"/g, '\\"')}"`;
  return s;
}

function stdBlock(path, operations, tag, noAuth) {
  const paramNames = [...path.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
  const paramLines = paramNames.length > 0
    ? ["      parameters:", ...paramNames.flatMap(p => [
        `        - name: ${p}`, "          in: path", "          required: true", "          schema:", "            type: string",
      ])]
    : ["      parameters: []"];
  const secLines = noAuth ? ["      security: []"] : ["      security:", "        - BearerAuth: []"];
  const res = [
    "      responses:",
    "        '200':", "          description: OK", "          content:", "            application/json:", "              schema: {}", "            text/plain:", "              schema: {}",
    "        '400':", "          description: Validation error", "          content:", "            application/json:", "              schema: {}", "            text/plain:", "              schema: {}",
    "        '401':", "          description: Unauthorized", "          content:", "            application/json:", "              schema: {}", "            text/plain:", "              schema: {}",
    "        '403':", "          description: Forbidden", "          content:", "            application/json:", "              schema: {}", "            text/plain:", "              schema: {}",
    "        '404':", "          description: Not Found", "          content:", "            application/json:", "              schema: {}", "            text/plain:", "              schema: {}",
    "        '500':", "          description: Internal Server Error", "          content:", "            application/json:", "              schema: {}", "            text/plain:", "              schema: {}",
  ];
  const block = [`  ${path}:`, "    parameters: []"];
  for (const [method, summary] of Object.entries(operations)) {
    block.push(`    ${method.toLowerCase()}:`, "      tags:", `        - ${tag}`, `      summary: ${safe(summary)}`, ...res, ...paramLines, ...secLines);
  }
  return block;
}

const result = [...lines];

// 1. Insert POST /api/business-registry before the first /api/business-registry/ route
const brIdx = result.findIndex(l => l.trim() === "'/api/business-registry/{id}':");
if (brIdx !== -1 && !result.some(l => l.trim() === '/api/business-registry:')) {
  const block = stdBlock('/api/business-registry', { post: 'Create business record (legacy endpoint)' }, 'Business', false);
  result.splice(brIdx, 0, ...block, '');
  console.log(`✓ Inserted POST /api/business-registry at line ${brIdx+1}`);
} else {
  console.log('⚠ POST /api/business-registry already exists or anchor not found');
}

// 2. Insert PUT /api/enabler/enablers/seller/{sellerId}/promotion-offer before /promotion-offer/close
const closeIdx = result.findIndex(l => l.includes('promotion-offer/close'));
const putPath = "/api/enabler/enablers/seller/{sellerId}/promotion-offer";
if (closeIdx !== -1 && !result.some(l => l.includes('promotion-offer:') && !l.includes('close') && !l.includes('application') && l.trim().startsWith("'/"))) {
  const block = stdBlock(putPath, { put: 'Update seller promotion offer' }, 'Enabler', false);
  result.splice(closeIdx, 0, ...block, '');
  console.log(`✓ Inserted PUT ${putPath} at line ${closeIdx+1}`);
} else {
  console.log('⚠ PUT promotion-offer already exists or anchor not found');
}

fs.writeFileSync(file, result.join(EOL), 'utf-8');
console.log(`\nFile now has ${result.length} lines.`);
try {
  execSync(`node -e "const yaml=require('js-yaml');const fs=require('fs');yaml.load(fs.readFileSync('openapi.yaml','utf-8'));console.log('YAML valid')"`, { stdio: 'inherit' });
} catch { console.error('YAML validation failed!'); }
