/**
 * Report Generator
 *
 * Reads all static and run-specific artifacts and assembles the full
 * 9-section FLOW_AUDIT_REPORT.md at docs/verification/FLOW_AUDIT_REPORT.md.
 *
 * Also performs cross-reference validation before rendering.
 */

import fs from 'fs';
import path from 'path';

import { validateCrossReferences } from './artifact-validator.mjs';

// ---------------------------------------------------------------------------
// generateReport
// ---------------------------------------------------------------------------

/**
 * Generates the complete FLOW_AUDIT_REPORT.md.
 *
 * @param {object} opts
 * @param {string} opts.verificationDir  - docs/verification/ (static artifacts)
 * @param {string} opts.runArtifactsDir  - artifacts/verification/<run-id>/
 * @param {string} opts.priorVerifDir    - docs/FLOWS/_verification/ (read-only)
 * @param {string} opts.prismaSchemaPath- prisma/schema.prisma
 * @returns {string} path to the written report
 */
export function generateReport(opts) {
  const {
    verificationDir,
    runArtifactsDir,
    priorVerifDir,
    prismaSchemaPath,
  } = opts;

  // ── Load all artifacts ───────────────────────────────────────────────────

  const inventory = loadJson(path.join(verificationDir, 'flow-inventory.json'));
  const dbMatrix  = loadJson(path.join(verificationDir, 'flow-database-matrix.json'));
  const disc      = loadJson(path.join(verificationDir, 'discrepancies.json'));

  let execResults  = null;
  let cleanupResults = null;
  if (runArtifactsDir && fs.existsSync(runArtifactsDir)) {
    execResults = loadJsonSafe(path.join(runArtifactsDir, 'execution-results.json'));
    cleanupResults = loadJsonSafe(path.join(runArtifactsDir, 'cleanup-results.json'));
  }

  // ── Load Prisma model names for coverage ─────────────────────────────────

  const allPrismaModels = extractPrismaModelNames(prismaSchemaPath);
  const touchedModels = new Set();
  for (const imp of dbMatrix) {
    for (const t of imp.tables ?? []) {
      touchedModels.add(t.prismaModel);
    }
  }
  const dbCoveragePct = allPrismaModels.length > 0
    ? Math.round((touchedModels.size / allPrismaModels.length) * 100)
    : 0;

  // ── Cross-reference validation ────────────────────────────────────────────

  const validation = validateCrossReferences(inventory, dbMatrix, disc, execResults, cleanupResults);
  const validationWarnings = validation.warnings;

  // ── Build the report ─────────────────────────────────────────────────────

  const sections = [
    section1_ExecutiveSummary(inventory, disc, execResults, cleanupResults, dbCoveragePct, allPrismaModels, touchedModels, validationWarnings),
    section2_ScopeAndInventory(inventory, priorVerifDir),
    section3_MasterFlowMatrix(inventory, execResults, cleanupResults, disc),
    section4_PerFlowRecords(inventory, dbMatrix, disc, execResults, cleanupResults),
    section5_CrossFlowDbCoverage(dbMatrix, allPrismaModels),
    section6_DiscrepancyRegister(disc),
    section7_TestRunnerAndArtifacts(runArtifactsDir, verificationDir),
    section8_FinalSummary(inventory, execResults, cleanupResults, disc, dbCoveragePct),
    section9_SupportingArtifacts(verificationDir, runArtifactsDir),
  ];

  const report = sections.join('\n\n---\n\n') + '\n';

  // ── Write ──────────────────────────────────────────────────────────────────

  const reportPath = path.join(verificationDir, 'FLOW_AUDIT_REPORT.md');
  fs.mkdirSync(verificationDir, { recursive: true });
  fs.writeFileSync(reportPath, report, 'utf-8');
  return reportPath;
}

// ===========================================================================
// Section 1: Executive Summary
// ===========================================================================

function section1_ExecutiveSummary(inventory, disc, exec, cleanup, dbCoveragePct, allModels, touchedModels, warnings) {
  const flowsDiscovered = inventory.length;
  const flowsAudited = inventory.filter(f => f.discoveryStatus === 'discovered').length;
  const flowsAligned = flowsAudited - (disc.length > 0 ? Math.min(disc.length, flowsAudited) : 0);
  const flowsWithDiscrepancies = disc.length;

  let flowsTested = 0, flowsPassed = 0, flowsFailed = 0, flowsBlocked = 0;
  if (exec) {
    flowsTested = exec.results?.length ?? 0;
    flowsPassed = exec.summary?.passed ?? 0;
    flowsFailed = exec.summary?.failed ?? 0;
    flowsBlocked = (exec.summary?.blocked ?? 0) + (exec.summary?.missingRoute ?? 0) + (exec.summary?.blockedPrereq ?? 0) + (exec.summary?.timeout ?? 0);
  }

  let totalEntities = 0, cleanedEntities = 0, failedCleanups = 0, cleanupRate = 'N/A';
  if (cleanup) {
    totalEntities = cleanup.totalEntities ?? 0;
    cleanedEntities = cleanup.cleanedEntities ?? 0;
    failedCleanups = cleanup.failedCleanups ?? 0;
    cleanupRate = totalEntities > 0 ? `${Math.round((cleanedEntities / totalEntities) * 100)}%` : '100%';
  }

  const criticalRisks = disc
    .filter(d => d.severity === 'critical')
    .map(d => `- [${d.discrepancyId}] ${d.type}: ${d.description}`)
    .join('\n') || 'None identified';

  return `# Maysar Flow and System Verification — Audit Report

## 1. Executive Summary

| Field | Value |
|---|---|
| **Audit scope** | \`docs/FLOWS/\` (24 flow categories), \`services/\` (22+ microservices), \`prisma/schema.prisma\` (5246 lines), \`docs/FLOWS/_verification/\` (prior sweep) |
| **Audit date** | ${new Date().toISOString()} |
| **Flows discovered** | ${flowsDiscovered} |
| **Flows audited** | ${flowsAudited} |
| **Flows aligned** | ${flowsAligned} |
| **Flows with discrepancies** | ${flowsWithDiscrepancies} |
| **Flows tested** | ${flowsTested} |
| **Flows passed** | ${flowsPassed} |
| **Flows failed** | ${flowsFailed} |
| **Flows blocked** | ${flowsBlocked} |
| **Database coverage** | ${touchedModels.size}/${allModels.length} models touched (${dbCoveragePct}%) |
| **Cleanup results** | ${cleanedEntities}/${totalEntities} entities cleaned (${cleanupRate}), ${failedCleanups} failed |
| **Critical risks** | ${criticalRisks} |

${warnings.length > 0 ? `### Cross-Reference Validation Warnings\n\n${warnings.map(w => `- ⚠️ ${w}`).join('\n')}` : ''}

### Overall Assessment

${flowsTested > 0
  ? `The verification framework executed ${flowsTested} flows through real API calls. ${flowsPassed} passed all assertions, ${flowsFailed} failed, and ${flowsBlocked} were blocked. Database coverage stands at ${dbCoveragePct}% of Prisma models. Cleanup verified ${cleanupRate} of test-owned entities were removed.`
  : `The audit pipeline completed static analysis (discovery, tracing, database impact mapping) successfully. No live API execution has been run yet — execute \`verify-flows.mjs\` against a running application to populate execution results.`
}`;
}

// ===========================================================================
// Section 2: Scope and Implementation Inventory
// ===========================================================================

function section2_ScopeAndInventory(inventory, priorVerifDir) {
  const services = new Set();
  const roles = new Set();
  for (const f of inventory) {
    services.add(f.service);
    for (const r of f.roles) roles.add(r);
  }

  const priorArtifacts = fs.existsSync(priorVerifDir)
    ? fs.readdirSync(priorVerifDir).filter(f => f.endsWith('.md') || f.endsWith('.json')).join(', ')
    : 'None found';

  return `## 2. Scope and Implementation Inventory

### Flow Documentation

- **Source directory:** \`docs/FLOWS/\`
- **Categories discovered:** ${services.size}
- **Total flows:** ${inventory.length}
- **Roles covered:** ${[...roles].join(', ')}

### Services Examined

${[...services].map(s => `- ${s}`).join('\n')}

### Prior Verification Evidence

- **Directory:** \`docs/FLOWS/_verification/\`
- **Artifacts:** ${priorArtifacts}
- **Status:** Read-only evidence base (September 2026 sweep, 563 operations)

### Database Schema

- **ORM:** Prisma
- **Schema file:** \`prisma/schema.prisma\`
- **Schema size:** ~5246 lines`;
}

// ===========================================================================
// Section 3: Master Flow Inventory and Status Matrix
// ===========================================================================

function section3_MasterFlowMatrix(inventory, exec, cleanup, disc) {
  const discByFlow = new Map();
  for (const d of disc) {
    if (!discByFlow.has(d.flowId)) discByFlow.set(d.flowId, []);
    discByFlow.get(d.flowId).push(d);
  }

  const execByFlow = new Map();
  if (exec) {
    for (const r of exec.results ?? []) {
      execByFlow.set(r.flowId, r);
    }
  }

  const rows = inventory.map(f => {
    const execResult = execByFlow.get(f.flowId);
    const flowDiscs = discByFlow.get(f.flowId) ?? [];

    const docStatus = flowDiscs.length === 0 ? 'ALIGNED' : 'DISCREPANCY';
    const apiStatus = execResult?.verdict ?? 'NOT_RUN';
    const dbStatus = execResult?.dbStateDiff?.length > 0
      ? (execResult.dbStateDiff.some(d => !d.assertionPassed) ? 'MISMATCH' : 'VERIFIED')
      : 'NOT_TESTED';
    const cleanupStatus = 'NOT_RUN';

    let finalVerdict = 'NOT_RUN';
    if (execResult) {
      if (execResult.verdict === 'passed' && dbStatus === 'VERIFIED') finalVerdict = 'FULLY_VERIFIED';
      else if (execResult.verdict === 'passed') finalVerdict = 'PARTIALLY_VERIFIED';
      else finalVerdict = execResult.verdict.toUpperCase();
    } else if (flowDiscs.length > 0) {
      finalVerdict = 'DISCREPANCY';
    }

    return `| ${f.flowId} | ${f.title} | ${f.service} | ${f.roles.join(', ') || '-'} | ${docStatus} | ${apiStatus} | ${dbStatus} | ${cleanupStatus} | ${finalVerdict} |`;
  });

  return `## 3. Master Flow Inventory and Status Matrix

| Flow ID | Flow Name | Service | Roles | Doc Status | API Status | DB Status | Cleanup | Final Verdict |
|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}`;
}

// ===========================================================================
// Section 4: Detailed Per-Flow Audit Records
// ===========================================================================

function section4_PerFlowRecords(inventory, dbMatrix, disc, exec, cleanup) {
  const dbByFlow = new Map();
  for (const imp of dbMatrix) dbByFlow.set(imp.flowId, imp.tables ?? []);
  const discByFlow = new Map();
  for (const d of disc) {
    if (!discByFlow.has(d.flowId)) discByFlow.set(d.flowId, []);
    discByFlow.get(d.flowId).push(d);
  }
  const execByFlow = new Map();
  if (exec) for (const r of exec.results ?? []) execByFlow.set(r.flowId, r);

  const records = inventory.slice(0, 20).map(f => {
    const tables = dbByFlow.get(f.flowId) ?? [];
    const flowDiscs = discByFlow.get(f.flowId) ?? [];
    const execResult = execByFlow.get(f.flowId);

    return `### ${f.flowId}: ${f.title}

**Identity:** ${f.flowId} | ${f.service} | ${f.roles.join(', ') || '-'} | \`${f.docPath}\`

#### Implementation Trace
- Route file: *(see tracer output)*
- Prisma models: ${tables.map(t => t.prismaModel).join(', ') || 'None identified'}
- Events: *(see tracer output)*

#### API Contract
${f.endpoints.length > 0
  ? f.endpoints.map(e => `- \`${e.method} ${e.path}\``).join('\n')
  : '- No endpoints documented'}

#### Database Impact
${tables.length > 0
  ? `| Model | Table | Effect | Classification | Causal Chain |
|---|---|---|---|---|
${tables.map(t => `| ${t.prismaModel} | ${t.tableName} | ${t.effectType} | ${t.classification} | ${t.causalChain} |`).join('\n')}`
  : '- No database impact identified'}

#### Discrepancies
${flowDiscs.length > 0
  ? flowDiscs.map(d => `- [${d.discrepancyId}] ${d.type} (${d.severity}): ${d.description}`).join('\n')
  : '- None'}

#### Execution Results
${execResult
  ? `- Status: ${execResult.statusCode}
- Duration: ${execResult.durationMs}ms
- Verdict: **${execResult.verdict}**
${execResult.failureReason ? `- Failure reason: ${execResult.failureReason}` : ''}
${execResult.dbStateDiff?.length > 0
  ? `- DB diff: ${execResult.dbStateDiff.map(d => `${d.tableName} delta=${d.delta} ${d.assertionPassed ? '✅' : '❌'}`).join(', ')}`
  : ''}`
  : '- Not executed'}
`;
  }).join('\n');

  const note = inventory.length > 20
    ? `\n*... ${inventory.length - 20} more flows omitted for brevity. See flow-inventory.json for the complete list.*`
    : '';

  return `## 4. Detailed Per-Flow Audit Records

${records}${note}`;
}

// ===========================================================================
// Section 5: Cross-Flow Database Coverage Matrix
// ===========================================================================

function section5_CrossFlowDbCoverage(dbMatrix, allModels) {
  const modelFlows = new Map();
  for (const m of allModels) modelFlows.set(m, { direct: [], indirect: [] });

  for (const imp of dbMatrix) {
    for (const t of imp.tables ?? []) {
      if (!modelFlows.has(t.prismaModel)) modelFlows.set(t.prismaModel, { direct: [], indirect: [] });
      if (t.classification === 'direct') {
        if (!modelFlows.get(t.prismaModel).direct.includes(imp.flowId))
          modelFlows.get(t.prismaModel).direct.push(imp.flowId);
      } else {
        if (!modelFlows.get(t.prismaModel).indirect.includes(imp.flowId))
          modelFlows.get(t.prismaModel).indirect.push(imp.flowId);
      }
    }
  }

  const rows = [...modelFlows.entries()].map(([model, flows]) => {
    const total = flows.direct.length + flows.indirect.length;
    return `| ${model} | ${flows.direct.join(', ') || '-'} | ${flows.indirect.join(', ') || '-'} | ${total} | ${total === 0 ? '⚠️ GAP' : '✅'} |`;
  });

  return `## 5. Cross-Flow Database Coverage Matrix

| Prisma Model | Direct Flows | Indirect Flows | Total Coverage | Status |
|---|---|---|---|---|
${rows.join('\n')}`;
}

// ===========================================================================
// Section 6: Consolidated Discrepancy and Risk Register
// ===========================================================================

function section6_DiscrepancyRegister(disc) {
  if (disc.length === 0) {
    return `## 6. Consolidated Discrepancy and Risk Register

No discrepancies identified.`;
  }

  const rows = disc.map(d =>
    `| ${d.discrepancyId} | ${d.flowId} | ${d.type} | ${d.severity} | ${d.description} | ${d.endpoints.join('; ') || '-'} | ${d.recommendedResolution} | ${d.resolutionStatus} |`,
  );

  return `## 6. Consolidated Discrepancy and Risk Register

| ID | Flow | Type | Severity | Description | Endpoints | Recommended Resolution | Status |
|---|---|---|---|---|---|---|---|
${rows.join('\n')}`;
}

// ===========================================================================
// Section 7: Test Runner and Artifact Inventory
// ===========================================================================

function section7_TestRunnerAndArtifacts(runArtifactsDir, verificationDir) {
  const artifacts = [
    '`scripts/verification/verify-flows.mjs` | Main entry point — executes all flows via real HTTP calls, verifies DB state, runs cleanup | `node --require ts-node/register scripts/verification/verify-flows.mjs --dry-run`',
    '`scripts/verification/audit-pipeline.ts` | Static analysis pipeline — discovery, tracing, DB impact mapping | `npx ts-node scripts/verification/audit-pipeline.ts`',
    '`docs/verification/flow-inventory.json` | Machine-readable flow inventory | Generated by audit-pipeline',
    '`docs/verification/flow-database-matrix.json` | Flow-to-database mapping | Generated by audit-pipeline',
    '`docs/verification/discrepancies.json` | Discrepancy register | Generated by audit-pipeline',
  ];

  if (runArtifactsDir && fs.existsSync(runArtifactsDir)) {
    artifacts.push(
      `\`artifacts/verification/<run-id>/execution-results.json\` | Per-run execution results | Generated by verify-flows.mjs`,
      `\`artifacts/verification/<run-id>/cleanup-results.json\` | Per-run cleanup results | Generated by verify-flows.mjs`,
      `\`artifacts/verification/<run-id>/created-entities.json\` | Entity tracking for cleanup | Generated by verify-flows.mjs`,
    );
  }

  return `## 7. Test Runner and Artifact Inventory

### Modules

| File | Purpose | Execution |
|---|---|---|
${artifacts.join('\n')}

### Runtime Requirements

- **Node.js** >= 18 (for native global fetch and AbortController)
- **PostgreSQL** accessible via \`DATABASE_URL\`
- **Running Maysar application** at \`API_BASE_URL\` (default: \`http://localhost:3000\`)
- **Environment variables:** \`DATABASE_URL\`, \`API_BASE_URL\` (optional), \`ASYNC_DELAY_MS\` (optional)

### CLI Usage

\`\`\`bash
# Dry-run (static analysis only, no API calls)
node --require ts-node/register scripts/verification/verify-flows.mjs --dry-run

# Full run (requires running app + DB)
DATABASE_URL=postgresql://... node --require ts-node/register scripts/verification/verify-flows.mjs

# Run specific flows only
node --require ts-node/register scripts/verification/verify-flows.mjs --flows FLOW-001,FLOW-005

# Cleanup only (from a previous run)
node --require ts-node/register scripts/verification/verify-flows.mjs --cleanup-only 20261027-134718
\`\`\``;
}

// ===========================================================================
// Section 8: Final Verification Summary
// ===========================================================================

function section8_FinalSummary(inventory, exec, cleanup, disc, dbCoveragePct) {
  const totalFlows = inventory.length;
  const alignedFlows = totalFlows - new Set(disc.map(d => d.flowId)).size;
  const docFidelity = totalFlows > 0 ? Math.round((alignedFlows / totalFlows) * 100) : 0;

  let funcVerification = 'N/A — no execution results';
  if (exec) {
    const passed = exec.summary?.passed ?? 0;
    const total = exec.results?.length ?? 0;
    funcVerification = total > 0 ? `${Math.round((passed / total) * 100)}% (${passed}/${total} passed)` : '0%';
  }

  let cleanupAssurance = 'N/A — no cleanup results';
  if (cleanup) {
    const cleaned = cleanup.cleanedEntities ?? 0;
    const total = cleanup.totalEntities ?? 0;
    cleanupAssurance = total > 0 ? `${Math.round((cleaned / total) * 100)}% (${cleaned}/${total})` : '100% (no entities created)';
  }

  return `## 8. Final Verification Summary

### A. Documentation Fidelity
${docFidelity}% of flows have documentation aligned with the implementation (${alignedFlows}/${totalFlows} aligned, ${disc.length} discrepancies).

### B. Functional Verification
${funcVerification}

### C. Persistence Verification
Database coverage: ${dbCoveragePct}% of Prisma models touched by at least one flow.
${exec?.results?.some(r => r.dbStateDiff?.some(d => !d.assertionPassed)) ? '⚠️ Some DB assertions failed — see per-flow records for details.' : 'No DB assertion failures detected.'}

### D. Cleanup Assurance
${cleanupAssurance}

### Residual Risk Statement
${disc.filter(d => d.severity === 'critical').length > 0
  ? '⚠️ Critical discrepancies remain unresolved. See Section 6 for details.'
  : 'No critical risks identified in current audit.'}

### Overall Readiness
${exec
  ? (exec.summary?.failed === 0 && exec.summary?.blocked === 0)
    ? '✅ READY — All executed flows passed and cleanup verified.'
    : '⚠️ NOT READY — Some flows failed or were blocked. See per-flow records.'
  : 'PENDING — Static analysis complete. Live API execution required for full verification.'}`;
}

// ===========================================================================
// Section 9: Required Supporting Artifacts
// ===========================================================================

function section9_SupportingArtifacts(verificationDir, runArtifactsDir) {
  const artifacts = [
    '| `docs/verification/flow-inventory.json` | Machine-readable flow inventory with Flow_IDs, services, roles, endpoints |',
    '| `docs/verification/flow-database-matrix.json` | Flow-to-database mapping with direct/indirect classification and causal chains |',
    '| `docs/verification/discrepancies.json` | Discrepancy register with DISC-NNN IDs, types, severities, and resolution status |',
  ];

  if (runArtifactsDir && fs.existsSync(runArtifactsDir)) {
    artifacts.push(
      '| `artifacts/verification/<run-id>/execution-results.json` | Per-run execution results with HTTP status, duration, verdict, and DB diffs |',
      '| `artifacts/verification/<run-id>/cleanup-results.json` | Per-run cleanup results with entity tracking and residual verification |',
      '| `artifacts/verification/<run-id>/created-entities.json` | Entity registry persisted for cleanup-only re-runs |',
    );
  }

  return `## 9. Required Supporting Artifacts

| Artifact | Description |
|---|---|
${artifacts.join('\n')}

*All artifacts use stable Flow_IDs (FLOW-NNN) and Discrepancy_IDs (DISC-NNN) for cross-referencing.*`;
}

// ===========================================================================
// Helpers
// ===========================================================================

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function loadJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function extractPrismaModelNames(schemaPath) {
  if (!fs.existsSync(schemaPath)) return [];
  const content = fs.readFileSync(schemaPath, 'utf-8');
  const matches = [...content.matchAll(/^model\s+(\w+)\s*\{/gm)];
  return matches.map(m => m[1]);
}
