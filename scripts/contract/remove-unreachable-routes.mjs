/**
 * Removes route entries from openapi.yaml that are documented but not mounted.
 * Removes entire path blocks for each specified route.
 */
import fs from 'fs';

const file = 'openapi.yaml';
const rawContent = fs.readFileSync(file, 'utf-8');
const crlf = rawContent.includes('\r\n');
const EOL = crlf ? '\r\n' : '\n';
const lines = rawContent.split(/\r?\n/);

// Routes to remove - exact path key as it appears in openapi.yaml
const toRemove = [
  '/api/kyc/audit-log',
  '/api/kyc/kyc-status/{userId}',
  '/api/kyc/manual-review/pending',
  '/api/kyc/manual-review',
];

function removeRouteBlock(lines, routePath) {
  // Find the line that starts this route (with or without quotes)
  const escapedPath = routePath.replace(/[{}/]/g, c => '\\' + c);
  const startIdx = lines.findIndex(l => {
    const trimmed = l.trim();
    return (
      trimmed === `${routePath}:` ||
      trimmed === `'${routePath}':` ||
      trimmed === `"${routePath}":` ||
      new RegExp(`^['"]{0,1}${escapedPath}['"]{0,1}:$`).test(trimmed)
    );
  });

  if (startIdx === -1) {
    console.log(`  ✗ Not found: ${routePath}`);
    return lines;
  }

  // Find the end of this block — next top-level path entry or end of paths
  let endIdx = startIdx + 1;
  while (endIdx < lines.length) {
    const line = lines[endIdx];
    // A top-level path starts with exactly 2 spaces followed by non-space
    if (/^  [^\s]/.test(line) && !line.startsWith('  #')) {
      break;
    }
    endIdx++;
  }

  console.log(`  ✓ Removing ${routePath} (lines ${startIdx + 1}-${endIdx})`);
  lines.splice(startIdx, endIdx - startIdx);
  return lines;
}

let result = [...lines];
for (const route of toRemove) {
  result = removeRouteBlock(result, route);
}

fs.writeFileSync(file, result.join(EOL), 'utf-8');
console.log(`\nDone. File now has ${result.length} lines.`);

// Validate
import { execSync } from 'child_process';
try {
  execSync(`node -e "const yaml=require('js-yaml');const fs=require('fs');yaml.load(fs.readFileSync('openapi.yaml','utf-8'));console.log('YAML valid')"`, { stdio: 'inherit' });
} catch {
  console.error('YAML validation failed!');
}
