/**
 * Find the 5 new undocumented routes (126 current - 121 baseline)
 */
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

const { verifyRoutes } = require('../scripts/contract/verify-openapi-routes');
const baseline = JSON.parse(fs.readFileSync(path.join(repoRoot, 'scripts/contract/openapi-coverage-baseline.json'), 'utf-8'));

const result = verifyRoutes(path.join(repoRoot, 'openapi.yaml'));

const currentUndocumented = new Set(result.missingFromSpec.map(r => `${r.method} ${r.path}`));
const baselineUndocumented = new Set(baseline.undocumented);

// Find routes that are NEW (in current but not in baseline)
const newUndocumented = [...currentUndocumented].filter(r => !baselineUndocumented.has(r)).sort();
// Find routes that were REMOVED from undocumented (now documented or removed)
const fixedRoutes = [...baselineUndocumented].filter(r => !currentUndocumented.has(r)).sort();

console.log(`Current undocumented: ${currentUndocumented.size}`);
console.log(`Baseline undocumented: ${baselineUndocumented.size}`);
console.log(`Net change: +${newUndocumented.length} new, -${fixedRoutes.length} fixed`);

console.log('\n=== NEW undocumented routes (added since baseline) ===');
for (const r of newUndocumented) console.log(' +', r);

if (fixedRoutes.length > 0) {
  console.log('\n=== Routes now documented (no longer in undocumented list) ===');
  for (const r of fixedRoutes) console.log(' -', r);
}
