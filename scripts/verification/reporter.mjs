/**
 * Reporter / Structured Logger
 *
 * Writes one JSON object per line to stdout (NDJSON format) for easy
 * consumption by log aggregation tools or downstream scripts.
 *
 * Also assembles and writes the execution-results.json and
 * cleanup-results.json artifacts to the run's artifacts directory.
 */

import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// log
// ---------------------------------------------------------------------------

/**
 * Writes a single structured log entry to stdout.
 *
 * Required fields: phase, status, message
 * Optional fields: flowId, durationMs, verdict, etc.
 */
export function log(entry) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    ...entry,
  }));
}

// ---------------------------------------------------------------------------
// writeExecutionResults
// ---------------------------------------------------------------------------

/**
 * Assembles execution-results.json and writes it to artifactsDir.
 *
 * @param {string} runId
 * @param {object[]} results - FlowResult objects
 * @param {string} artifactsDir
 * @returns {string} path to the written file
 */
export function writeExecutionResults(runId, results, artifactsDir) {
  const summary = {
    passed:        results.filter((r) => r.verdict === 'passed').length,
    failed:        results.filter((r) => r.verdict === 'failed').length,
    blocked:       results.filter((r) => r.verdict === 'blocked').length,
    missingRoute:  results.filter((r) => r.verdict === 'missing-route').length,
    blockedPrereq: results.filter((r) => r.verdict === 'blocked-prerequisite').length,
    timeout:       results.filter((r) => r.verdict === 'timeout').length,
  };

  const output = {
    runId,
    runDate: new Date().toISOString(),
    totalFlows: results.length,
    results,
    summary,
  };

  const outputPath = path.join(artifactsDir, 'execution-results.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n', 'utf-8');
  return outputPath;
}

// ---------------------------------------------------------------------------
// writeCleanupResults
// ---------------------------------------------------------------------------

/**
 * Assembles cleanup-results.json and writes it to artifactsDir.
 *
 * @param {string} runId
 * @param {object[]} cleanupResults - CleanupResult objects
 * @param {string} artifactsDir
 * @returns {string} path to the written file
 */
export function writeCleanupResults(runId, cleanupResults, artifactsDir) {
  const cleaned = cleanupResults.filter((r) => r.success).length;
  const failed  = cleanupResults.filter((r) => !r.success).length;

  const output = {
    runId,
    runDate: new Date().toISOString(),
    totalEntities: cleanupResults.length,
    cleanedEntities: cleaned,
    failedCleanups: failed,
    results: cleanupResults,
  };

  const outputPath = path.join(artifactsDir, 'cleanup-results.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n', 'utf-8');
  return outputPath;
}
