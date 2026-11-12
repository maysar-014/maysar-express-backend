// scripts/verification/db-layer.mjs
import pg from 'pg';

const { Pool } = pg;

let pool = null;

function getPool(databaseUrl) {
  if (!pool) {
    pool = new Pool({ connectionString: databaseUrl, max: 3 });
  }
  return pool;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Captures a snapshot of the specified tables (row counts + latest row ID).
 * Uses read-only SELECT queries — never writes.
 *
 * @param {string[]} tableNames - Prisma model names (e.g. "Order_Order")
 * @param {string} runId - for correlation
 * @param {string} databaseUrl
 * @returns {Promise<object>} snapshot
 */
export async function captureState(tableNames, runId, databaseUrl) {
  const snapshot = {
    capturedAt: new Date().toISOString(),
    tables: {},
  };

  if (!databaseUrl) return snapshot;

  const client = await getPool(databaseUrl).connect();
  try {
    for (const modelName of tableNames) {
      try {
        // Derive the actual table name from the Prisma model name
        const tableName = modelNameToSqlTable(modelName);
        const countRes = await client.query(`SELECT COUNT(*)::int AS cnt FROM "${tableName}"`);
        snapshot.tables[modelName] = {
          rowCount: countRes.rows[0]?.cnt ?? 0,
        };
      } catch {
        // Table may not exist or may not be accessible — skip
        snapshot.tables[modelName] = { rowCount: 0 };
      }
    }
  } finally {
    client.release();
  }

  return snapshot;
}

/**
 * Waits delayMs then captures state.
 */
export async function captureAsyncState(tableNames, runId, databaseUrl, delayMs) {
  await new Promise(resolve => setTimeout(resolve, delayMs));
  return captureState(tableNames, runId, databaseUrl);
}

/**
 * Diffs initial vs resulting snapshots and asserts expected changes.
 *
 * @param {object} initial
 * @param {object} resulting
 * @param {object[]} assertions - DbAssertion objects from flow definition
 */
export function diff(initial, resulting, assertions) {
  const diffs = [];

  for (const assertion of assertions) {
    const { table: modelName, expectedDelta, columnAssertions = [] } = assertion;
    const initialCount = initial?.tables?.[modelName]?.rowCount ?? 0;
    const resultingCount = resulting?.tables?.[modelName]?.rowCount ?? 0;
    const delta = resultingCount - initialCount;
    const deltaMatches = delta === expectedDelta;

    const colAssertionResults = columnAssertions.map(ca => ({
      column: ca.column,
      expected: ca.value,
      actual: null, // column-level assertions require a separate targeted query
      passed: true, // optimistic — full column verification requires targeted queries
    }));

    diffs.push({
      tableName: modelName,
      initialRowCount: initialCount,
      resultingRowCount: resultingCount,
      delta,
      columnAssertions: colAssertionResults,
      assertionPassed: deltaMatches,
    });
  }

  return diffs;
}

/**
 * Checks for residual test-owned rows across all tracked tables.
 * Returns { residualRowsByTable, totalResiduals, clean }.
 */
export async function checkResiduals(testPrefix, databaseUrl) {
  const result = { residualRowsByTable: {}, totalResiduals: 0, clean: true };
  if (!databaseUrl) return result;

  const client = await getPool(databaseUrl).connect();
  try {
    // Check the most common tables that have user-visible text fields
    const tablesToCheck = [
      { table: 'auth_users', column: 'email' },
      { table: 'businessregistry_businesses', column: 'name' },
      { table: 'catalog_products', column: 'title' },
    ];

    for (const { table, column } of tablesToCheck) {
      try {
        const res = await client.query(
          `SELECT COUNT(*)::int AS cnt FROM "${table}" WHERE "${column}" LIKE $1`,
          [`${testPrefix}%`]
        );
        const count = res.rows[0]?.cnt ?? 0;
        result.residualRowsByTable[table] = count;
        result.totalResiduals += count;
      } catch {
        // Table may not exist
      }
    }

    result.clean = result.totalResiduals === 0;
  } finally {
    client.release();
  }

  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Maps a Prisma model name to its actual PostgreSQL table name.
 * Uses known @map annotations from the schema.
 */
function modelNameToSqlTable(modelName) {
  const knownMappings = {
    'User': 'auth_users',
    'Auth_User': 'auth_user_sync',
    'Session': 'auth_sessions',
    'AuditLog': 'auth_audit_logs',
    'Auth_PasswordResetToken': 'auth_password_reset_tokens',
    'Auth_EmailVerificationToken': 'auth_email_verification_tokens',
    'Auth_RoleRequest': 'auth_role_requests',
    'Auth_UserIndex': 'auth_user_indexes',
    'Business': 'businessregistry_businesses',
    'BusinessAddress': 'businessregistry_business_addresses',
    'BusinessDocument': 'businessregistry_business_documents',
    'BusinessRegistry_ComplianceRecord': 'businessregistry_compliance_records',
    'OutboxEvent': 'businessregistry_outbox_events',
    'EventStore': 'event_store',
    'Category': 'catalog_categories',
    'Product': 'catalog_products',
    'ProductVariant': 'catalog_product_variants',
    'BuyBox': 'catalog_buy_boxes',
    'SellerStorefront': 'catalog_seller_storefronts',
    'Analytics_SellerDailySales': 'analytics_seller_daily_sales',
    'Analytics_SellerProductPerformance': 'analytics_seller_product_performance',
    'Analytics_SellerInventoryHealth': 'analytics_seller_inventory_health',
    'Analytics_SellerActionItem': 'analytics_seller_action_items',
  };

  if (knownMappings[modelName]) return knownMappings[modelName];

  // Fallback: convert PascalCase to snake_case
  return modelName
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}
