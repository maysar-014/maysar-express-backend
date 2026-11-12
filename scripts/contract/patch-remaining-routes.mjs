/**
 * Adds the remaining 26 undocumented routes to openapi.yaml.
 */
import fs from 'fs';
import { execSync } from 'child_process';

const file = 'openapi.yaml';
const rawContent = fs.readFileSync(file, 'utf-8');
const crlf = rawContent.includes('\r\n');
const EOL = crlf ? '\r\n' : '\n';
const lines = rawContent.split(/\r?\n/);

function safe(s) {
  if (s.match(/[:#\[\]{}&*!|>'"%@`,]/)) return `"${s.replace(/"/g, '\\"')}"`;
  return s;
}

function buildRoute(path, operations, opts = {}) {
  const tag = opts.tag || 'API';
  const noAuth = opts.noAuth === true;

  const stdResponses = [
    "      responses:",
    "        '200':",
    "          description: OK",
    "          content:",
    "            application/json:",
    "              schema: {}",
    "            text/plain:",
    "              schema: {}",
    "        '400':",
    "          description: Validation error",
    "          content:",
    "            application/json:",
    "              schema: {}",
    "            text/plain:",
    "              schema: {}",
    "        '401':",
    "          description: Unauthorized",
    "          content:",
    "            application/json:",
    "              schema: {}",
    "            text/plain:",
    "              schema: {}",
    "        '403':",
    "          description: Forbidden",
    "          content:",
    "            application/json:",
    "              schema: {}",
    "            text/plain:",
    "              schema: {}",
    "        '404':",
    "          description: Not Found",
    "          content:",
    "            application/json:",
    "              schema: {}",
    "            text/plain:",
    "              schema: {}",
    "        '500':",
    "          description: Internal Server Error",
    "          content:",
    "            application/json:",
    "              schema: {}",
    "            text/plain:",
    "              schema: {}",
  ];

  const paramNames = [...path.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
  const paramLines = paramNames.length > 0
    ? ["      parameters:", ...paramNames.flatMap(p => [
        `        - name: ${p}`,
        "          in: path",
        "          required: true",
        "          schema:",
        "            type: string",
      ])]
    : ["      parameters: []"];

  const secLines = noAuth
    ? ["      security: []"]
    : ["      security:", "        - BearerAuth: []"];

  const result = [`  ${path}:`, "    parameters: []"];

  for (const [method, summary] of Object.entries(operations)) {
    result.push(
      `    ${method.toLowerCase()}:`,
      `      tags:`,
      `        - ${tag}`,
      `      summary: ${safe(summary)}`,
      ...stdResponses,
      ...paramLines,
      ...secLines,
    );
  }

  return result;
}

// Build all the remaining routes
const analyticsRoutes = [
  buildRoute('/api/analytics/platform/kpis', { get: 'Platform KPI metrics (admin)' }, { tag: 'Analytics' }),
  buildRoute('/api/analytics/platform/stats', { get: 'Platform statistics (admin)' }, { tag: 'Analytics' }),
].flat();

const catalogGeoRoutes = [
  buildRoute('/api/catalog/seller-locations/geography/regions', { get: 'List delivery regions' }, { tag: 'Catalog', noAuth: true }),
  buildRoute('/api/catalog/seller-locations/geography/districts', { get: 'List delivery districts' }, { tag: 'Catalog', noAuth: true }),
  buildRoute('/api/catalog/seller-locations/geography/wards', { get: 'List delivery wards' }, { tag: 'Catalog', noAuth: true }),
  buildRoute('/api/catalog/seller-locations/geography/streets', { get: 'List delivery streets' }, { tag: 'Catalog', noAuth: true }),
  buildRoute('/api/catalog/seller-locations/geography/validate', { get: 'Validate a delivery address' }, { tag: 'Catalog' }),
  buildRoute('/api/catalog/seller-locations/search', { get: 'Search seller locations' }, { tag: 'Catalog' }),
  buildRoute('/api/catalog/seller-locations/{locationId}/detail', { get: 'Get detailed seller location info' }, { tag: 'Catalog' }),
  buildRoute('/api/catalog/seller-locations/{locationId}/metrics', { get: 'Get seller location fulfillment metrics' }, { tag: 'Catalog' }),
  buildRoute('/api/catalog/seller-locations/{locationId}/report/pdf', { get: 'Download seller location PDF report' }, { tag: 'Catalog' }),
].flat();

const enablerPromoRoutes = [
  buildRoute('/api/enabler/enablers/promotion-offers', { get: 'List active promotion offers' }, { tag: 'Enabler' }),
  buildRoute('/api/enabler/enablers/promotion-offers/{offerId}/apply', { post: 'Apply for a promotion offer' }, { tag: 'Enabler' }),
  buildRoute('/api/enabler/enablers/seller/{sellerId}/promotion-offer', { get: 'Get promotion offer for seller' }, { tag: 'Enabler' }),
  buildRoute('/api/enabler/enablers/seller/{sellerId}/promotion-offer/close', { post: 'Close promotion offer for seller' }, { tag: 'Enabler' }),
  buildRoute('/api/enabler/enablers/seller/{sellerId}/promotion-applications/{applicationId}/decision', { post: 'Record decision on promotion application' }, { tag: 'Enabler' }),
  buildRoute('/api/enabler/enablers/{enablerId}/catalog', { get: 'Get enabler catalog' }, { tag: 'Enabler' }),
  buildRoute('/api/enabler/enablers/{enablerId}/catalog/share-link', { get: 'Get enabler catalog share link' }, { tag: 'Enabler' }),
  buildRoute('/api/enabler/enablers/{enablerId}/products/{productId}/share-link', { get: 'Get share link for enabler product' }, { tag: 'Enabler' }),
  buildRoute('/api/enabler/hub/catalog/{publicCode}', { get: 'Get enabler hub catalog by public code' }, { tag: 'Enabler' }),
].flat();

const inventoryStockOutRoutes = [
  buildRoute('/api/inventory/stock-outs', { get: 'List stock-out events', post: 'Record a stock-out event' }, { tag: 'Inventory' }),
  buildRoute('/api/inventory/stock-outs/reconcile', { post: 'Reconcile stock-out records' }, { tag: 'Inventory' }),
].flat();

const businessRegistryRoutes = [];  // already exists in original spec at line 8892

const userResolveRoutes = [
  buildRoute('/api/user/resolve-names', { post: 'Resolve user display names by IDs' }, { tag: 'Users' }),
].flat();

const enablerPromoRoutesPUT = [
  buildRoute('/api/enabler/enablers/seller/{sellerId}/promotion-offer', { put: 'Update seller promotion offer' }, { tag: 'Enabler' }),
].flat();

// All insertions: [ { beforeLine, skipCheck, routes } ]
const insertions = [
  // ── Analytics platform routes (before /api/business-registry section) ─
  {
    beforeLine: '  /api/business-registry:',
    skipCheck: '/api/analytics/platform/kpis',
    routes: analyticsRoutes,
    label: 'analytics platform routes',
  },
  // ── Catalog geography + seller-location extras ─────────────────────────
  // Insert after the last existing seller-locations route or before /api/chat
  // The last catalog route before chat is around line 27xxx  
  // We'll insert before /api/chat/health which we found earlier at 17967
  // Actually catalog comes before chat - need to find where catalog ends
  {
    beforeLine: '  /api/chat/health:',
    skipCheck: '/api/catalog/seller-locations/geography/regions',
    routes: catalogGeoRoutes,
    label: 'catalog geography routes',
  },
  // ── Enabler promo routes (after enabler terms, before /api/inventory) ──
  {
    beforeLine: '  /api/inventory/analytics/stock-levels:',
    skipCheck: '/api/enabler/enablers/promotion-offers',
    routes: enablerPromoRoutes,
    label: 'enabler promotion GET routes',
  },
  // ── Enabler promotion-offer PUT (needs to be added to existing path block via separate route entry) ──
  {
    beforeLine: "  '/api/enabler/enablers/seller/{sellerId}/promotion-offer/close':",
    skipCheck: "'/api/enabler/enablers/seller/{sellerId}/promotion-offer'",
    routes: enablerPromoRoutesPUT,
    label: 'enabler promotion-offer PUT',
  },
  // ── Inventory stock-out routes ─────────────────────────────────────────
  {
    beforeLine: "  '/api/kyc/admin/{userId}':",
    skipCheck: '/api/inventory/stock-outs',
    routes: inventoryStockOutRoutes,
    label: 'inventory stock-out routes',
  },
  // ── User resolve-names ────────────────────────────────────────────────
  {
    beforeLine: '  /api/wallet/health:',
    skipCheck: '/api/user/resolve-names',
    routes: userResolveRoutes,
    label: 'user resolve-names',
  },
];

let result = [...lines];
let offset = 0;

for (const { beforeLine, beforeLineIdx, skipCheck, routes, label } of insertions) {
  // Skip if routes array is empty
  if (!routes || routes.length === 0) {
    console.log(`⊘  Skipping (no routes): ${label}`);
    continue;
  }

  // Check if already present (handle quoted and unquoted forms)
  const rawCheck = skipCheck.replace(/^['"]/, '').replace(/['"]$/, '');
  const already = result.some(l => {
    const t = l.trim();
    return t === rawCheck + ':' || t === `'${rawCheck}':` || t === `"${rawCheck}":` || t === skipCheck + ':';
  });
  if (already) {
    console.log(`⚠  Already exists: ${label}`);
    continue;
  }

  let insertAt;
  if (beforeLineIdx !== undefined) {
    insertAt = beforeLineIdx - 1 + offset; // 0-indexed
  } else {
    insertAt = result.findIndex(l => l.trimEnd() === beforeLine.trimEnd());
  }

  if (insertAt === -1 || insertAt === undefined) {
    console.log(`✗  Insertion point not found for: ${label}`);
    continue;
  }

  result.splice(insertAt, 0, ...routes, '');
  offset += routes.length + 1;
  console.log(`✓  Inserted ${routes.length} lines for: ${label}`);
}

fs.writeFileSync(file, result.join(EOL), 'utf-8');
console.log(`\nFile now has ${result.length} lines.`);

try {
  execSync(`node -e "const yaml=require('js-yaml');const fs=require('fs');yaml.load(fs.readFileSync('openapi.yaml','utf-8'));console.log('YAML valid')"`, { stdio: 'inherit' });
} catch {
  console.error('YAML validation failed!');
}
