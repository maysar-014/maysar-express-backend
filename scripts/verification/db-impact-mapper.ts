/**
 * Database Impact Mapper
 *
 * Takes implementation traces and maps each Prisma model to its classification
 * (direct / indirect), effect type, causal chain, and async delay metadata.
 *
 * Writes the resulting flow-database-matrix.json artifact.
 */

import fs from 'fs';
import path from 'path';
import { ImplementationTrace, FlowDatabaseImpact, AffectedTable } from './types';

// ---------------------------------------------------------------------------
// Models that are always treated as async / indirect
// ---------------------------------------------------------------------------

const ASYNC_INDIRECT_MODEL_PREFIXES = ['Analytics_', 'Notification_'];

const ALWAYS_INDIRECT_MODELS = new Set([
  // Analytics snapshots populated by event consumers
  'Analytics_SellerMetrics',
  'Analytics_SellerDailySales',
  'Analytics_SellerProductPerformance',
  'Analytics_SellerInventoryHealth',
  'Analytics_SellerActionItem',
  'Analytics_SalesAnalytics',
  'Analytics_SupplierAnalytics',
  'Analytics_CourierAnalytics',
  'Analytics_EnablerAnalytics',
  'Analytics_Metric',
  'Analytics_Event',
  // Notification records created by the notification consumer
  'Notification_InAppNotification',
  'Notification_PushToken',
  'Notification_Preference',
  'Notification_Template',
  'Notification_SmsRecord',
]);

const DEFAULT_ASYNC_DELAY_MS = 2000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts a Prisma model name to its expected snake_case table name.
 * Prisma uses the @map directive to define the actual table name, but as a
 * heuristic we convert PascalCase to snake_case.
 *
 * E.g. "Order_Order" → "orders" (uses only the part after last underscore)
 *      "Auth_EmailVerificationToken" → "auth_email_verification_tokens"
 *      "Analytics_SellerMetrics" → "analytics_seller_metrics"
 */
function prismaModelToTableName(modelName: string): string {
  // Convert PascalCase to snake_case across the whole name, then lowercase
  return modelName
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

/**
 * Returns true if the model should be classified as indirect + async.
 */
function isAlwaysIndirect(modelName: string): boolean {
  if (ALWAYS_INDIRECT_MODELS.has(modelName)) return true;
  for (const prefix of ASYNC_INDIRECT_MODEL_PREFIXES) {
    if (modelName.startsWith(prefix)) return true;
  }
  return false;
}

/**
 * Builds a human-readable causal chain string for a direct model.
 */
function buildDirectCausalChain(
  flowId: string,
  endpoint: string,
  modelName: string,
): string {
  return `${endpoint} → controller → use-case → prisma.${modelName} (direct write)`;
}

/**
 * Builds a human-readable causal chain string for an indirect / async model.
 */
function buildIndirectCausalChain(
  flowId: string,
  endpoint: string,
  modelName: string,
  eventType: string | null,
  consumerFile: string | null,
): string {
  if (eventType && consumerFile) {
    return `${endpoint} → EventBus.publish(${eventType}) → ${consumerFile} → prisma.${modelName} (async indirect write)`;
  }
  if (eventType) {
    return `${endpoint} → EventBus.publish(${eventType}) → downstream consumer → prisma.${modelName} (async indirect write)`;
  }
  return `${endpoint} → event/job → prisma.${modelName} (async indirect write)`;
}

// ---------------------------------------------------------------------------
// mapDatabaseImpact
// ---------------------------------------------------------------------------

/**
 * Takes an array of ImplementationTraces and produces a FlowDatabaseImpact
 * for each trace.
 *
 * Classification rules:
 * - Models in ALWAYS_INDIRECT_MODELS or with ASYNC_INDIRECT prefixes → indirect
 * - Models found directly in controllers/use-cases → direct
 * - Models found only in downstream consumer files → indirect
 *
 * Deduplicates models within a flow. Uses 'insert' as the default effect type
 * (a conservative safe assumption when the specific operation cannot be
 * determined from the trace alone).
 */
export function mapDatabaseImpact(
  traces: ImplementationTrace[],
): FlowDatabaseImpact[] {
  return traces.map((trace) => {
    const tables: AffectedTable[] = [];
    const seenModels = new Set<string>();

    // --- Derive a representative endpoint string for causal chains ---
    const endpointLabel = trace.routeFile
      ? trace.routeFile.split('/').slice(-2).join('/')
      : `flow:${trace.flowId}`;

    // --- Downstream consumer model set ---
    const downstreamModelSet = new Set<string>();
    const downstreamModelToConsumer = new Map<string, { eventType: string; file: string }>();
    for (const consumer of trace.downstreamConsumers) {
      for (const model of consumer.prismaModels) {
        downstreamModelSet.add(model);
        downstreamModelToConsumer.set(model, {
          eventType: consumer.eventType,
          file: consumer.serviceFile,
        });
      }
    }

    // --- Process directly-traced Prisma models ---
    for (const modelName of trace.prismaModels) {
      if (seenModels.has(modelName)) continue;
      seenModels.add(modelName);

      const indirect = isAlwaysIndirect(modelName);
      const tableName = prismaModelToTableName(modelName);

      if (indirect) {
        // Determine the event type that triggers this async write, if known
        const eventType = trace.eventTypes.length > 0 ? trace.eventTypes[0] : null;
        const consumer = downstreamModelToConsumer.get(modelName);

        tables.push({
          prismaModel: modelName,
          tableName,
          effectType: 'insert',
          classification: 'indirect',
          causalChain: buildIndirectCausalChain(
            trace.flowId,
            endpointLabel,
            modelName,
            consumer?.eventType ?? eventType,
            consumer?.file ?? null,
          ),
          asyncDelayMs: DEFAULT_ASYNC_DELAY_MS,
        });
      } else {
        tables.push({
          prismaModel: modelName,
          tableName,
          effectType: 'insert',
          classification: 'direct',
          causalChain: buildDirectCausalChain(
            trace.flowId,
            endpointLabel,
            modelName,
          ),
        });
      }
    }

    // --- Process downstream-consumer models not already in trace.prismaModels ---
    for (const [modelName, consumerInfo] of downstreamModelToConsumer) {
      if (seenModels.has(modelName)) continue;
      seenModels.add(modelName);

      const tableName = prismaModelToTableName(modelName);
      tables.push({
        prismaModel: modelName,
        tableName,
        effectType: 'insert',
        classification: 'indirect',
        causalChain: buildIndirectCausalChain(
          trace.flowId,
          endpointLabel,
          modelName,
          consumerInfo.eventType,
          consumerInfo.file,
        ),
        asyncDelayMs: DEFAULT_ASYNC_DELAY_MS,
      });
    }

    return {
      flowId: trace.flowId,
      tables,
    };
  });
}

// ---------------------------------------------------------------------------
// writeFlowDatabaseMatrix
// ---------------------------------------------------------------------------

/**
 * Writes the FlowDatabaseImpact array to outputPath as pretty-printed JSON
 * (2-space indent), creating directories as needed.
 */
export function writeFlowDatabaseMatrix(
  impacts: FlowDatabaseImpact[],
  outputPath: string,
): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, JSON.stringify(impacts, null, 2) + '\n', 'utf-8');
}

// ---------------------------------------------------------------------------
// buildCrossFlowCoverageMatrix
// ---------------------------------------------------------------------------

/**
 * Builds a deduplicated cross-flow coverage matrix from all impacts.
 *
 * Returns a map of Prisma model name → coverage info for use in the
 * audit report's Cross-Flow Database Coverage Matrix section.
 */
export interface ModelCoverageInfo {
  prismaModel: string;
  tableName: string;
  directFlows: string[];    // flowIds that directly affect this model
  indirectFlows: string[];  // flowIds that indirectly affect this model
  totalFlowCount: number;
  coverageGap: boolean;     // true if no flow touches this model
}

export function buildCrossFlowCoverageMatrix(
  impacts: FlowDatabaseImpact[],
  allPrismaModels: string[],
): ModelCoverageInfo[] {
  const coverageMap = new Map<string, ModelCoverageInfo>();

  // Initialise all models with empty coverage
  for (const modelName of allPrismaModels) {
    coverageMap.set(modelName, {
      prismaModel: modelName,
      tableName: prismaModelToTableName(modelName),
      directFlows: [],
      indirectFlows: [],
      totalFlowCount: 0,
      coverageGap: true,
    });
  }

  // Populate from impacts
  for (const impact of impacts) {
    for (const table of impact.tables) {
      const info = coverageMap.get(table.prismaModel);
      if (!info) continue; // model not in schema — skip

      if (table.classification === 'direct') {
        if (!info.directFlows.includes(impact.flowId)) {
          info.directFlows.push(impact.flowId);
        }
      } else {
        if (!info.indirectFlows.includes(impact.flowId)) {
          info.indirectFlows.push(impact.flowId);
        }
      }

      info.totalFlowCount = info.directFlows.length + info.indirectFlows.length;
      info.coverageGap = info.totalFlowCount === 0;
    }
  }

  // Recompute coverageGap after all impacts processed
  for (const info of coverageMap.values()) {
    info.totalFlowCount = info.directFlows.length + info.indirectFlows.length;
    info.coverageGap = info.totalFlowCount === 0;
  }

  return Array.from(coverageMap.values());
}
