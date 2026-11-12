/**
 * Flow Execution Engine
 *
 * Executes a single FlowDef against the live application. Handles:
 *   - Step-by-step HTTP execution via http-client
 *   - Dynamic path/body evaluation
 *   - Entity extraction and registration
 *   - Idempotent step double-execution
 *   - DB state capture before + after (synchronous and async assertions)
 *   - Typed error → verdict mapping
 */

import { makeRequest, FlowTimeoutError, RouteNotFoundError, ServerError } from './http-client.mjs';
import { captureState, captureAsyncState, diff } from './db-layer.mjs';

// ---------------------------------------------------------------------------
// executeFlow
// ---------------------------------------------------------------------------

/**
 * Executes all steps in a FlowDef and returns a FlowResult.
 * Never throws — all errors are caught and mapped to a verdict.
 *
 * @param {object} flowDef       - FlowDef from flows/index.mjs
 * @param {object} ctx           - FlowContext: { runId, testPrefix, entities, sessions, config }
 * @param {object} entityRegistry - EntityRegistry instance for tracking created entities
 * @param {object} reporter      - { log(entry) } structured logger
 * @returns {Promise<object>} FlowResult
 */
export async function executeFlow(flowDef, ctx, entityRegistry, reporter) {
  const { config } = ctx;
  const startTime = Date.now();

  let verdict = 'passed';
  let failureReason = null;
  let statusCode = 0;
  let endpointCalled = '';
  const dbStateDiff = [];

  // Determine which tables need snapshots
  const directTables  = flowDef.dbAssertions.map((a) => a.table);
  const asyncTables   = flowDef.asyncAssertions.map((a) => a.table);
  const allTables     = [...new Set([...directTables, ...asyncTables])];

  // Capture initial DB state
  let initialState = null;
  if (allTables.length > 0 && config.databaseUrl) {
    try {
      initialState = await captureState(allTables, ctx.runId, config.databaseUrl);
    } catch {
      reporter.log({
        phase: 'execution',
        flowId: flowDef.flowId,
        status: 'warn',
        message: 'Initial DB state capture failed — DB assertions will be skipped',
      });
    }
  }

  try {
    // ── Execute flow steps ───────────────────────────────────────────────

    for (const step of flowDef.steps) {
      // Evaluate dynamic values
      const resolvedPath    = typeof step.path === 'function'    ? step.path(ctx)    : step.path;
      const resolvedBody    = step.body   ? step.body(ctx)    : undefined;
      const resolvedHeaders = typeof step.headers === 'function' ? step.headers(ctx) : (step.headers ?? {});

      // Skip condition
      if (step.skipIf?.(ctx)) {
        reporter.log({
          phase: 'execution',
          flowId: flowDef.flowId,
          status: 'skip',
          message: `Skipping step: ${step.name}`,
        });
        continue;
      }

      endpointCalled = `${step.method} ${resolvedPath}`;

      const res = await makeRequest({
        method:         step.method,
        path:           resolvedPath,
        authRole:       step.authRole,
        body:           resolvedBody,
        headers:        resolvedHeaders,
        idempotencyKey: step.idempotencyKey,
      }, ctx);

      statusCode = res.status;

      // Validate expected status
      const expectedStatuses = Array.isArray(step.expectedStatus)
        ? step.expectedStatus
        : [step.expectedStatus];

      if (!expectedStatuses.includes(res.status)) {
        throw new Error(
          `Step "${step.name}": expected status ${expectedStatuses.join('/')}, got ${res.status}. ` +
          `Body: ${JSON.stringify(res.data)}`
        );
      }

      // Extract entities and register them
      if (step.extractEntities) {
        const extracted = step.extractEntities(res, ctx);
        Object.assign(ctx.entities, extracted);
        for (const [key, value] of Object.entries(extracted)) {
          if (typeof value === 'string') {
            const entityType = inferEntityType(key);
            if (entityType) {
              entityRegistry.register(entityType, { id: value });
            }
          }
        }
      }

      // Idempotent step check — execute twice, verify same result
      if (flowDef.idempotentSteps?.includes(step.name)) {
        const res2 = await makeRequest({
          method:         step.method,
          path:           resolvedPath,
          authRole:       step.authRole,
          body:           resolvedBody,
          headers:        resolvedHeaders,
          idempotencyKey: step.idempotencyKey,
        }, ctx);

        if (res2.status !== res.status) {
          throw new Error(
            `Idempotency check failed for step "${step.name}": ` +
            `first=${res.status}, second=${res2.status}`
          );
        }
      }
    }

    // ── Synchronous DB assertions ────────────────────────────────────────

    if (initialState && directTables.length > 0) {
      try {
        const resultingState = await captureState(directTables, ctx.runId, config.databaseUrl);
        const diffs = diff(initialState, resultingState, flowDef.dbAssertions);
        dbStateDiff.push(...diffs);

        const failedDiffs = diffs.filter((d) => !d.assertionPassed);
        if (failedDiffs.length > 0) {
          verdict = 'failed';
          failureReason =
            'DB assertion failed: ' +
            failedDiffs.map((d) => {
              const expected = flowDef.dbAssertions.find((a) => a.table === d.tableName)?.expectedDelta;
              return `${d.tableName} delta=${d.delta} expected=${expected}`;
            }).join(', ');
        }
      } catch {
        reporter.log({
          phase: 'execution',
          flowId: flowDef.flowId,
          status: 'warn',
          message: 'Synchronous DB diff capture failed',
        });
      }
    }

    // ── Async DB assertions ──────────────────────────────────────────────

    if (initialState && asyncTables.length > 0 && config.asyncDelayMs > 0) {
      try {
        const asyncState = await captureAsyncState(
          asyncTables,
          ctx.runId,
          config.databaseUrl,
          config.asyncDelayMs,
        );
        const asyncDiffs = diff(initialState, asyncState, flowDef.asyncAssertions);
        dbStateDiff.push(...asyncDiffs);

        const failedAsync = asyncDiffs.filter((d) => !d.assertionPassed);
        if (failedAsync.length > 0) {
          if (verdict === 'passed') verdict = 'failed';
          const asyncReason = 'Async DB assertion failed: ' +
            failedAsync.map((d) => d.tableName).join(', ');
          failureReason = failureReason
            ? `${failureReason}; ${asyncReason}`
            : asyncReason;
        }
      } catch {
        // Don't fail on async verification errors
      }
    }

  } catch (err) {
    // ── Error → verdict mapping ──────────────────────────────────────────
    if (err instanceof FlowTimeoutError) {
      verdict = 'timeout';
    } else if (err instanceof RouteNotFoundError) {
      verdict = 'missing-route';
    } else if (err instanceof ServerError) {
      verdict = 'blocked';
    } else {
      verdict = 'failed';
    }
    failureReason = err.message;
    if (err.status) statusCode = err.status;
  }

  const durationMs = Date.now() - startTime;
  const parts = endpointCalled.split(' ');

  return {
    flowId:        flowDef.flowId,
    flowName:      flowDef.name,
    method:        parts[0] || flowDef.steps[0]?.method || 'UNKNOWN',
    endpoint:      parts[1] || (typeof flowDef.steps[0]?.path === 'string' ? flowDef.steps[0].path : ''),
    statusCode,
    durationMs,
    verdict,
    failureReason,
    dbStateDiff,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Infers the entity type for auto-registration from a context key name.
 */
function inferEntityType(key) {
  const k = key.toLowerCase();
  if (k === 'userid' || k.endsWith('userid'))       return 'users';
  if (k === 'businessid' || k.endsWith('businessid')) return 'businesses';
  if (k === 'productid' || k.endsWith('productid'))  return 'products';
  if (k === 'orderid' || k.endsWith('orderid'))      return 'orders';
  if (k === 'paymentid' || k.endsWith('paymentid'))  return 'payments';
  if (k === 'payoutid' || k.endsWith('payoutid'))    return 'payouts';
  if (k === 'ticketid' || k.endsWith('ticketid'))    return 'tickets';
  if (k === 'conversationid' || k.endsWith('conversationid')) return 'conversations';
  return null;
}
