/**
 * Flow Definitions Index
 *
 * Central registry of all FlowDef objects for the verification runner.
 * Individual flow files are added as they are implemented (Task 12 sub-items).
 *
 * Each FlowDef describes:
 *   - flowId: stable FLOW-NNN identifier matching discovery output
 *   - name: human-readable flow name
 *   - service: owning service category
 *   - role: primary actor role
 *   - prerequisites: flowIds that must succeed before this one
 *   - steps: HTTP operations to execute (in order)
 *   - dbAssertions: expected database state changes (synchronous)
 *   - asyncAssertions: expected downstream state changes (after async delay)
 *
 * To add a new flow:
 *   1. Create a file in the appropriate subdirectory, e.g. flows/auth/register.mjs
 *   2. Export a FlowDef object with the correct flowId from discovery output
 *   3. Import and spread into allFlows below
 */

// ---------------------------------------------------------------------------
// Placeholder — flow files are added incrementally in Task 12 sub-items
// ---------------------------------------------------------------------------

// Example import pattern (uncomment as flow files are added):
// import { authRegisterBuyerFlow } from './auth/register.mjs';
// import { catalogBrowseFlow } from './catalog/browse.mjs';

/**
 * All registered flow definitions.
 * Populated incrementally as individual flow files are implemented.
 */
export const allFlows = [
  // Flow definitions will be added here as Task 12 sub-items are implemented
];

/**
 * Builds a prerequisite dependency graph from an array of FlowDef objects.
 *
 * @param {Array} flows - array of FlowDef objects
 * @returns {Map<string, string[]>} flowId → array of prerequisite flowIds
 */
export function buildDependencyGraph(flows) {
  const graph = new Map();
  for (const flow of flows) {
    graph.set(flow.flowId, flow.prerequisites ?? []);
  }
  return graph;
}
