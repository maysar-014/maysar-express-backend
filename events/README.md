# Maysar Event Catalog & Schema Registry

This module contains the canonical event definitions, schemas, and validation for the Maysar platform.

## 🎯 Purpose

- **Single Source of Truth**: All domain events defined in one place
- **Schema Validation**: Automatic validation of event payloads
- **Version Management**: Support for event schema evolution
- **CI Integration**: Automated validation in build pipeline

## 📁 Structure

```
events/
├── CATALOG.md          # Complete event documentation
├── schemaRegistry.ts   # Schema validation engine
├── types.ts           # TypeScript event definitions
├── validate.ts        # CI validation script
├── index.ts           # Main exports
└── package.json       # Dependencies and scripts
```

## 🚀 Quick Start

### Install Dependencies
```bash
cd events
npm install
```

### Validate Schemas
```bash
npm run validate
```

### Use in Services
```typescript
import { eventSchemaRegistry, EventEnvelope, OrderCreatedPayload } from '@maysar/events';

// Validate event payload
const validation = eventSchemaRegistry.validateEvent(
  'order.created',
  'v1',
  payload
);

if (!validation.valid) {
  throw new Error(`Invalid event: ${validation.errors?.join(', ')}`);
}
```

## 📋 Event Catalog

See [CATALOG.md](./CATALOG.md) for complete event documentation including:

- All domain events with schemas
- Producer/consumer mappings
- Saga flow definitions
- Compatibility matrix

## 🔧 Schema Registry

The schema registry provides:

- **Validation**: Automatic payload validation using JSON Schema
- **Versioning**: Support for multiple schema versions
- **Compatibility**: Breaking change detection
- **Evolution**: Safe schema migration paths

### Key Methods

```typescript
// Validate event payload
eventSchemaRegistry.validateEvent(eventType, version, payload)

// Get supported versions
eventSchemaRegistry.getSupportedVersions(eventType)

// Check compatibility
eventSchemaRegistry.checkCompatibility(eventType, fromVersion, toVersion)
```

## 📝 Event Types

All events follow this envelope structure:

```typescript
interface EventEnvelope<T> {
  eventId: string;           // UUID v4
  eventType: string;         // domain.entity.action.version
  timestamp: string;         // ISO 8601
  correlationId: string;     // UUID v4 - tracks related events
  causationId?: string;      // UUID v4 - event that caused this
  producer: string;          // service name
  version: string;           // schema version
  payload: T;                // event-specific data
}
```

## 🔄 CI/CD Integration

The validation script runs automatically on:
- Push to `events/` directory
- Pull requests affecting event schemas
- Manual trigger via `npm run validate:ci`

### GitHub Actions

```yaml
- name: Validate Event Schemas
  run: |
    cd events
    npm run validate:ci
```

## 📊 Monitoring

Track these metrics:
- Event publishing rate per service
- Event processing latency
- Failed event processing rate
- Schema validation failures

## 🛡️ Best Practices

### Event Design
1. **Immutable**: Events should never change once published
2. **Self-contained**: Include all necessary data in payload
3. **Versioned**: Use semantic versioning for schemas
4. **Idempotent**: Consumers must handle duplicates

### Schema Evolution
1. **Additive changes**: New optional fields (backward compatible)
2. **Breaking changes**: Require new version
3. **Deprecation**: 6-month notice before removal

### Naming Convention
- Event types: `domain.entity.action.version`
- Examples: `order.created.v1`, `payment.succeeded.v1`

## 🔍 Validation Rules

### Required Fields
- `eventId`: UUID v4
- `eventType`: Valid event type pattern
- `timestamp`: ISO 8601 format
- `correlationId`: UUID v4
- `producer`: Service name
- `payload`: Valid according to schema

### Business Rules
- All events must be idempotent
- Critical events (order, payment) have permanent retention
- Personal data must be encrypted
- Audit trail required for compliance

## 🚨 Troubleshooting

### Common Issues

**Schema validation fails**
```bash
npm run validate
# Check error output for specific validation failures
```

**Breaking changes detected**
```bash
# Review compatibility report
# Create new version if breaking change is necessary
```

**CI validation fails**
```bash
# Check GitHub Actions logs
# Fix validation errors before merging
```

## 📈 Next Steps

1. ✅ Event catalog created
2. ✅ Schema registry implemented
3. ✅ CI validation added
4. 🔄 **Next**: Implement outbox pattern
5. 🔄 **Next**: Add idempotency middleware
6. 🔄 **Next**: Create saga implementations

---

**Status**: ✅ COMPLETE - Event Catalog & Schema Registry  
**Next Priority**: Outbox Pattern Implementation