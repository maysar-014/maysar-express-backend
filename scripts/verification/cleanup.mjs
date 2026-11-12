/**
 * Cleanup Manager
 *
 * Deletes test-created entities in reverse-dependency order.
 * Tries API delete first, falls back to direct SQL DELETE, records `leaked`
 * if both fail. Never throws — all errors are recorded in cleanup results.
 */

import fs from 'fs';
import path from 'path';
import { makeRequest } from './http-client.mjs';
import { checkResiduals } from './db-layer.mjs';

// Cleanup order: children first, parents last
const CLEANUP_ORDER = [
  'tickets',       // support tickets
  'conversations', // chat conversations
  'payments',
  'payouts',
  'orders',
  'kycRecords',
  'trainingRecs',
  'products',
  'businesses',
  'users',         // user accounts last
];

// API delete endpoints per entity type
const API_DELETE_ENDPOINTS = {
  users:         (id) => ({ method: 'DELETE', path: `/api/user/users/${id}`,                  authRole: 'Admin' }),
  businesses:    (id) => ({ method: 'DELETE', path: `/api/business-registry/businesses/${id}`, authRole: 'Admin' }),
  products:      (id) => ({ method: 'DELETE', path: `/api/catalog/v1/products/${id}`,          authRole: 'Seller' }),
  orders:        (id) => ({ method: 'DELETE', path: `/api/order/orders/${id}`,                 authRole: 'Admin' }),
  tickets:       (id) => ({ method: 'DELETE', path: `/api/support/tickets/${id}`,              authRole: 'Admin' }),
  payouts:       (id) => ({ method: 'DELETE', path: `/api/payout/payouts/${id}`,               authRole: 'Admin' }),
};

// SQL table fallbacks per entity type
const SQL_DELETE_TABLES = {
  users:         'auth_users',
  businesses:    'businessregistry_businesses',
  products:      'catalog_products',
  orders:        'orders',
  tickets:       'support_tickets',
  payments:      'payments',
  payouts:       'payouts',
  conversations: 'chat_conversations',
  kycRecords:    'kyc_submissions',
  trainingRecs:  'training_completions',
};

export class CleanupManager {
  /**
   * @param {object} config - from loadConfig()
   * @param {object|null} adminCtx - { sessions: {...}, config: {...} } for API deletes
   */
  constructor(config, adminCtx) {
    this.config = config;
    this.adminCtx = adminCtx;
    this.results = [];
  }

  /**
   * Executes cleanup for all entities in the registry.
   * Returns { results, residuals }.
   */
  async execute(entityRegistry) {
    this.results = [];

    for (const entityType of CLEANUP_ORDER) {
      const entities = entityRegistry.getByType(entityType);
      if (!entities.length) continue;

      // Delete in reverse-creation order (most recently created first)
      for (const entity of [...entities].reverse()) {
        await this._deleteEntity(entityType, entity);
      }
    }

    // Verify no residuals remain
    const residuals = await checkResiduals(
      entityRegistry.testPrefix,
      this.config.databaseUrl,
    );

    return { results: this.results, residuals };
  }

  async _deleteEntity(entityType, entity) {
    const id = entity.id;
    if (!id) {
      this.results.push({ entityType, entityId: 'unknown', method: 'leaked', success: false, error: 'No ID on entity' });
      return;
    }

    // 1. Try API delete
    const apiEndpoint = API_DELETE_ENDPOINTS[entityType];
    if (apiEndpoint && this.adminCtx) {
      try {
        await makeRequest(apiEndpoint(id), this.adminCtx);
        this.results.push({ entityType, entityId: id, method: 'api-delete', success: true });
        return;
      } catch {
        // Fall through to SQL delete
      }
    }

    // 2. Try SQL delete
    const tableName = SQL_DELETE_TABLES[entityType];
    if (tableName && this.config.databaseUrl) {
      try {
        const pgModule = await import('pg');
        const { Pool } = pgModule.default ?? pgModule;
        const pool = new Pool({ connectionString: this.config.databaseUrl, max: 1 });
        try {
          await pool.query(`DELETE FROM "${tableName}" WHERE id = $1`, [id]);
          this.results.push({ entityType, entityId: id, method: 'sql-delete', success: true });
        } finally {
          await pool.end();
        }
        return;
      } catch (err) {
        this.results.push({ entityType, entityId: id, method: 'leaked', success: false, error: err.message });
        return;
      }
    }

    this.results.push({ entityType, entityId: id, method: 'leaked', success: false, error: 'No delete mechanism available' });
  }

  /**
   * Writes cleanup-results.json to artifactsDir.
   */
  writeResults(runId, artifactsDir) {
    const outputPath = path.join(artifactsDir, 'cleanup-results.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    const cleaned = this.results.filter((r) => r.success).length;
    const failed  = this.results.filter((r) => !r.success).length;

    const output = {
      runId,
      runDate: new Date().toISOString(),
      totalEntities: this.results.length,
      cleanedEntities: cleaned,
      failedCleanups: failed,
      results: this.results,
    };

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n', 'utf-8');
    return outputPath;
  }
}
