#!/usr/bin/env node
/**
 * Measures the mounted-but-undocumented surface (DEF-018 / BLG-014).
 *
 * Reports how many mounted routes are absent from openapi.yaml and how many
 * documented operations are not actually mounted. The second number is the
 * dangerous one: a client can call a documented path that the bootstrap never
 * serves.
 *
 * Usage:  node scripts/contract/measure-undocumented-routes.cjs [--json]
 * Exit:   0 always (this is a report, not a gate — the gate is
 *         scripts/contract/openapi-coverage.test.js)
 */
const path = require('path');
const { verifyRoutes } = require(path.resolve(__dirname, 'verify-openapi-routes.js'));

const repoRoot = path.resolve(__dirname, '..', '..');
const result = verifyRoutes(path.resolve(repoRoot, 'openapi.yaml'));

const undocumented = result.missingFromSpec
    .map((r) => `${r.method} ${r.path}`)
    .sort();
const unreachable = result.extraInSpec
    .map((r) => `${r.method} ${r.path}`)
    .sort();

if (process.argv.includes('--json')) {
    console.log(JSON.stringify({
        undocumentedCount: undocumented.length,
        unreachableCount: unreachable.length,
        undocumented,
        unreachable,
    }, null, 2));
} else {
    // Group by service so the biggest offender is obvious at a glance.
    const byService = {};
    for (const op of undocumented) {
        const service = op.split(' ')[1].split('/')[2] || 'unknown';
        byService[service] = (byService[service] || 0) + 1;
    }
    const ranked = Object.entries(byService).sort((a, b) => b[1] - a[1]);

    console.log(`mounted but undocumented : ${undocumented.length}`);
    console.log(`documented but unmounted : ${unreachable.length}`);
    console.log('\nundocumented by service:');
    for (const [service, count] of ranked) {
        console.log(`  ${String(count).padStart(3)}  ${service}`);
    }
    if (unreachable.length) {
        console.log('\nWARNING - documented operations the bootstrap never serves:');
        for (const op of unreachable) console.log(`  ${op}`);
    }
}
