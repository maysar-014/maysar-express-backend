/**
 * Implementation Tracer
 *
 * Does static file-system analysis only — no runtime imports, no dynamic
 * code execution. Traces documented flows through the codebase by reading
 * and pattern-matching source files.
 */

import fs from 'fs';
import path from 'path';
import {
  FlowDefinition,
  ImplementationTrace,
  TraceDiscrepancy,
  DiscrepancyRecord,
  DownstreamConsumer,
} from './types';

// ---------------------------------------------------------------------------
// resolveModuleMountPath
// ---------------------------------------------------------------------------

/**
 * Converts a service module name to its Express mount prefix.
 * Convention: /api/ + module name minus `-service` suffix.
 *
 * Examples:
 *   order-service            → /api/order
 *   catalog-service          → /api/catalog
 *   business-registry-service → /api/business-registry
 *   kyc-service              → /api/kyc
 */
export function resolveModuleMountPath(moduleName: string): string {
  const base = moduleName.replace(/-service$/, '');
  return `/api/${base}`;
}

// ---------------------------------------------------------------------------
// extractPrismaModels
// ---------------------------------------------------------------------------

/**
 * Reads the Prisma schema file and returns all model names.
 */
export function extractPrismaModels(schemaPath: string): string[] {
  if (!fs.existsSync(schemaPath)) return [];
  try {
    const content = fs.readFileSync(schemaPath, 'utf-8');
    const regex = /^model\s+(\w+)\s*\{/gm;
    const models: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      models.push(match[1]);
    }
    return models;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// findRouteFiles
// ---------------------------------------------------------------------------

/**
 * Returns the paths of all .ts files under {serviceDir}/src/api/routes/.
 * Returns [] if the directory does not exist.
 */
export function findRouteFiles(serviceDir: string): string[] {
  const routesDir = path.join(serviceDir, 'src', 'api', 'routes');
  const results: string[] = [];

  if (fs.existsSync(routesDir)) {
    try {
      for (const f of fs.readdirSync(routesDir)) {
        if (f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.endsWith('.spec.ts')) {
          results.push(path.join(routesDir, f));
        }
      }
    } catch {
      // skip
    }
  }

  // Also check the service's index.ts for inline route definitions
  // (some services like inventory-service define routes directly in index.ts)
  const indexFile = path.join(serviceDir, 'index.ts');
  if (fs.existsSync(indexFile)) {
    results.push(indexFile);
  }

  // Also check the service app.ts
  const appFile = path.join(serviceDir, 'src', 'app.ts');
  if (fs.existsSync(appFile)) {
    results.push(appFile);
  }

  return results;
}

// ---------------------------------------------------------------------------
// searchFileForPattern
// ---------------------------------------------------------------------------

/**
 * Reads a file and returns all matches of a regex pattern.
 * Returns [] on any error.
 */
export function searchFileForPattern(
  filePath: string,
  pattern: RegExp,
): RegExpMatchArray[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const matches: RegExpMatchArray[] = [];
    // Use matchAll for global regexes, or a single match otherwise
    if (pattern.flags.includes('g')) {
      const globalPattern = new RegExp(pattern.source, pattern.flags);
      let m: RegExpExecArray | null;
      while ((m = globalPattern.exec(content)) !== null) {
        matches.push(m);
      }
    } else {
      const m = content.match(pattern);
      if (m) matches.push(m);
    }
    return matches;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// deriveServiceName
// ---------------------------------------------------------------------------

/**
 * Derives the service directory name from an API endpoint path.
 *
 * Strategy: strip the leading /api/ prefix, take the first path segment,
 * and append -service. Handle known aliases.
 */
function deriveServiceName(endpointPath: string): string {
  // /api/catalog/v1/... → catalog → catalog-service
  // /api/business-registry/... → business-registry → business-registry-service
  // /api/order/... → order → order-service
  const stripped = endpointPath.replace(/^\/api\//, '');
  const firstSegment = stripped.split('/')[0];
  return `${firstSegment}-service`;
}

// ---------------------------------------------------------------------------
// findControllerFiles
// ---------------------------------------------------------------------------

function findControllerFiles(serviceDir: string): string[] {
  const ctrlDir = path.join(serviceDir, 'src', 'api', 'controllers');
  if (!fs.existsSync(ctrlDir)) return [];
  try {
    const results: string[] = [];
    const entries = fs.readdirSync(ctrlDir);
    for (const entry of entries) {
      const full = path.join(ctrlDir, entry);
      try {
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          const sub = fs.readdirSync(full)
            .filter((f) => f.endsWith('.ts'))
            .map((f) => path.join(full, f));
          results.push(...sub);
        } else if (entry.endsWith('.ts')) {
          results.push(full);
        }
      } catch {
        // skip
      }
    }
    return results;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// traceFlow
// ---------------------------------------------------------------------------

/**
 * Traces a single flow through the codebase using static analysis.
 *
 * For each endpoint in the flow:
 *   1. Derives the target service from the endpoint path
 *   2. Finds route files and searches for the path pattern
 *   3. Extracts controller method name from route registrations
 *   4. Searches controller files for Prisma model usage and event publishing
 *
 * Never throws — all errors produce discrepancies in the returned trace.
 */
export function traceFlow(
  flow: FlowDefinition,
  servicesRoot: string,
  prismaSchemaPath: string,
): ImplementationTrace {
  const allPrismaModels = extractPrismaModels(prismaSchemaPath);
  const allPrismaModelSet = new Set(allPrismaModels);

  const trace: ImplementationTrace = {
    flowId: flow.flowId,
    routeFile: '',
    controllerFile: '',
    controllerMethod: '',
    useCaseFile: '',
    prismaModels: [],
    eventTypes: [],
    backgroundJobs: [],
    downstreamConsumers: [],
    discrepancies: [],
  };

  const foundPrismaModels = new Set<string>();
  const foundEventTypes = new Set<string>();
  const foundJobs = new Set<string>();
  const downstreamConsumers: DownstreamConsumer[] = [];

  for (const endpoint of flow.endpoints) {
    try {
      // Skip template placeholder endpoints — these are generic documentation patterns,
      // not real endpoint paths (e.g. /api/{service}/system/maintenance/cleanup/outbox)
      if (endpoint.path.includes('{service}') || endpoint.path.includes('{module}')) {
        continue;
      }

      const serviceName = deriveServiceName(endpoint.path);
      const serviceDir = path.join(servicesRoot, serviceName);

      // Check service directory exists
      if (!fs.existsSync(serviceDir)) {
        // Some service names like kyc-service may be middleware only
        const isKnownMiddlewareOnly = serviceName === 'kyc-service';
        if (!isKnownMiddlewareOnly) {
          trace.discrepancies.push({
            type: 'service-not-found',
            description: `Service directory not found: ${serviceDir} (for endpoint ${endpoint.method} ${endpoint.path})`,
            affectedEndpoints: [`${endpoint.method} ${endpoint.path}`],
            severity: 'high',
          });
        }
        continue;
      }

      // Find route files
      const routeFiles = findRouteFiles(serviceDir);

      if (routeFiles.length === 0) {
        // May be middleware-only service
        const isKnownNoRoutes = serviceName === 'kyc-service';
        if (!isKnownNoRoutes) {
          trace.discrepancies.push({
            type: 'route-not-found',
            description: `No route files found in ${path.join(serviceDir, 'src', 'api', 'routes')} (for endpoint ${endpoint.method} ${endpoint.path})`,
            affectedEndpoints: [`${endpoint.method} ${endpoint.path}`],
            severity: 'medium',
          });
        }
        continue;
      }

      // Derive the path suffix (after /api/{service-base}/)
      const mountPath = resolveModuleMountPath(serviceName);
      // The service may sub-mount routes under an additional path segment.
      // E.g. payout-service mounts at /api/payout then sub-mounts at /payouts.
      // The route file registers paths relative to that sub-mount.
      // Strategy: strip the /api/{service} prefix, then try matching both the
      // full remaining suffix and just the last segment(s).
      const pathSuffix = endpoint.path.startsWith(mountPath)
        ? endpoint.path.slice(mountPath.length)
        : endpoint.path;

      // Also derive a "relative suffix" that strips any sub-mount path segment
      // e.g. /payouts → /, /payouts/:id → /:id, /payouts/:id/cancel → /:id/cancel
      const suffixSegments = pathSuffix.split('/').filter(Boolean);
      const relativeSuffix = suffixSegments.length <= 1
        ? '/'
        : '/' + suffixSegments.slice(1).join('/');
      // Also try the last 1-2 segments as a fallback for deeply nested paths
      const lastSegment = suffixSegments.length > 0 ? '/' + suffixSegments[suffixSegments.length - 1] : '/';
      const lastTwoSegments = suffixSegments.length > 1 ? '/' + suffixSegments.slice(-2).join('/') : lastSegment;

      let routeMatched = false;
      let controllerMethodName = '';

      for (const routeFile of routeFiles) {
        try {
          const content = fs.readFileSync(routeFile, 'utf-8');

          // Build candidate patterns to search for in route registrations
          // Express route registrations look like: router.post('/', ...) or router.get('/:id', ...)
          const candidates = [
            pathSuffix,
            relativeSuffix,
            lastSegment,
            lastTwoSegments,
            endpoint.path,
            mountPath,
          ].filter(Boolean);

          let matched = false;

          // Try regex matching for router.METHOD('path', ...)
          for (const candidate of candidates) {
            if (!candidate || candidate === '') continue;
            // Convert {param} to :param for matching
            const normalized = candidate.replace(/\{(\w+)\}/g, ':$1');
            // Build a regex that matches router.method('normalized', ...) or just contains the path
            const escapedPath = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:\w+/g, '[^/]+').replace(/\//g, '\\/');
            const pathRegex = new RegExp(
              `router\\.${endpoint.method.toLowerCase()}\\s*\\(\\s*['"\`]${escapedPath.replace(/\\\\\//g, '/')}['"\`]`,
              'i',
            );
            if (pathRegex.test(content)) {
              matched = true;
              break;
            }
            // Also try simple contains check (case-insensitive)
            if (content.toLowerCase().includes(normalized.toLowerCase()) && normalized.length > 1) {
              matched = true;
              break;
            }
          }

          // If no candidate matched, try looking for any router.method() registration
          // that could serve this endpoint — at minimum the HTTP method should match
          if (!matched) {
            const anyMethodPattern = new RegExp(
              `router\\.${endpoint.method.toLowerCase()}\\s*\\(`,
              'i',
            );
            if (anyMethodPattern.test(content)) {
              // Found a matching method — accept as route match
              matched = true;
            }
          }

          if (!matched) {
            continue;
          }

          routeMatched = true;
          if (!trace.routeFile) trace.routeFile = path.relative(process.cwd(), routeFile).replace(/\\/g, '/');

          // Extract controller method name
          // Pattern: router.get('/path', ...middleware, controller.methodName)
          // or: router.get('/path', ...middleware, methodName)
          const handlerPattern =
            /router\.\w+\s*\([^)]+,\s*(?:\w+\.)*(\w+)\s*\)/g;
          let hMatch: RegExpExecArray | null;
          while ((hMatch = handlerPattern.exec(content)) !== null) {
            const candidate = hMatch[1];
            // Exclude common middleware names
            if (!['auth', 'validate', 'middleware', 'next', 'req', 'res'].includes(candidate)) {
              controllerMethodName = candidate;
              break;
            }
          }
        } catch {
          // skip unreadable files
        }
      }

      if (!routeMatched && flow.endpoints.length > 0) {
        trace.discrepancies.push({
          type: 'route-not-found',
          description: `No route file contains path pattern for ${endpoint.method} ${endpoint.path} in service ${serviceName}`,
          affectedEndpoints: [`${endpoint.method} ${endpoint.path}`],
          severity: 'medium',
        });
      }

      if (controllerMethodName && !trace.controllerMethod) {
        trace.controllerMethod = controllerMethodName;
      }

      // Search controller files for Prisma models and events
      const controllerFiles = findControllerFiles(serviceDir);

      for (const ctrlFile of controllerFiles) {
        try {
          const content = fs.readFileSync(ctrlFile, 'utf-8');

          // Skip unrelated controller files (basic relevance check)
          const isRelevant =
            !controllerMethodName ||
            content.includes(controllerMethodName) ||
            ctrlFile.toLowerCase().includes(flow.service.toLowerCase());

          if (!isRelevant) continue;

          if (!trace.controllerFile) {
            trace.controllerFile = path.relative(process.cwd(), ctrlFile).replace(/\\/g, '/');
          }

          // Extract Prisma model usages
          const prismaPattern =
            /prisma\.(\w+)\.(create|update|delete|findMany|findFirst|findUnique|upsert|deleteMany|updateMany|count)\b/g;
          let pm: RegExpExecArray | null;
          while ((pm = prismaPattern.exec(content)) !== null) {
            const modelName = pm[1];
            if (allPrismaModelSet.has(modelName)) {
              foundPrismaModels.add(modelName);
            }
          }

          // Extract EventBus.publish calls
          const eventPattern =
            /(?:EventBus|eventBus|this\.eventBus|eventBus\.publish)\s*\.\s*publish\s*\(\s*['"`]([^'"`]+)['"`]/g;
          let ep: RegExpExecArray | null;
          while ((ep = eventPattern.exec(content)) !== null) {
            foundEventTypes.add(ep[1]);
          }

          // Extract background job patterns
          const jobPatterns = [
            /@Cron\(/g,
            /new CronJob\(/g,
            /schedule\s*\(/g,
            /setInterval\s*\(/g,
          ];
          for (const jp of jobPatterns) {
            const jpm = new RegExp(jp.source, 'g');
            if (jpm.test(content)) {
              foundJobs.add(path.basename(ctrlFile, '.ts'));
            }
          }
        } catch {
          // skip
        }
      }

      // Also search service/use-case layer for Prisma models (one level deep only)
      const useCaseDir = path.join(serviceDir, 'src', 'application');
      if (fs.existsSync(useCaseDir)) {
        try {
          // Collect .ts files one level deep to avoid slow recursive traversal
          const ucCandidates: string[] = [];
          const topEntries = fs.readdirSync(useCaseDir);
          for (const entry of topEntries) {
            const full = path.join(useCaseDir, entry);
            try {
              const stat = fs.statSync(full);
              if (stat.isFile() && entry.endsWith('.ts')) {
                ucCandidates.push(full);
              } else if (stat.isDirectory()) {
                const subEntries = fs.readdirSync(full);
                for (const sub of subEntries) {
                  if (sub.endsWith('.ts')) {
                    ucCandidates.push(path.join(full, sub));
                  }
                }
              }
            } catch {
              // skip
            }
          }

          for (const fullPath of ucCandidates) {
            try {
              const content = fs.readFileSync(fullPath, 'utf-8');

              const prismaPattern =
                /prisma\.(\w+)\.(create|update|delete|findMany|findFirst|findUnique|upsert|deleteMany|updateMany|count)\b/g;
              let pm: RegExpExecArray | null;
              while ((pm = prismaPattern.exec(content)) !== null) {
                const modelName = pm[1];
                if (allPrismaModelSet.has(modelName)) {
                  foundPrismaModels.add(modelName);
                }
              }

              const eventPattern =
                /(?:EventBus|eventBus|this\.eventBus|eventBus\.publish)\s*\.\s*publish\s*\(\s*['"`]([^'"`]+)['"`]/g;
              let ep: RegExpExecArray | null;
              while ((ep = eventPattern.exec(content)) !== null) {
                foundEventTypes.add(ep[1]);
              }

              if (!trace.useCaseFile && content.includes('UseCase')) {
                trace.useCaseFile = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');
              }
            } catch {
              // skip
            }
          }
        } catch {
          // skip
        }
      }

      // Search for downstream consumers — limit to known subscriber/handler dirs only
      if (foundEventTypes.size > 0) {
        try {
          const allServiceDirs = fs.readdirSync(servicesRoot)
            .filter((d) => d !== serviceName && d.endsWith('-service'))
            .slice(0, 10) // cap at 10 other services to prevent timeout
            .map((d) => path.join(servicesRoot, d));

          for (const otherDir of allServiceDirs) {
            // Only look in infrastructure/events or application/event-handlers — not whole service
            const subscriberDirs = [
              path.join(otherDir, 'src', 'infrastructure', 'events'),
              path.join(otherDir, 'src', 'application', 'event-handlers'),
              path.join(otherDir, 'src', 'application', 'subscribers'),
            ];

            for (const subscriberDir of subscriberDirs) {
              if (!fs.existsSync(subscriberDir)) continue;
              try {
                const subFiles = fs.readdirSync(subscriberDir)
                  .filter((f) => f.endsWith('.ts'))
                  .map((f) => path.join(subscriberDir, f));

                for (const subFile of subFiles) {
                  try {
                    const content = fs.readFileSync(subFile, 'utf-8');
                    for (const eventType of foundEventTypes) {
                      if (content.includes(eventType)) {
                        const consumerModels: string[] = [];
                        const prismaPattern =
                          /prisma\.(\w+)\.(create|update|upsert|deleteMany|updateMany)\b/g;
                        let pm: RegExpExecArray | null;
                        while ((pm = prismaPattern.exec(content)) !== null) {
                          if (allPrismaModelSet.has(pm[1])) {
                            consumerModels.push(pm[1]);
                          }
                        }

                        const relativePath = path.relative(process.cwd(), subFile).replace(/\\/g, '/');
                        downstreamConsumers.push({
                          eventType,
                          serviceFile: relativePath,
                          handlerMethod: path.basename(subFile, '.ts'),
                          prismaModels: [...new Set(consumerModels)],
                        });
                        break; // one consumer per file per event type
                      }
                    }
                  } catch {
                    // skip
                  }
                }
              } catch {
                // skip
              }
            }
          }
        } catch {
          // skip
        }
      }
    } catch {
      // Per-endpoint error — skip and continue
    }
  }

  trace.prismaModels = [...foundPrismaModels];
  trace.eventTypes = [...foundEventTypes];
  trace.backgroundJobs = [...foundJobs];
  trace.downstreamConsumers = downstreamConsumers;

  return trace;
}

// ---------------------------------------------------------------------------
// classifyDiscrepancies
// ---------------------------------------------------------------------------

/**
 * Returns trace.discrepancies enriched with priorDefectId where the affected
 * endpoint matches a key in defectMap.
 */
export function classifyDiscrepancies(
  trace: ImplementationTrace,
  defectMap: Map<string, string>,
): TraceDiscrepancy[] {
  return trace.discrepancies.map((disc) => {
    const enriched: TraceDiscrepancy = { ...disc };
    for (const endpoint of disc.affectedEndpoints) {
      for (const [pattern, defId] of defectMap) {
        if (endpoint.includes(pattern) || pattern.includes(endpoint)) {
          enriched.priorDefectId = defId;
          break;
        }
      }
      if (defectMap.has(endpoint)) {
        enriched.priorDefectId = defectMap.get(endpoint)!;
      }
    }
    return enriched;
  });
}

// ---------------------------------------------------------------------------
// convertToDiscrepancyRecords
// ---------------------------------------------------------------------------

/**
 * Converts TraceDiscrepancy[] to DiscrepancyRecord[], assigning DISC-NNN IDs.
 * Callers must set `flowId` on each record after calling this function.
 */
export function convertToDiscrepancyRecords(
  discrepancies: TraceDiscrepancy[],
  startIndex = 1,
): DiscrepancyRecord[] {
  return discrepancies.map((disc, i) => ({
    discrepancyId: `DISC-${String(startIndex + i).padStart(3, '0')}`,
    flowId: '', // caller must fill this in
    type: disc.type,
    severity: disc.severity,
    description: disc.description,
    endpoints: disc.affectedEndpoints,
    tables: [],
    recommendedResolution: 'See description for details',
    resolutionStatus: 'open',
    ...(disc.priorDefectId ? { priorDefectId: disc.priorDefectId } : {}),
  }));
}

// ---------------------------------------------------------------------------
// writeDiscrepancies
// ---------------------------------------------------------------------------

/**
 * Writes an array of DiscrepancyRecord objects as pretty-printed JSON
 * (2-space indent) to outputPath, creating directories as needed.
 */
export function writeDiscrepancies(
  records: DiscrepancyRecord[],
  outputPath: string,
): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, JSON.stringify(records, null, 2) + '\n', 'utf-8');
}
