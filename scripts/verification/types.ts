// =============================================================================
// Shared TypeScript interfaces for the Comprehensive Flow Verification Framework
// =============================================================================

// ---------------------------------------------------------------------------
// Flow Discovery interfaces
// ---------------------------------------------------------------------------

export interface EndpointRef {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
}

export interface FlowDefinition {
  flowId: string;               // FLOW-001, FLOW-002, ...
  service: string;              // e.g. "order"
  roles: string[];              // e.g. ["Buyer", "Seller"]
  docPath: string;              // relative path to source .md
  title: string;
  endpoints: EndpointRef[];
  servicesTouched: string[];    // e.g. ["order-service", "wallet-service"]
  discoveryStatus: 'discovered' | 'no-flows-found' | 'parse-error';
  priorDefectIds?: string[];    // e.g. ["DEF-001"] from defect-register
}

// ---------------------------------------------------------------------------
// Implementation Tracer interfaces
// ---------------------------------------------------------------------------

export interface DownstreamConsumer {
  eventType: string;
  serviceFile: string;
  handlerMethod: string;
  prismaModels: string[];
}

export interface TraceDiscrepancy {
  type: 'route-not-found' | 'service-not-found' | 'contract-mismatch' |
        'documentation-outdated' | 'behavior-divergence' | 'missing-event' | 'missing-job';
  description: string;
  affectedEndpoints: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  priorDefectId?: string;
}

export interface ImplementationTrace {
  flowId: string;
  routeFile: string;
  controllerFile: string;
  controllerMethod: string;
  useCaseFile: string;
  prismaModels: string[];
  eventTypes: string[];
  backgroundJobs: string[];
  downstreamConsumers: DownstreamConsumer[];
  discrepancies: TraceDiscrepancy[];
}

// ---------------------------------------------------------------------------
// Database Impact interfaces
// ---------------------------------------------------------------------------

export interface AffectedTable {
  prismaModel: string;
  tableName: string;
  effectType: 'insert' | 'update' | 'delete' | 'soft-delete';
  classification: 'direct' | 'indirect';
  causalChain: string;
  asyncDelayMs?: number;
}

export interface FlowDatabaseImpact {
  flowId: string;
  tables: AffectedTable[];
}

// ---------------------------------------------------------------------------
// Test Runner interfaces
// ---------------------------------------------------------------------------

export interface DbAssertion {
  table: string;
  expectedDelta: number;
  columnAssertions?: Array<{ column: string; value: unknown }>;
  fkAssertions?: Array<{ column: string; referencedTable: string }>;
  delayMs?: number;
}

export interface StateTransition {
  entityType: string;
  entityIdRef: string;
  fromStatus: string;
  toStatus: string;
  triggerStep: string;
  invalidTransitions?: Array<{ fromStatus: string; expectedStatus: 422 | 400 | 409 }>;
}

export interface AuthSession {
  role: string;
  userId: string;
  jwt: string;
  expiresAt: Date;
  csrfToken?: string;
}

export interface FlowContext {
  runId: string;
  testPrefix: string;
  entities: Record<string, unknown>;
  sessions: Record<string, AuthSession>;
}

export interface FlowStep {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string | ((ctx: FlowContext) => string);
  authRole: string;
  headers?: Record<string, string> | ((ctx: FlowContext) => Record<string, string>);
  body?: (ctx: FlowContext) => unknown;
  expectedStatus: number | number[];
  extractEntities?: (res: unknown, ctx: FlowContext) => Record<string, unknown>;
  skipIf?: (ctx: FlowContext) => boolean;
}

export interface FlowDef {
  flowId: string;
  name: string;
  service: string;
  role: string;
  prerequisites: string[];
  steps: FlowStep[];
  dbAssertions: DbAssertion[];
  asyncAssertions: DbAssertion[];
  idempotentSteps?: string[];
  stateTransitions?: StateTransition[];
}

// ---------------------------------------------------------------------------
// Result interfaces
// ---------------------------------------------------------------------------

export interface DbColumnAssertion {
  column: string;
  expected: unknown;
  actual: unknown;
  passed: boolean;
}

export interface DbStateDiff {
  tableName: string;
  initialRowCount: number;
  resultingRowCount: number;
  delta: number;
  columnAssertions: DbColumnAssertion[];
  assertionPassed: boolean;
}

export type FlowVerdict =
  | 'passed'
  | 'failed'
  | 'blocked'
  | 'missing-route'
  | 'blocked-prerequisite'
  | 'timeout';

export interface FlowResult {
  flowId: string;
  flowName: string;
  method: string;
  endpoint: string;
  statusCode: number;
  durationMs: number;
  verdict: FlowVerdict;
  failureReason?: string;
  dbStateDiff: DbStateDiff[];
}

// ---------------------------------------------------------------------------
// Cleanup interfaces
// ---------------------------------------------------------------------------

export type CleanupMethod = 'api-delete' | 'sql-delete' | 'leaked';

export interface CleanupResult {
  entityType: string;
  entityId: string;
  method: CleanupMethod;
  success: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Discrepancy interfaces (for JSON artifacts)
// ---------------------------------------------------------------------------

export type DiscrepancyType =
  | 'route-not-found'
  | 'service-not-found'
  | 'contract-mismatch'
  | 'database-mismatch'
  | 'documentation-outdated'
  | 'behavior-divergence'
  | 'missing-event'
  | 'missing-job';

export type ResolutionStatus =
  | 'open'
  | 'doc-corrected'
  | 'code-fixed'
  | 'no-action-needed'
  | 'wont-fix';

export interface DiscrepancyRecord {
  discrepancyId: string;  // DISC-001, DISC-002, ...
  flowId: string;
  type: DiscrepancyType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  endpoints: string[];
  tables: string[];
  recommendedResolution: string;
  resolutionStatus: ResolutionStatus;
  priorDefectId?: string;
}

// ---------------------------------------------------------------------------
// Snapshot interfaces (used by db-layer)
// ---------------------------------------------------------------------------

export interface TableSnapshot {
  rowCount: number;
  lastRowId?: string;
  specificRows?: Record<string, unknown>[];
}

export interface DbSnapshot {
  capturedAt: string;
  tables: Record<string, TableSnapshot>;
}

// ---------------------------------------------------------------------------
// Entity registry types
// ---------------------------------------------------------------------------

export type EntityType =
  | 'users'
  | 'businesses'
  | 'products'
  | 'orders'
  | 'payments'
  | 'payouts'
  | 'tickets'
  | 'conversations'
  | 'kycRecords'
  | 'trainingRecs';

export interface TrackedEntity {
  id: string;
  type: EntityType;
  metadata: Record<string, unknown>;
}
