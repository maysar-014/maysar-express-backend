/**
 * verify-flows.mjs — Main Entry Point
 *
 * Orchestrates the full flow verification run:
 *   1. Load config (env vars + CLI args)
 *   2. Initialize role sessions
 *   3. Execute flows in topological order
 *   4. Verify DB state after each flow
 *   5. Cleanup all test-created entities (guaranteed via finally)
 *   6. Write execution-results.json and cleanup-results.json
 *
 * Usage:
 *   node --require ts-node/register scripts/verification/verify-flows.mjs [options]
 *
 * Options:
 *   --dry-run              Discover flows and print plan without making API calls
 *   --flows FLOW-001,...   Run only specific flows (comma-separated)
 *   --skip-flows FLOW-001,... Exclude specific flows
 *   --cleanup-only <run-id>   Load a previous run's entities and clean them up
 */

import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRequire } from 'module';

import { loadConfig }          from './config.mjs';
import { EntityRegistry }      from './entity-registry.mjs';
import { AuthSessionManager }  from './auth-sessions.mjs';
import { CleanupManager }      from './cleanup.mjs';
import { executeFlow }         from './flow-engine.mjs';
import { closePool }           from './db-layer.mjs';
import { log, writeExecutionResults, writeCleanupResults } from './reporter.mjs';
import { allFlows, buildDependencyGraph } from './flows/index.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Load the compiled TypeScript topo-sort module via CommonJS require shim
const require = createRequire(import.meta.url);

// ts-node/register must be loaded before requiring .ts files
// When running under ts-node this works automatically; otherwise pre-compile
let buildTopologicalOrder;
try {
  const topoMod = require('./topo-sort.ts');
  buildTopologicalOrder = topoMod.buildTopologicalOrder;
} catch {
  // Fallback: simple sequential order (no topological sort)
  buildTopologicalOrder = (flows) => flows.map((f) => [f]);
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const config = loadConfig();
  const {
    runId, testPrefix, artifactsDir,
    dryRun, cleanupOnly, flows: filterFlows, skipFlows,
  } = config;

  log({ phase: 'startup', status: 'starting', message: `Run ID: ${runId}`, runId });

  const entityRegistry = new EntityRegistry(runId, testPrefix);
  const entityRegistryPath = path.join(artifactsDir, 'created-entities.json');

  // ── --cleanup-only mode ──────────────────────────────────────────────────
  if (cleanupOnly) {
    const prevDir  = path.join(path.dirname(artifactsDir), cleanupOnly);
    const prevPath = path.join(prevDir, 'created-entities.json');
    const prevRegistry = EntityRegistry.load(prevPath);
    const adminSessionMgr = new AuthSessionManager(config, prevRegistry);

    log({ phase: 'cleanup', status: 'start', message: `Loading entities from run ${cleanupOnly}` });
    const cleanup = new CleanupManager(config, adminSessionMgr.getCtx());
    const { results, residuals } = await cleanup.execute(prevRegistry);
    cleanup.writeResults(cleanupOnly, prevDir);

    const cleaned = results.filter((r) => r.success).length;
    log({ phase: 'cleanup', status: 'complete', message: `Cleaned ${cleaned} entities. Residuals: ${residuals.totalResiduals}` });
    await closePool();
    return;
  }

  // ── Build execution plan ─────────────────────────────────────────────────
  let flowsToRun = allFlows;
  if (filterFlows?.length) {
    flowsToRun = flowsToRun.filter((f) => filterFlows.includes(f.flowId));
  }
  if (skipFlows?.length) {
    flowsToRun = flowsToRun.filter((f) => !skipFlows.includes(f.flowId));
  }

  const executionLayers = buildTopologicalOrder(flowsToRun);
  const totalFlows = flowsToRun.length;

  log({ phase: 'plan', status: 'ready', message: `${totalFlows} flows in ${executionLayers.length} layers` });

  // ── --dry-run mode ───────────────────────────────────────────────────────
  if (dryRun) {
    for (const layer of executionLayers) {
      for (const f of layer) {
        log({ phase: 'dry-run', flowId: f.flowId, status: 'planned', message: f.name });
      }
    }
    log({ phase: 'dry-run', status: 'complete', message: `Would execute ${totalFlows} flows` });
    return;
  }

  // ── Live execution ───────────────────────────────────────────────────────
  const sessionManager = new AuthSessionManager(config, entityRegistry);
  const cleanup = new CleanupManager(config, null);
  const results = [];
  const failedFlows = new Set();

  // SIGINT handler — set a flag; finally block will run cleanup
  let sigintReceived = false;
  process.on('SIGINT', () => {
    if (!sigintReceived) {
      sigintReceived = true;
      log({ phase: 'cleanup', status: 'sigint', message: 'SIGINT received — cleanup will run' });
    }
  });

  const reporter = { log: (entry) => log(entry) };

  try {
    // Initialize sessions for all roles
    log({ phase: 'setup', status: 'start', message: 'Initializing role sessions' });
    await sessionManager.initializeAllRoles();
    cleanup.adminCtx = sessionManager.getCtx();

    const ctx = {
      runId,
      testPrefix,
      entities: {},
      sessions: sessionManager.sessions,
      config,
    };

    // Execute layers
    for (const layer of executionLayers) {
      if (sigintReceived) break;

      for (const flowDef of layer) {
        if (sigintReceived) break;

        // Check prerequisites
        const blockedBy = flowDef.prerequisites.find((p) => failedFlows.has(p));
        if (blockedBy) {
          const result = {
            flowId:        flowDef.flowId,
            flowName:      flowDef.name,
            method:        '',
            endpoint:      '',
            statusCode:    0,
            durationMs:    0,
            verdict:       'blocked-prerequisite',
            failureReason: `Prerequisite ${blockedBy} failed or was skipped`,
            dbStateDiff:   [],
          };
          results.push(result);
          log({ phase: 'execution', flowId: flowDef.flowId, status: 'blocked-prerequisite', message: result.failureReason });
          continue;
        }

        log({ phase: 'execution', flowId: flowDef.flowId, status: 'start', message: `Executing: ${flowDef.name}` });

        const result = await executeFlow(flowDef, ctx, entityRegistry, reporter);
        results.push(result);

        if (['failed', 'timeout', 'blocked', 'missing-route'].includes(result.verdict)) {
          failedFlows.add(flowDef.flowId);
        }

        log({
          phase:    'execution',
          flowId:   flowDef.flowId,
          status:   result.verdict,
          message:  `Duration: ${result.durationMs}ms`,
          verdict:  result.verdict,
        });
      }
    }

  } finally {
    // ── Guaranteed cleanup ───────────────────────────────────────────────
    log({ phase: 'cleanup', status: 'start', message: `Cleaning up ${entityRegistry.all().length} tracked entities` });

    const { results: cleanupResults, residuals } = await cleanup.execute(entityRegistry);
    await entityRegistry.persist(entityRegistryPath);
    cleanup.writeResults(runId, artifactsDir);

    const execResultsPath = writeExecutionResults(runId, results, artifactsDir);
    writeCleanupResults(runId, cleanupResults, artifactsDir);

    await closePool();

    const summary = {
      passed:        results.filter((r) => r.verdict === 'passed').length,
      failed:        results.filter((r) => r.verdict === 'failed').length,
      blocked:       results.filter((r) => r.verdict === 'blocked').length,
      missingRoute:  results.filter((r) => r.verdict === 'missing-route').length,
      blockedPrereq: results.filter((r) => r.verdict === 'blocked-prerequisite').length,
      timeout:       results.filter((r) => r.verdict === 'timeout').length,
    };

    const overallStatus = (summary.failed === 0 && summary.blocked === 0) ? 'pass' : 'fail';

    log({
      phase:   'complete',
      status:  overallStatus,
      message: `Passed: ${summary.passed} | Failed: ${summary.failed} | Blocked: ${summary.blocked} | Missing: ${summary.missingRoute} | Residuals: ${residuals.totalResiduals}`,
      summary,
      residuals,
      artifactsDir,
    });

    if (overallStatus === 'fail') {
      process.exitCode = 1;
    }
  }
}

main().catch((err) => {
  log({ phase: 'fatal', status: 'error', message: err.message, stack: err.stack });
  process.exit(1);
});
