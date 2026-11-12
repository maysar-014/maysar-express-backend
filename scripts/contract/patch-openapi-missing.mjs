/**
 * Patches openapi.yaml to add all 111 currently undocumented routes.
 * Uses fs line-based insertion to preserve original file line endings.
 */
import fs from 'fs';

const file = 'openapi.yaml';
const rawContent = fs.readFileSync(file, 'utf-8');

// Detect line ending
const crlf = rawContent.includes('\r\n');
const EOL = crlf ? '\r\n' : '\n';

// Work with normalized lines, then re-apply EOL at end
const lines = rawContent.split(/\r?\n/);

// Helper: safe YAML scalar (quote if contains special chars)
function safe(s) {
  if (s.match(/[:#\[\]{}&*!|>'"%@`,]/)) return `"${s.replace(/"/g, '\\"')}"`;
  return s;
}

// Build a standard route block as an array of lines
function buildRoute(path, operations, opts = {}) {
  const tag = opts.tag || 'API';
  const noAuth = opts.noAuth === true;
  const adminRole = opts.adminAuth === true;

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
    "        '405':",
    "          description: Method Not Allowed",
    "          content:",
    "            application/json:",
    "              schema: {}",
    "            text/plain:",
    "              schema: {}",
    "        '409':",
    "          description: Conflict",
    "          content:",
    "            application/json:",
    "              schema: {}",
    "            text/plain:",
    "              schema: {}",
    "        '422':",
    "          description: Unprocessable Entity",
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
    "        '501':",
    "          description: Not Implemented",
    "          content:",
    "            application/json:",
    "              schema: {}",
    "            text/plain:",
    "              schema: {}",
  ];

  // Extract path parameters
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

  let secLines;
  if (noAuth) {
    secLines = ["      security: []"];
  } else if (adminRole) {
    secLines = ["      security:", "        - BearerAuth: []"];
  } else {
    secLines = ["      security:", "        - BearerAuth: []"];
  }

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

// All missing routes grouped by insertion anchor
const insertions = [
  // ── AUTH routes (before /api/business-registry) ──────────────────────
  {
    beforeLine: '  /api/business-registry:',
    skip: '/api/auth/audit:',
    routes: [
      buildRoute('/api/auth/audit', { get: 'List auth audit log' }, { tag: 'Auth', adminAuth: true }),
      buildRoute('/api/auth/security-events', { get: 'List security events' }, { tag: 'Auth', adminAuth: true }),
      buildRoute('/api/auth/users/search', { get: 'Search users (admin)' }, { tag: 'Auth', adminAuth: true }),
      buildRoute('/api/auth/users/{userId}', { get: 'Get user by ID (admin)' }, { tag: 'Auth', adminAuth: true }),
      buildRoute('/api/auth/users/{userId}/sessions', {
        get: 'List sessions for a user (admin)',
        delete: 'Terminate all sessions for a user (admin)'
      }, { tag: 'Auth', adminAuth: true }),
      buildRoute('/api/auth/users/{userId}/role', { patch: 'Update user role (admin)' }, { tag: 'Auth', adminAuth: true }),
      buildRoute('/api/auth/users/{userId}/status', { patch: 'Update user status (admin)' }, { tag: 'Auth', adminAuth: true }),
      buildRoute('/api/auth/users/{userId}/verify-phone', { patch: 'Verify phone for user (admin)' }, { tag: 'Auth', adminAuth: true }),
      buildRoute('/api/auth/admin/users/{userId}/verify-phone', { patch: 'Admin verify phone for user' }, { tag: 'Auth', adminAuth: true }),
      buildRoute('/api/auth/discovery/refresh', { post: 'Refresh discovery token' }, { tag: 'Auth' }),
    ].flat(),
  },
  // ── CATALOG media upload (before /api/chat/health) ───────────────────
  {
    beforeLine: '  /api/chat/health:',
    skip: '/api/catalog/v1/media/upload:',
    routes: buildRoute('/api/catalog/v1/media/upload', { post: 'Upload product media' }, { tag: 'Catalog' }),
  },
  // ── CHAT admin moderation (before /api/checkout/cart) ─────────────────
  {
    beforeLine: "  '/api/checkout/cart/{cartId}':",
    skip: '/api/chat/v1/admin/moderation/messages:',
    routes: [
      buildRoute('/api/chat/v1/admin/moderation/messages', { get: 'List flagged messages (admin)' }, { tag: 'Chat', adminAuth: true }),
      buildRoute('/api/chat/v1/admin/moderation/messages/{messageId}', { get: 'Get flagged message detail (admin)' }, { tag: 'Chat', adminAuth: true }),
      buildRoute('/api/chat/v1/admin/moderation/messages/{messageId}/review', { post: 'Review flagged message (admin)' }, { tag: 'Chat', adminAuth: true }),
      buildRoute('/api/chat/v1/admin/moderation/patterns', { get: 'List moderation patterns (admin)' }, { tag: 'Chat', adminAuth: true }),
      buildRoute('/api/chat/v1/admin/moderation/patterns/mine', { post: 'Create moderation pattern (admin)' }, { tag: 'Chat', adminAuth: true }),
      buildRoute('/api/chat/v1/admin/moderation/patterns/{id}', { delete: 'Delete moderation pattern (admin)' }, { tag: 'Chat', adminAuth: true }),
      buildRoute('/api/chat/v1/admin/moderation/patterns/{id}/promote', { post: 'Promote moderation pattern (admin)' }, { tag: 'Chat', adminAuth: true }),
      buildRoute('/api/chat/v1/admin/moderation/phrases', {
        get: 'List blocked phrases (admin)',
        post: 'Add blocked phrase (admin)'
      }, { tag: 'Chat', adminAuth: true }),
      buildRoute('/api/chat/v1/admin/moderation/phrases/seed', { post: 'Seed default blocked phrases (admin)' }, { tag: 'Chat', adminAuth: true }),
      buildRoute('/api/chat/v1/admin/moderation/phrases/{id}', {
        get: 'Get blocked phrase (admin)',
        put: 'Update blocked phrase (admin)',
        delete: 'Delete blocked phrase (admin)'
      }, { tag: 'Chat', adminAuth: true }),
    ].flat(),
  },
  // ── CHECKOUT delivery-options (before /api/community/articles) ──────────
  {
    beforeLine: '  /api/community/articles:',
    skip: '/api/checkout/delivery-options:',
    routes: buildRoute('/api/checkout/delivery-options', { post: 'Get delivery options for active cart' }, { tag: 'Checkout' }),
  },
  // ── ENABLER capabilities/enforcement (before /api/inventory) ──────────
  {
    beforeLine: '  /api/inventory/analytics/stock-levels:',
    skip: '/api/enabler/enablers/{enablerId}/capabilities:',
    routes: [
      buildRoute('/api/enabler/enablers/{enablerId}/capabilities', { get: 'Get enabler capabilities' }, { tag: 'Enabler' }),
      buildRoute('/api/enabler/enablers/{enablerId}/enforcement-history', { get: 'Get enabler enforcement history' }, { tag: 'Enabler' }),
      buildRoute('/api/enabler/enablers/{enablerId}/activation', { post: 'Activate enabler' }, { tag: 'Enabler', adminAuth: true }),
      buildRoute('/api/enabler/enablers/{enablerId}/enforcement', { post: 'Record enforcement action for enabler' }, { tag: 'Enabler', adminAuth: true }),
      buildRoute('/api/enabler/enablers/{enablerId}/terms', { post: 'Accept enabler terms' }, { tag: 'Enabler' }),
    ].flat(),
  },
  // ── KYC routes (before /api/kyc/status) ───────────────────────────────
  {
    beforeLine: '  /api/kyc/status:',
    skip: '/api/kyc/health:',
    routes: [
      buildRoute('/api/kyc/health', { get: 'KYC service health' }, { tag: 'KYC', noAuth: true }),
      buildRoute('/api/kyc/health/ready', { get: 'KYC service readiness probe' }, { tag: 'KYC', noAuth: true }),
      buildRoute('/api/kyc/audit-log', { get: 'Get KYC audit log' }, { tag: 'KYC' }),
      buildRoute('/api/kyc/kyc-status/{userId}', { get: 'Get KYC status by user ID (admin)' }, { tag: 'KYC', adminAuth: true }),
      buildRoute('/api/kyc/manual-review/pending', { get: 'List KYC submissions pending manual review' }, { tag: 'KYC', adminAuth: true }),
      buildRoute('/api/kyc/manual-review', { post: 'Submit KYC for manual review' }, { tag: 'KYC' }),
      buildRoute('/api/kyc/admin/pending', { get: 'Admin list pending KYC submissions' }, { tag: 'KYC', adminAuth: true }),
      // Note: /api/kyc/admin/{userId} already exists in spec — skip it
    ].flat(),
  },
  // ── ORDER admin routes (before /api/payment/health) ───────────────────
  {
    beforeLine: '  /api/payment/health:',
    skip: '/api/order/orders/admin/overdue:',
    routes: [
      buildRoute('/api/order/orders/admin/overdue', { get: 'List overdue orders (admin)' }, { tag: 'Orders', adminAuth: true }),
      buildRoute('/api/order/orders/admin/pending-verification', { get: 'List orders pending verification (admin)' }, { tag: 'Orders', adminAuth: true }),
      buildRoute('/api/order/orders/{id}/history', { get: 'Get order status history' }, { tag: 'Orders' }),
      buildRoute('/api/order/orders/{id}/verify', { post: 'Seller verifies stock for order' }, { tag: 'Orders' }),
      buildRoute('/api/order/orders/{id}/decline', { post: 'Seller declines order' }, { tag: 'Orders' }),
      buildRoute('/api/order/orders/{id}/buyer/confirm-checkout', { post: 'Buyer confirms checkout' }, { tag: 'Orders' }),
      buildRoute('/api/order/orders/{id}/admin/approve', { post: 'Admin approves order' }, { tag: 'Orders', adminAuth: true }),
      buildRoute('/api/order/orders/{id}/admin/cancel', { post: 'Admin cancels order' }, { tag: 'Orders', adminAuth: true }),
      buildRoute('/api/order/orders/{id}/admin/override', { post: 'Admin overrides order status' }, { tag: 'Orders', adminAuth: true }),
      buildRoute('/api/order/orders/{id}/admin/review', { post: 'Admin flags order for review' }, { tag: 'Orders', adminAuth: true }),
    ].flat(),
  },
  // ── PAYMENT admin routes (before /api/payout/payouts) ────────────────
  {
    beforeLine: '  /api/payout/payouts:',
    skip: '/api/payment/payment-methods:',
    routes: [
      buildRoute('/api/payment/payment-methods', { get: 'List available payment methods' }, { tag: 'Payment' }),
      buildRoute('/api/payment/admin/payments', { get: 'Admin list all payments' }, { tag: 'Payment', adminAuth: true }),
      buildRoute('/api/payment/admin/payment-methods', { get: 'Admin list payment method configurations' }, { tag: 'Payment', adminAuth: true }),
      buildRoute('/api/payment/payments/{id}/block', { post: 'Admin blocks a payment' }, { tag: 'Payment', adminAuth: true }),
      buildRoute('/api/payment/payments/{id}/flag', { post: 'Admin flags a payment for review' }, { tag: 'Payment', adminAuth: true }),
    ].flat(),
  },
  // ── PAYOUT user route (before /api/payout/system) ────────────────────
  {
    beforeLine: '  /api/payout/system/maintenance/cleanup/outbox:',
    skip: '/api/payout/payouts/user/{userId}:',
    routes: buildRoute('/api/payout/payouts/user/{userId}', { get: 'Get payouts by user ID (admin)' }, { tag: 'Payout', adminAuth: true }),
  },
  // ── REQUEST service (before /api/support/agents) ─────────────────────
  {
    beforeLine: '  /api/support/agents:',
    skip: '/api/request/requests:',
    routes: [
      buildRoute('/api/request', { get: 'List all requests (admin)' }, { tag: 'Request', adminAuth: true }),
      buildRoute('/api/request/analytics', { get: 'Request analytics dashboard' }, { tag: 'Request', adminAuth: true }),
      buildRoute('/api/request/health/live', { get: 'Request service liveness probe' }, { tag: 'Request', noAuth: true }),
      buildRoute('/api/request/health/ready', { get: 'Request service readiness probe' }, { tag: 'Request', noAuth: true }),
      buildRoute('/api/request/requests', {
        get: 'List requests for current user',
        post: 'Create a new request'
      }, { tag: 'Request' }),
      buildRoute('/api/request/requests/assess/{token}', { get: 'Get request assessment by token' }, { tag: 'Request', noAuth: true }),
      buildRoute('/api/request/requests/assess/{token}/convert', { post: 'Convert assessed request to formal request' }, { tag: 'Request', noAuth: true }),
      buildRoute('/api/request/requests/{requestId}', { get: 'Get request by ID' }, { tag: 'Request' }),
      buildRoute('/api/request/requests/{requestId}/cancel', { post: 'Cancel a request' }, { tag: 'Request' }),
      buildRoute('/api/request/requests/{requestId}/messages', {
        get: 'List request messages',
        post: 'Send message on request'
      }, { tag: 'Request' }),
      buildRoute('/api/request/requests/{requestId}/quotes', { get: 'List quotes for request' }, { tag: 'Request' }),
      buildRoute('/api/request/quotes/{quoteId}', { get: 'Get quote by ID' }, { tag: 'Request' }),
      buildRoute('/api/request/quotes/{quoteId}/assessment-link', { post: 'Generate assessment link for quote' }, { tag: 'Request' }),
      buildRoute('/api/request/quotes/{quoteId}/publish', { post: 'Publish quote to requester' }, { tag: 'Request' }),
      buildRoute('/api/request/orders/{orderId}/procurement', { get: 'Get procurement record for order' }, { tag: 'Request' }),
      buildRoute('/api/request/procurement/{procurementId}', { patch: 'Update procurement record' }, { tag: 'Request', adminAuth: true }),
      buildRoute('/api/request/suppliers', {
        get: 'List suppliers',
        post: 'Register as supplier'
      }, { tag: 'Request' }),
      buildRoute('/api/request/suppliers/{supplierId}', { put: 'Update supplier profile' }, { tag: 'Request' }),
      buildRoute('/api/request/suppliers/{supplierId}/invite-ready', { post: 'Mark supplier as invite-ready' }, { tag: 'Request', adminAuth: true }),
      buildRoute('/api/request/suppliers/{supplierId}/invited', { post: 'Mark supplier as invited' }, { tag: 'Request', adminAuth: true }),
      buildRoute('/api/request/items/{itemId}/sources', { post: 'Add source for request item' }, { tag: 'Request' }),
      buildRoute('/api/request/sources/{sourceId}/confirm', { post: 'Confirm a source selection' }, { tag: 'Request' }),
      buildRoute('/api/request/{requestId}', { get: 'Get request (alt path)' }, { tag: 'Request' }),
      buildRoute('/api/request/{requestId}/audit', { get: 'Get request audit trail' }, { tag: 'Request' }),
      buildRoute('/api/request/{requestId}/assessment', { post: 'Submit assessment for request' }, { tag: 'Request' }),
      buildRoute('/api/request/{requestId}/assignment', { post: 'Assign request to supplier' }, { tag: 'Request', adminAuth: true }),
      buildRoute('/api/request/{requestId}/messages', { get: 'Get messages for request (alt path)' }, { tag: 'Request' }),
      buildRoute('/api/request/{requestId}/quotes', { post: 'Submit quote for request' }, { tag: 'Request' }),
    ].flat(),
  },
  // ── TRAINING admin routes (before /api/user) ─────────────────────────
  {
    beforeLine: '  /api/user:',
    skip: '/api/training/api/v1/training/admin/learners:',
    routes: [
      buildRoute('/api/training/api/v1/training/admin/learners', { get: 'Admin list all learners' }, { tag: 'Training', adminAuth: true }),
      buildRoute('/api/training/api/v1/training/admin/learners/{learnerId}', { get: 'Admin get learner details' }, { tag: 'Training', adminAuth: true }),
      buildRoute('/api/training/api/v1/training/admin/learners/{learnerId}/reset', { delete: 'Admin reset learner progress' }, { tag: 'Training', adminAuth: true }),
      buildRoute('/api/training/api/v1/training/admin/modules', {
        get: 'Admin list training modules',
        post: 'Admin create training module'
      }, { tag: 'Training', adminAuth: true }),
      buildRoute('/api/training/api/v1/training/admin/modules/{id}', {
        get: 'Admin get training module',
        put: 'Admin update training module',
        delete: 'Admin delete training module'
      }, { tag: 'Training', adminAuth: true }),
      buildRoute('/api/training/api/v1/training/admin/modules/{id}/content', { patch: 'Admin update module content' }, { tag: 'Training', adminAuth: true }),
      buildRoute('/api/training/api/v1/training/admin/requirements', {
        get: 'Admin list training requirements',
        post: 'Admin create training requirement'
      }, { tag: 'Training', adminAuth: true }),
      buildRoute('/api/training/api/v1/training/admin/requirements/{module}', {
        put: 'Admin update training requirement',
        delete: 'Admin delete training requirement'
      }, { tag: 'Training', adminAuth: true }),
      buildRoute('/api/training/api/v1/training/admin/stats', { get: 'Admin training platform statistics' }, { tag: 'Training', adminAuth: true }),
      buildRoute('/api/training/api/v1/training/admin/complete-for-learner', { post: 'Admin manually complete training for learner' }, { tag: 'Training', adminAuth: true }),
      buildRoute('/api/training/api/v1/training/admin/grant-eligibility/{learnerId}', { post: 'Admin grant training eligibility to learner' }, { tag: 'Training', adminAuth: true }),
    ].flat(),
  },
  // ── USER address delete (before /api/wallet/health) ─────────────────
  {
    beforeLine: '  /api/wallet/health:',
    skip: '/api/user/{id}/addresses/{addressId}:',
    routes: buildRoute('/api/user/{id}/addresses/{addressId}', { delete: 'Delete a user address' }, { tag: 'Users' }),
  },
];

// Apply all insertions
let result = [...lines];
let insertedCount = 0;

for (const { beforeLine, skip, routes } of insertions) {
  // Check if already present (handle both quoted and unquoted forms)
  const skipKey = skip.replace(/^\//, '').replace(/\/$/, '');
  const alreadyPresent = result.some(l => {
    const trimmed = l.trim();
    return trimmed === `${skip}` || trimmed === `'${skipKey}':` || trimmed === `"${skipKey}":`;
  });
  if (alreadyPresent) {
    console.log(`⚠  Already exists: ${skip}`);
    continue;
  }

  // Find insertion point - match exact or with quotes
  let insertAt = result.findIndex(l => {
    const trimmed = l.trimEnd();
    return trimmed === beforeLine || trimmed === beforeLine.trimEnd();
  });

  if (insertAt === -1) {
    console.log(`✗  Could not find exact line: "${beforeLine}"`);
    continue;
  }

  result.splice(insertAt, 0, ...routes, '');
  insertedCount += routes.length;
  console.log(`✓  Inserted ${routes.length} lines before "${beforeLine.trim()}"`);
}

// Write back with original line endings
fs.writeFileSync(file, result.join(EOL), 'utf-8');
console.log(`\nTotal lines inserted: ${insertedCount}`);
console.log(`New file length: ${result.length} lines`);

// Validate
import { execSync } from 'child_process';
try {
  execSync('node -e "const yaml=require(\'js-yaml\');const fs=require(\'fs\');yaml.load(fs.readFileSync(\'openapi.yaml\',\'utf-8\'));console.log(\'YAML valid\')"', { stdio: 'inherit' });
} catch {
  console.error('⚠ YAML validation failed!');
}
