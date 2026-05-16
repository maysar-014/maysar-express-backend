/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const jsyaml = require('js-yaml');
const { buildRouteInventory } = require('../generate-postman-route-inventory');

const repoRoot = path.resolve(__dirname, '..', '..');
const defaultOpenApiPath = path.join(repoRoot, 'openapi.yaml');
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];

function normalizePath(routePath) {
  return (routePath || '/')
    .replace(/:([A-Za-z0-9_]+)/g, '{$1}')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '') || '/';
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function collectPathParamNames(routePath) {
  return [...normalizePath(routePath).matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
}

function toTitleCase(value) {
  return String(value)
    .split(/[-_/]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function inferTag(routePath) {
  const parts = normalizePath(routePath).split('/').filter(Boolean);
  if (parts[0] !== 'api') {
    return 'System';
  }

  if (parts[1] === 'admin') {
    return 'Analytics';
  }

  return toTitleCase(parts[1] || 'System');
}

function generateOperationId(method, routePath) {
  const cleaned = `${method.toLowerCase()}_${normalizePath(routePath)}`
    .replace(/[{}]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned;
}

function generateSummary(method, routePath) {
  const parts = normalizePath(routePath).split('/').filter(Boolean).slice(2);
  const pathLabel = parts.length ? parts.join(' ') : normalizePath(routePath);
  return `${method.toUpperCase()} ${pathLabel}`;
}

function buildGeneratedOperation(method, routePath) {
  const successStatus = method.toLowerCase() === 'post' ? '200' : '200';
  return {
    tags: [inferTag(routePath)],
    summary: generateSummary(method, routePath),
    description: 'Auto-generated from mounted Express routes to keep the contract aligned with the reachable API surface.',
    operationId: generateOperationId(method, routePath),
    'x-generated-route-sync': true,
    responses: {
      [successStatus]: {
        description: 'Success',
      },
    },
  };
}

function ensurePathParameters(pathItem, routePath) {
  const names = collectPathParamNames(routePath);
  if (!names.length) {
    return;
  }

  pathItem.parameters = Array.isArray(pathItem.parameters) ? pathItem.parameters : [];
  const existingKeys = new Set(
    pathItem.parameters
      .filter((parameter) => parameter && parameter.in === 'path' && parameter.name)
      .map((parameter) => `${parameter.in}:${parameter.name}`)
  );

  names.forEach((name) => {
    const key = `path:${name}`;
    if (existingKeys.has(key)) {
      return;
    }
    pathItem.parameters.push({
      name,
      in: 'path',
      required: true,
      schema: { type: 'string' },
    });
  });
}

function hasMethods(pathItem) {
  return HTTP_METHODS.some((method) => pathItem && pathItem[method]);
}

function syncRoutes(openApiPath = defaultOpenApiPath) {
  const source = fs.readFileSync(openApiPath, 'utf8');
  const document = yaml.parseDocument(source, { uniqueKeys: false });
  const doc = document.toJS();

  doc.paths = doc.paths && typeof doc.paths === 'object' ? doc.paths : {};

  const existingPaths = doc.paths;
  const nextPaths = {};
  const routes = buildRouteInventory();
  const preservedOperations = [];
  const generatedOperations = [];

  for (const route of routes) {
    const normalizedPath = normalizePath(route.path);
    const method = route.method.toLowerCase();
    const existingPathItem = existingPaths[normalizedPath];
    const existingOperation = existingPathItem && existingPathItem[method];

    if (!nextPaths[normalizedPath]) {
      const basePathItem = existingPathItem ? clone(existingPathItem) : {};
      HTTP_METHODS.forEach((httpMethod) => {
        delete basePathItem[httpMethod];
      });
      nextPaths[normalizedPath] = basePathItem;
    }

    if (existingOperation) {
      nextPaths[normalizedPath][method] = clone(existingOperation);
      preservedOperations.push(`${route.method} ${normalizedPath}`);
    } else {
      nextPaths[normalizedPath][method] = buildGeneratedOperation(method, normalizedPath);
      generatedOperations.push(`${route.method} ${normalizedPath}`);
    }

    ensurePathParameters(nextPaths[normalizedPath], normalizedPath);
  }

  Object.keys(nextPaths)
    .filter((routePath) => !hasMethods(nextPaths[routePath]))
    .forEach((routePath) => {
      delete nextPaths[routePath];
    });

  const sortedPaths = Object.keys(nextPaths)
    .sort((left, right) => left.localeCompare(right))
    .reduce((acc, routePath) => {
      acc[routePath] = nextPaths[routePath];
      return acc;
    }, {});

  const previousOperationKeys = [];
  for (const [routePath, pathItem] of Object.entries(existingPaths)) {
    if (!pathItem || typeof pathItem !== 'object') {
      continue;
    }
    for (const method of HTTP_METHODS) {
      if (pathItem[method]) {
        previousOperationKeys.push(`${method.toUpperCase()} ${normalizePath(routePath)}`);
      }
    }
  }

  const nextOperationKeys = [];
  for (const route of routes) {
    nextOperationKeys.push(`${route.method} ${normalizePath(route.path)}`);
  }

  const previousSet = new Set(previousOperationKeys);
  const nextSet = new Set(nextOperationKeys);
  const removedOperations = previousOperationKeys.filter((key) => !nextSet.has(key));

  doc.paths = sortedPaths;
  fs.writeFileSync(openApiPath, jsyaml.dump(doc, { noRefs: true, lineWidth: -1, sortKeys: false }));

  return {
    openApiPath,
    routeCount: routes.length,
    preservedOperations,
    generatedOperations,
    removedOperations,
  };
}

if (require.main === module) {
  const openApiPath = path.resolve(process.argv[2] || defaultOpenApiPath);
  const result = syncRoutes(openApiPath);

  console.log(`Synchronized route inventory in ${result.openApiPath}`);
  console.log(`- Reachable endpoints: ${result.routeCount}`);
  console.log(`- Preserved operations: ${result.preservedOperations.length}`);
  console.log(`- Generated operations: ${result.generatedOperations.length}`);
  console.log(`- Removed stale operations: ${result.removedOperations.length}`);
}

module.exports = {
  syncRoutes,
  normalizePath,
};
