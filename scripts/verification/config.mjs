// scripts/verification/config.mjs
import fs from 'fs';
import path from 'path';

const WORKSPACE_ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');

function generateRunId() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function parseCliArgs() {
  const args = process.argv.slice(2);
  const result = {
    dryRun: false,
    cleanupOnly: null,   // run-id string or null
    flows: null,         // array of flow IDs or null (means all)
    skipFlows: [],
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') result.dryRun = true;
    else if (args[i] === '--cleanup-only' && args[i+1]) { result.cleanupOnly = args[++i]; }
    else if (args[i] === '--flows' && args[i+1]) {
      result.flows = args[++i].split(',').map(s => s.trim()).filter(Boolean);
    }
    else if (args[i] === '--skip-flows' && args[i+1]) {
      result.skipFlows = args[++i].split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return result;
}

export function loadConfig() {
  const cli = parseCliArgs();

  // Required env vars (only when not dry-run and not cleanup-only)
  const runId = process.env.RUN_ID || generateRunId();
  const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  const asyncDelayMs = parseInt(process.env.ASYNC_DELAY_MS || '2000', 10);
  const flowTimeoutMs = parseInt(process.env.FLOW_TIMEOUT_MS || '30000', 10);
  const databaseUrl = process.env.DATABASE_URL;

  // Validate required env vars for live execution
  if (!cli.dryRun && !databaseUrl) {
    console.error('[config] ERROR: DATABASE_URL environment variable is required for live execution.');
    console.error('[config] Set DATABASE_URL or use --dry-run flag.');
    process.exit(1);
  }

  // Create run-specific artifacts directory
  const artifactsDir = path.join(WORKSPACE_ROOT, 'artifacts', 'verification', runId);
  if (!cli.dryRun) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  return {
    runId,
    apiBaseUrl,
    databaseUrl: databaseUrl || '',
    asyncDelayMs,
    flowTimeoutMs,
    artifactsDir,
    workspaceRoot: WORKSPACE_ROOT,
    dryRun: cli.dryRun,
    cleanupOnly: cli.cleanupOnly,
    flows: cli.flows,
    skipFlows: cli.skipFlows,
    testPrefix: `verify-flow-${runId}-`,
  };
}
