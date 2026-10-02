#!/usr/bin/env node
/**
 * Re-record the openapi coverage ratchet fixture.
 *
 * Regenerates scripts/contract/openapi-coverage-baseline.json from the current
 * openapi.yaml + source tree. Run this ONLY when documenting additional
 * endpoints reduces `undocumentedCount`, or when a deliberate, reviewed change
 * to the mounted surface grows it - the ratchet test
 * (scripts/contract/openapi-coverage.test.js) compares against this baseline so
 * undocumented routes cannot silently accumulate (DEF-018).
 *
 * Usage: node scripts/contract/emit-openapi-coverage-baseline.js
 */
const fs = require('fs');
const path = require('path');
const { verifyRoutes } = require('./verify-openapi-routes');

const repoRoot = path.resolve(__dirname, '..', '..');
const specPath = path.join(repoRoot, 'openapi.yaml');
const baselinePath = path.join(__dirname, 'openapi-coverage-baseline.json');

const result = verifyRoutes(specPath);

const undocumented = result.missingFromSpec
  .map(route => `${route.method} ${route.path}`)
  .sort();

const fixture = {
  spec: 'openapi.yaml',
  documentedCount: result.specCount,
  unreachableCount: result.extraInSpec.length,
  undocumentedCount: undocumented.length,
  undocumented,
};

fs.writeFileSync(baselinePath, JSON.stringify(fixture, null, 2) + '\n');
console.log(
  `recorded ${baselinePath}: documented=${fixture.documentedCount} ` +
    `unreachable=${fixture.unreachableCount} undocumented=${fixture.undocumentedCount}`
);
