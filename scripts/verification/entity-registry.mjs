// scripts/verification/entity-registry.mjs
import fs from 'fs';
import path from 'path';

const ENTITY_TYPES = ['users', 'businesses', 'products', 'orders', 'payments', 'payouts', 'tickets', 'conversations', 'kycRecords', 'trainingRecs'];

export class EntityRegistry {
  constructor(runId, testPrefix) {
    this.runId = runId;
    this.testPrefix = testPrefix;  // e.g. "verify-flow-20261015-143022-"
    this.entities = {};
    for (const type of ENTITY_TYPES) {
      this.entities[type] = [];
    }
  }

  // Apply the test prefix to an email address
  prefixEmail(base) {
    return `${this.testPrefix}${base}`;
  }

  // Apply the test prefix to a name
  prefixName(base) {
    return `${this.testPrefix}${base}`;
  }

  // Register a created entity
  register(type, entity) {
    if (!this.entities[type]) {
      this.entities[type] = [];
    }
    this.entities[type].push(entity);
  }

  // Get all entities of a type
  getByType(type) {
    return this.entities[type] || [];
  }

  // Get all entities as a flat array with their type
  all() {
    const result = [];
    for (const [type, items] of Object.entries(this.entities)) {
      for (const item of items) {
        result.push({ type, ...item });
      }
    }
    return result;
  }

  // Persist registry to file
  async persist(outputPath) {
    const dir = path.dirname(outputPath);
    fs.mkdirSync(dir, { recursive: true });
    const data = {
      runId: this.runId,
      testIdentifierPrefix: this.testPrefix,
      entities: this.entities,
    };
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  }

  // Load registry from file
  static load(filePath) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const registry = new EntityRegistry(data.runId, data.testIdentifierPrefix);
    registry.entities = data.entities;
    return registry;
  }
}
