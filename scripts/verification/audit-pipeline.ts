/**
 * Audit Pipeline
 *
 * Wires the three static-analysis phases together:
 *   1. Flow Discovery  — parse docs/FLOWS/, assign FLOW-NNN IDs
 *   2. Implementation Tracing — trace each flow through routes/services/Prisma/events
 *   3. Database Impact Mapping — classify direct/indirect Affected_Tables
 *
 * Writes three JSON artifacts:
 *   docs/verification/flow-inventory.json
 *   docs/verification/flow-database-matrix.json
 *   docs/verification/discrepancies.json
 *
 * Usage:
 *   npx ts-node scripts/verification/audit-pipeline.ts [--dry-run] [--flows-dir <path>]
 */

import path from 'path';

import {
  discoverFlows,
  readDefectRegister,
  writeFlowInventory,
} from './discovery';
import { traceFlow, classifyDiscrepancies, convertToDiscrepancyRecords, writeDiscrepancies } from './tracer';
import { mapDatabaseImpact, writeFlowDatabaseMatrix } from './db-impact-mapper';
import { DiscrepancyRecord } from './types';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const WORKSPACE_ROOT = path.resolve(__dirname, '..', '..');
const FLOWS_DIR = path.join(WORKSPACE_ROOT, 'docs', 'FLOWS');
const VERIFICATION_DIR = path.join(WORKSPACE_ROOT, 'docs', 'FLOWS', '_verification');
const SERVICES_ROOT = path.join(WORKSPACE_ROOT, 'services');
const PRISMA_SCHEMA = path.join(WORKSPACE_ROOT, 'prisma', 'schema.prisma');
const OUTPUT_DIR = path.join(WORKSPACE_ROOT, 'docs', 'verification');

const FLOW_INVENTORY_PATH = path.join(OUTPUT_DIR, 'flow-inventory.json');
const FLOW_DB_MATRIX_PATH = path.join(OUTPUT_DIR, 'flow-database-matrix.json');
const DISCREPANCIES_PATH = path.join(OUTPUT_DIR, 'discrepancies.json');

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs(): { dryRun: boolean; flowsDir: string } {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const flowsDirIdx = args.indexOf('--flows-dir');
  const flowsDir =
    flowsDirIdx !== -1 && args[flowsDirIdx + 1]
      ? path.resolve(args[flowsDirIdx + 1])
      : FLOWS_DIR;
  return { dryRun, flowsDir };
}

// ---------------------------------------------------------------------------
// run
// ---------------------------------------------------------------------------

async function run(): Promise<void> {
  const { dryRun, flowsDir } = parseArgs();

  console.log('[audit-pipeline] Starting audit pipeline...');
  console.log(`[audit-pipeline] Flows directory: ${flowsDir}`);
  console.log(`[audit-pipeline] Dry-run: ${dryRun}`);

  // ── Phase 1: Flow Discovery ─────────────────────────────────────────────

  console.log('\n[Phase 1] Discovering flows...');
  const defectMap = readDefectRegister(VERIFICATION_DIR);
  console.log(`[Phase 1] Loaded ${defectMap.size} defect register entries`);

  const flows = discoverFlows(flowsDir, defectMap);
  const discoveredCount = flows.filter((f) => f.discoveryStatus === 'discovered').length;
  const noFlowsCount = flows.filter((f) => f.discoveryStatus === 'no-flows-found').length;
  const parseErrorCount = flows.filter((f) => f.discoveryStatus === 'parse-error').length;

  console.log(`[Phase 1] Discovered: ${discoveredCount} flows`);
  console.log(`[Phase 1] Categories with no flows: ${noFlowsCount}`);
  console.log(`[Phase 1] Parse errors: ${parseErrorCount}`);

  if (!dryRun) {
    writeFlowInventory(flows, FLOW_INVENTORY_PATH);
    console.log(`[Phase 1] Written: ${FLOW_INVENTORY_PATH}`);
  }

  // ── Phase 2: Implementation Tracing ─────────────────────────────────────

  console.log('\n[Phase 2] Tracing flow implementations...');

  const traces = flows
    .filter((f) => f.discoveryStatus === 'discovered')
    .map((flow) => {
      const trace = traceFlow(flow, SERVICES_ROOT, PRISMA_SCHEMA);
      return trace;
    });

  const allDiscrepancyRecords: DiscrepancyRecord[] = [];
  let discIdx = 1;

  for (let i = 0; i < traces.length; i++) {
    const trace = traces[i];
    const enrichedDiscrepancies = classifyDiscrepancies(trace, defectMap);
    const records = convertToDiscrepancyRecords(enrichedDiscrepancies, discIdx);
    // Set flowId on each record
    for (const rec of records) {
      rec.flowId = trace.flowId;
    }
    allDiscrepancyRecords.push(...records);
    discIdx += records.length;
  }

  console.log(`[Phase 2] Traced ${traces.length} flows`);
  console.log(`[Phase 2] Found ${allDiscrepancyRecords.length} discrepancies`);

  if (!dryRun) {
    writeDiscrepancies(allDiscrepancyRecords, DISCREPANCIES_PATH);
    console.log(`[Phase 2] Written: ${DISCREPANCIES_PATH}`);
  }

  // ── Phase 3: Database Impact Mapping ────────────────────────────────────

  console.log('\n[Phase 3] Mapping database impact...');

  const impacts = mapDatabaseImpact(traces);
  const totalTables = impacts.reduce((sum, imp) => sum + imp.tables.length, 0);
  const directTables = impacts.reduce(
    (sum, imp) => sum + imp.tables.filter((t) => t.classification === 'direct').length,
    0,
  );
  const indirectTables = totalTables - directTables;

  console.log(`[Phase 3] Mapped ${totalTables} table-flow relationships`);
  console.log(`[Phase 3]   Direct:   ${directTables}`);
  console.log(`[Phase 3]   Indirect: ${indirectTables}`);

  if (!dryRun) {
    writeFlowDatabaseMatrix(impacts, FLOW_DB_MATRIX_PATH);
    console.log(`[Phase 3] Written: ${FLOW_DB_MATRIX_PATH}`);
  }

  // ── Summary ──────────────────────────────────────────────────────────────

  console.log('\n[audit-pipeline] ✓ Audit pipeline complete');
  console.log(`  Flows discovered:    ${discoveredCount}`);
  console.log(`  Traces produced:     ${traces.length}`);
  console.log(`  Discrepancies found: ${allDiscrepancyRecords.length}`);
  console.log(`  DB impact rows:      ${totalTables}`);

  if (dryRun) {
    console.log('\n[audit-pipeline] Dry-run mode — no files written.');
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

run().catch((err) => {
  console.error('[audit-pipeline] Fatal error:', err);
  process.exit(1);
});
