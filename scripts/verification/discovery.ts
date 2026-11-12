import fs from 'fs';
import path from 'path';
import { FlowDefinition, EndpointRef } from './types';

// ---------------------------------------------------------------------------
// Known roles for extraction
// ---------------------------------------------------------------------------
const KNOWN_ROLES = [
  'Buyer',
  'Seller',
  'Courier',
  'Enabler',
  'Supplier',
  'Admin',
  'Support Agent',
  'Compliance Officer',
  'Platform Operator',
];

// ---------------------------------------------------------------------------
// Category directories to scan (in priority order)
// ---------------------------------------------------------------------------
const CATEGORY_DIRS = [
  'analytics',
  'auth',
  'business-registry',
  'catalog',
  'chat',
  'checkout',
  'commission',
  'community',
  'enabler',
  'inventory',
  'kyc',
  'logistics',
  'maps',
  'notification',
  'order',
  'payment',
  'payout',
  'production',
  'request',
  'support',
  'training',
  'user',
  'wallet',
  'role-overviews',
];

// ---------------------------------------------------------------------------
// extractEndpoints
// ---------------------------------------------------------------------------

/**
 * Extracts all `METHOD /api/...` patterns from markdown content.
 * Returns a deduplicated array of {method, path} objects.
 */
export function extractEndpoints(content: string): EndpointRef[] {
  const regex = /(GET|POST|PUT|PATCH|DELETE)\s+(\/api\/[^\s`\)\]]+)/gi;
  const seen = new Set<string>();
  const results: EndpointRef[] = [];

  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const method = match[1].toUpperCase() as EndpointRef['method'];
    const rawPath = match[2];
    // Strip trailing punctuation that might be markdown artifacts
    const endpointPath = rawPath.replace(/[.,;:'"]+$/, '');
    const key = `${method}:${endpointPath}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push({ method, path: endpointPath });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// extractRoles
// ---------------------------------------------------------------------------

/**
 * Extracts role names found in the content.
 * Returns only roles from the known role list that appear in the content.
 */
export function extractRoles(content: string): string[] {
  const found: string[] = [];
  for (const role of KNOWN_ROLES) {
    if (content.includes(role)) {
      found.push(role);
    }
  }
  return found;
}

// ---------------------------------------------------------------------------
// extractServices
// ---------------------------------------------------------------------------

/**
 * Extracts all `*-service` references from the content.
 * Returns a deduplicated array of service names.
 */
export function extractServices(content: string): string[] {
  const regex = /\b(\w+-service)\b/gi;
  const seen = new Set<string>();
  const results: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const serviceName = match[1].toLowerCase();
    if (!seen.has(serviceName)) {
      seen.add(serviceName);
      results.push(serviceName);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// extractFlowTitle
// ---------------------------------------------------------------------------

/**
 * Extracts the primary title from a markdown file.
 * Tries: first H1, then first H2, then falls back to filename without extension.
 */
export function extractFlowTitle(content: string, filename: string): string {
  // Try first H1
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }

  // Try first H2
  const h2Match = content.match(/^##\s+(.+)$/m);
  if (h2Match) {
    return h2Match[1].trim();
  }

  // Fall back to filename without extension
  return path.basename(filename, path.extname(filename));
}

// ---------------------------------------------------------------------------
// readDefectRegister
// ---------------------------------------------------------------------------

/**
 * Parses `docs/FLOWS/_verification/defect-register.md` and returns a Map of
 * endpoint/service pattern strings → DEF-NNN IDs.
 * Reads lines that start with `| DEF-` and extracts the DEF ID.
 * If the file doesn't exist, returns an empty Map.
 */
export function readDefectRegister(verificationDir: string): Map<string, string> {
  const defectMap = new Map<string, string>();
  const defectFilePath = path.join(verificationDir, 'defect-register.md');

  if (!fs.existsSync(defectFilePath)) {
    return defectMap;
  }

  const content = fs.readFileSync(defectFilePath, 'utf-8');
  const lines = content.split('\n');

  for (const line of lines) {
    // Match lines starting with `| **DEF-NNN**` or `| DEF-NNN`
    const defMatch = line.match(/^\|\s*\*{0,2}(DEF-\d+)\*{0,2}\s*\|/);
    if (!defMatch) continue;

    const defId = defMatch[1];

    // Extract the "Affected Endpoint(s)" column (4th column, index 3)
    // Table format: | Defect ID | Severity | Service | Affected Endpoint(s) | Status | ...
    const columns = line.split('|').map((c) => c.trim());
    // columns[0] is empty (before first |), columns[1] is Defect ID, columns[2] Severity,
    // columns[3] Service, columns[4] Affected Endpoint(s)
    if (columns.length >= 5) {
      const endpointCol = columns[4]; // Affected Endpoint(s)
      // Extract all /api/... paths from the endpoint column
      const pathMatches = endpointCol.matchAll(/\/api\/[^\s`,\)\]`]+/g);
      for (const pathMatch of pathMatches) {
        const endpointPath = pathMatch[0].replace(/[.,;:'"]+$/, '');
        defectMap.set(endpointPath, defId);
      }

      // Also extract METHOD /api/... patterns
      const methodPathMatches = endpointCol.matchAll(/(GET|POST|PUT|PATCH|DELETE)\s+(\/api\/[^\s`,\)\]`]+)/gi);
      for (const mp of methodPathMatches) {
        const endpointPath = mp[2].replace(/[.,;:'"]+$/, '');
        defectMap.set(endpointPath, defId);
      }
    }
  }

  return defectMap;
}

// ---------------------------------------------------------------------------
// discoverFlows
// ---------------------------------------------------------------------------

/**
 * Main discovery function. Scans category directories under `flowsDir`,
 * parses each markdown file, assigns stable FLOW_IDs, and integrates the
 * defect register.
 */
export function discoverFlows(
  flowsDir: string,
  defectMap?: Map<string, string>
): FlowDefinition[] {
  // Step 1: Collect all files to process with their sort keys
  const filesToProcess: Array<{ sortKey: string; category: string; filePath: string; filename: string }> = [];

  for (const category of CATEGORY_DIRS) {
    const categoryDir = path.join(flowsDir, category);

    if (!fs.existsSync(categoryDir)) {
      continue;
    }

    if (category === 'role-overviews') {
      // role-overviews has .md files directly in the directory (no user-flow/ subdirectory)
      let mdFiles: string[];
      try {
        mdFiles = fs.readdirSync(categoryDir)
          .filter((f) => f.endsWith('.md') && f !== '.gitkeep');
      } catch {
        mdFiles = [];
      }

      for (const filename of mdFiles) {
        const filePath = path.join(categoryDir, filename);
        const sortKey = `${category}/${filename}`.toLowerCase();
        filesToProcess.push({ sortKey, category, filePath, filename });
      }
    } else {
      // Standard categories: look for user-flow/*.md
      const userFlowDir = path.join(categoryDir, 'user-flow');

      if (fs.existsSync(userFlowDir)) {
        let mdFiles: string[];
        try {
          mdFiles = fs.readdirSync(userFlowDir)
            .filter((f) => f.endsWith('.md') && f !== '.gitkeep');
        } catch {
          mdFiles = [];
        }

        for (const filename of mdFiles) {
          const filePath = path.join(userFlowDir, filename);
          const sortKey = `${category}/${filename}`.toLowerCase();
          filesToProcess.push({ sortKey, category, filePath, filename });
        }
      }
    }
  }

  // Step 2: Sort all collected files alphabetically by sortKey for stable ID assignment
  filesToProcess.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  // Step 3: Track which categories had files found
  const categoriesWithFiles = new Set<string>();

  // Step 4: Parse each file and build flow definitions
  const flows: FlowDefinition[] = [];
  let idCounter = 1;

  for (const { category, filePath, filename } of filesToProcess) {
    const flowId = `FLOW-${String(idCounter).padStart(3, '0')}`;
    idCounter++;

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const docPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');

      const title = extractFlowTitle(content, filename);
      const endpoints = extractEndpoints(content);
      const roles = extractRoles(content);
      const servicesTouched = extractServices(content);

      // Derive the service name from category (e.g. "order" → "order")
      const service = category === 'role-overviews'
        ? 'role-overviews'
        : category;

      // Check defect map for matching endpoint paths
      const priorDefectIds: string[] = [];
      if (defectMap && defectMap.size > 0) {
        for (const endpoint of endpoints) {
          // Check if any defect pattern matches this endpoint path
          for (const [pattern, defId] of defectMap) {
            if (endpoint.path.includes(pattern) || pattern.includes(endpoint.path)) {
              if (!priorDefectIds.includes(defId)) {
                priorDefectIds.push(defId);
              }
            }
          }
          // Also try direct path match
          if (defectMap.has(endpoint.path)) {
            const defId = defectMap.get(endpoint.path)!;
            if (!priorDefectIds.includes(defId)) {
              priorDefectIds.push(defId);
            }
          }
        }
      }

      const flow: FlowDefinition = {
        flowId,
        service,
        roles,
        docPath,
        title,
        endpoints,
        servicesTouched,
        discoveryStatus: 'discovered',
        ...(priorDefectIds.length > 0 ? { priorDefectIds } : {}),
      };

      flows.push(flow);
      categoriesWithFiles.add(category);
    } catch (err) {
      // On parse error, create an error entry
      const docPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
      flows.push({
        flowId,
        service: category === 'role-overviews' ? 'role-overviews' : category,
        roles: [],
        docPath,
        title: filename,
        endpoints: [],
        servicesTouched: [],
        discoveryStatus: 'parse-error',
      });
      categoriesWithFiles.add(category);
    }
  }

  // Step 5: For each category that had no files, add a placeholder entry
  for (const category of CATEGORY_DIRS) {
    if (!categoriesWithFiles.has(category)) {
      const categoryDir = path.join(flowsDir, category);
      if (!fs.existsSync(categoryDir)) {
        continue;
      }

      const flowId = `FLOW-${String(idCounter).padStart(3, '0')}`;
      idCounter++;

      const docPath = path.relative(process.cwd(), categoryDir).replace(/\\/g, '/');
      flows.push({
        flowId,
        service: category === 'role-overviews' ? 'role-overviews' : category,
        roles: [],
        docPath,
        title: `${category} (no flows found)`,
        endpoints: [],
        servicesTouched: [],
        discoveryStatus: 'no-flows-found',
      });
    }
  }

  return flows;
}

// ---------------------------------------------------------------------------
// writeFlowInventory
// ---------------------------------------------------------------------------

/**
 * Writes the array of FlowDefinitions to outputPath as pretty-printed JSON
 * (2-space indent).
 */
export function writeFlowInventory(flows: FlowDefinition[], outputPath: string): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, JSON.stringify(flows, null, 2) + '\n', 'utf-8');
}
