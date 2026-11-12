/**
 * Maysar Engineering — OpenAPI Ratchet
 * 
 * Governing Document: Maysar Engineering Constitution v1.0
 *   - Article 5: Preservation Supremacy — Existing API consumers and integrations
 *     shall remain compatible unless an approved migration provides otherwise
 *   - Article 23: Regression Prevention — Contract tests
 * 
 * This script enforces an OpenAPI ratchet: once a field or endpoint is published,
 * it cannot be removed without a major version bump. This prevents breaking changes
 * to API consumers (mobile apps, partner integrations, etc.).
 * 
 * Usage:
 *   node scripts/contract/ratchet.js
 * 
 * Exits with code 1 if breaking changes are detected.
 * Exits with code 0 if no breaking changes.
 */

const fs = require('fs');
const path = require('path');

const PREVIOUS_SCHEMA = path.join(process.cwd(), 'openapi.previous.yaml');
const CURRENT_SCHEMA = path.join(process.cwd(), 'openapi.yaml');

function loadYaml(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Simple YAML parser for our use case - just parse top-level keys and paths
  // In production, use a proper YAML parser like js-yaml
  try {
    return require('js-yaml').load(content);
  } catch (e) {
    console.error(`Failed to parse ${filePath}: ${e.message}`);
    return null;
  }
}

function findBreakingChanges(previous, current) {
  const breakingChanges = [];
  
  if (!previous || !current) {
    console.log('No previous schema to compare - creating baseline');
    return breakingChanges;
  }
  
  // Check for removed top-level paths
  const prevPaths = previous.paths || {};
  const currPaths = current.paths || {};
  
  const removedPaths = Object.keys(prevPaths).filter(p => !currPaths[p]);
  removedPaths.forEach(p => {
    breakingChanges.push({
      type: 'REMOVED_ENDPOINT',
      path: p,
      message: `Endpoint ${p} has been removed`,
      severity: 'BREAKING',
    });
  });
  
  // Check for removed fields in response schemas
  prevPaths.forEach((pathObj, path) => {
    if (!currPaths[p]) return;
    
    const prevMethods = prevPaths[p];
    const currMethods = currPaths[p];
    
    Object.keys(prevMethods).forEach(method => {
      if (!currMethods[method]) return;
      
      const prevResponses = prevMethods[method].responses || {};
      const currResponses = currMethods[method].responses || {};
      
      Object.keys(prevResponses).forEach(statusCode => {
        if (!currResponses[statusCode]) return;
        
        const prevSchema = prevResponses[statusCode].content?.['application/json']?.schema;
        const currSchema = currResponses[statusCode].content?.['application/json']?.schema;
        
        if (prevSchema && currSchema) {
          const removedFields = findRemovedFields(prevSchema.properties, currSchema.properties);
          removedFields.forEach(field => {
            breakingChanges.push({
              type: 'REMOVED_FIELD',
              path: `${p} ${method.toUpperCase()} ${statusCode}`,
              field: field,
              message: `Field ${field} removed from ${p} ${method.toUpperCase()} ${statusCode} response`,
              severity: 'BREAKING',
            });
          });
        }
      });
    });
  });
  
  return breakingChanges;
}

function findRemovedFields(prevProps, currProps) {
  if (!prevProps || !currProps) return [];
  return Object.keys(prevProps).filter(k => !(k in currProps));
}

function main() {
  const previous = loadYaml(PREVIOUS_SCHEMA);
  const current = loadYaml(CURRENT_SCHEMA);
  
  if (!previous || !current) {
    console.log('No previous schema to compare - creating baseline');
    process.exit(0);
  }
  
  const breakingChanges = findBreakingChanges(previous, current);
  
  if (breakingChanges.length > 0) {
    console.error('❌ Breaking changes detected in OpenAPI contract:');
    breakingChanges.forEach(c => {
      console.error(`   - [${c.severity}] ${c.message}`);
    });
    process.exit(1);
  }
  
  console.log('✅ No breaking changes detected in OpenAPI contract');
  process.exit(0);
}

main();
