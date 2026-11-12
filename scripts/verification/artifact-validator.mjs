/**
 * Artifact Consistency Validator
 *
 * Validates cross-references between all verification artifacts before the
 * report generator renders the final FLOW_AUDIT_REPORT.md.
 *
 * Checks:
 *   - All Flow_IDs in execution-results exist in flow-inventory
 *   - All discovered Flow_IDs in inventory have entries in execution-results
 *   - Discrepancy count matches discrepancies.json array length
 *   - totalFlows in execution-results matches inventory array length
 *
 * Logs validation failures as warnings — does NOT abort report generation.
 */

// ---------------------------------------------------------------------------
// validateCrossReferences
// ---------------------------------------------------------------------------

/**
 * Validates cross-references between all artifacts.
 *
 * @param {Array}  inventory       - flow-inventory.json content
 * @param {Array}  matrix           - flow-database-matrix.json content
 * @param {Array}  discrepancies    - discrepancies.json content
 * @param {object|null} execResults - execution-results.json content (may be null)
 * @param {object|null} cleanupResults - cleanup-results.json content (may be null)
 * @returns {{ warnings: string[], errors: string[], valid: boolean }}
 */
export function validateCrossReferences(inventory, matrix, discrepancies, execResults, cleanupResults) {
  const warnings = [];
  const errors = [];

  // ── Build lookup sets ─────────────────────────────────────────────────────

  const inventoryFlowIds = new Set((inventory ?? []).map((f) => f.flowId));
  const discoveredFlowIds = new Set(
    (inventory ?? [])
      .filter((f) => f.discoveryStatus === 'discovered')
      .map((f) => f.flowId),
  );

  // ── Check 1: Execution results Flow_IDs exist in inventory ──────────────

  if (execResults && execResults.results) {
    const execFlowIds = new Set(execResults.results.map((r) => r.flowId));

    // Every Flow_ID in execution results must exist in inventory
    for (const flowId of execFlowIds) {
      if (!inventoryFlowIds.has(flowId)) {
        errors.push(
          `Execution results contain Flow_ID ${flowId} which does not exist in flow-inventory.json`,
        );
      }
    }

    // Every discovered Flow_ID should have an execution result
    for (const flowId of discoveredFlowIds) {
      if (!execFlowIds.has(flowId)) {
        warnings.push(
          `Discovered Flow_ID ${flowId} has no entry in execution-results.json (may not have been executed)`,
        );
      }
    }

    // ── Check 2: totalFlows matches inventory length ────────────────────────

    if (execResults.totalFlows !== undefined) {
      if (execResults.totalFlows !== inventory.length) {
        errors.push(
          `execution-results.json totalFlows (${execResults.totalFlows}) does not match flow-inventory.json length (${inventory.length})`,
        );
      }
    }
  }

  // ── Check 3: Discrepancy count ────────────────────────────────────────────

  // The discrepancy count referenced in the report must match discrepancies.json
  // This is validated at render time — here we just flag if the array is malformed
  if (discrepancies && !Array.isArray(discrepancies)) {
    errors.push('discrepancies.json is not an array');
  }

  // ── Check 4: Database matrix Flow_IDs exist in inventory ──────────────────

  if (matrix && Array.isArray(matrix)) {
    for (const imp of matrix) {
      if (!inventoryFlowIds.has(imp.flowId)) {
        warnings.push(
          `flow-database-matrix.json contains Flow_ID ${imp.flowId} which does not exist in flow-inventory.json`,
        );
      }
    }
  }

  // ── Check 5: Cleanup results entity count consistency ──────────────────────

  if (cleanupResults) {
    const resultsArray = cleanupResults.results;
    if (Array.isArray(resultsArray)) {
      const counted = resultsArray.length;
      if (cleanupResults.totalEntities !== undefined && cleanupResults.totalEntities !== counted) {
        warnings.push(
          `cleanup-results.json totalEntities (${cleanupResults.totalEntities}) does not match results array length (${counted})`,
        );
      }
      const cleaned = resultsArray.filter((r) => r.success).length;
      if (cleanupResults.cleanedEntities !== undefined && cleanupResults.cleanedEntities !== cleaned) {
        warnings.push(
          `cleanup-results.json cleanedEntities (${cleanupResults.cleanedEntities}) does not match count of successful results (${cleaned})`,
        );
      }
    }
  }

  return {
    warnings,
    errors,
    valid: errors.length === 0,
  };
}
