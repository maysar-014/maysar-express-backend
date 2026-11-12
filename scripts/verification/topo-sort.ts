/**
 * Topological Sort Utility
 *
 * Implements Kahn's algorithm for building execution layers from a set of
 * FlowDef objects with prerequisite relationships.
 */

import { FlowDef } from './types';

// ---------------------------------------------------------------------------
// CyclicDependencyError
// ---------------------------------------------------------------------------

export class CyclicDependencyError extends Error {
  public cyclicFlowIds: string[];

  constructor(cyclicFlowIds: string[]) {
    super(
      `Cyclic dependency detected among flows: ${cyclicFlowIds.join(', ')}`,
    );
    this.name = 'CyclicDependencyError';
    this.cyclicFlowIds = cyclicFlowIds;
  }
}

// ---------------------------------------------------------------------------
// buildTopologicalOrder
// ---------------------------------------------------------------------------

/**
 * Builds topological execution layers from a set of FlowDefs.
 *
 * Returns FlowDef[][] — each inner array is a "layer" of flows that have no
 * mutual dependencies and can (in principle) run concurrently. Flows within
 * a layer are sorted alphabetically by flowId for determinism.
 *
 * Throws CyclicDependencyError if the prerequisite graph contains a cycle.
 *
 * Prerequisites that reference non-existent flowIds are silently ignored
 * (treated as already satisfied).
 *
 * @example
 * // Single layer — no prerequisites
 * buildTopologicalOrder([{ flowId: 'FLOW-001', prerequisites: [], ... }])
 * // => [[FLOW-001]]
 *
 * @example
 * // Two layers — FLOW-002 depends on FLOW-001
 * buildTopologicalOrder([
 *   { flowId: 'FLOW-001', prerequisites: [] },
 *   { flowId: 'FLOW-002', prerequisites: ['FLOW-001'] },
 * ])
 * // => [[FLOW-001], [FLOW-002]]
 */
export function buildTopologicalOrder(flows: FlowDef[]): FlowDef[][] {
  if (flows.length === 0) return [];

  // Build flowId → FlowDef lookup map
  const flowMap = new Map<string, FlowDef>();
  for (const flow of flows) {
    flowMap.set(flow.flowId, flow);
  }

  // Compute in-degree: number of prerequisites that exist in flowMap
  const inDegree = new Map<string, number>();

  // dependents[A] = list of flowIds that have A as a direct prerequisite
  const dependents = new Map<string, string[]>();

  // Initialise all flows with in-degree 0
  for (const flow of flows) {
    inDegree.set(flow.flowId, 0);
    dependents.set(flow.flowId, []);
  }

  // Count real (existing) prerequisites and build reverse adjacency list
  for (const flow of flows) {
    for (const prereq of flow.prerequisites) {
      if (!flowMap.has(prereq)) {
        // Prerequisite references a flow not in the current set — ignore it
        continue;
      }
      // Increment this flow's in-degree
      inDegree.set(flow.flowId, (inDegree.get(flow.flowId) ?? 0) + 1);
      // Record that prereq has flow.flowId as a dependent
      dependents.get(prereq)!.push(flow.flowId);
    }
  }

  const layers: FlowDef[][] = [];
  let processedCount = 0;
  const totalFlows = flows.length;

  // Sentinel value used to mark a node as processed
  const PROCESSED = -1;

  while (processedCount < totalFlows) {
    // Collect all flows with in-degree 0, sorted alphabetically by flowId
    const layer = flows
      .filter((f) => (inDegree.get(f.flowId) ?? 0) === 0)
      .sort((a, b) => a.flowId.localeCompare(b.flowId));

    if (layer.length === 0) {
      // No progress possible → cycle exists
      const cyclicIds = flows
        .filter((f) => (inDegree.get(f.flowId) ?? 0) > 0)
        .map((f) => f.flowId)
        .sort();
      throw new CyclicDependencyError(cyclicIds);
    }

    layers.push(layer);

    // Mark all flows in this layer as processed and update their dependents
    for (const flow of layer) {
      inDegree.set(flow.flowId, PROCESSED);
      processedCount++;

      for (const depId of (dependents.get(flow.flowId) ?? [])) {
        const current = inDegree.get(depId) ?? 0;
        if (current !== PROCESSED) {
          inDegree.set(depId, current - 1);
        }
      }
    }
  }

  return layers;
}

// ---------------------------------------------------------------------------
// flattenLayers
// ---------------------------------------------------------------------------

/**
 * Convenience helper — flattens the result of buildTopologicalOrder into a
 * single ordered array. Useful when sequential execution is required.
 */
export function flattenLayers(layers: FlowDef[][]): FlowDef[] {
  return layers.flat();
}
