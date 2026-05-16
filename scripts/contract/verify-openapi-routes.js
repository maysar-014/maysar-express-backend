/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
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

function readSpecOperations(openApiPath) {
  const source = fs.readFileSync(openApiPath, 'utf8');
  const doc = yaml.parse(source);
  const operations = [];

  for (const [routePath, pathItem] of Object.entries(doc.paths || {})) {
    for (const method of HTTP_METHODS) {
      if (pathItem && pathItem[method]) {
        operations.push({
          method: method.toUpperCase(),
          path: normalizePath(routePath),
        });
      }
    }
  }

  return operations;
}

function verifyRoutes(openApiPath = defaultOpenApiPath) {
  const actualRoutes = buildRouteInventory().map((route) => ({
    method: route.method,
    path: normalizePath(route.path),
  }));
  const specRoutes = readSpecOperations(openApiPath);

  const actualSet = new Set(actualRoutes.map((route) => `${route.method} ${route.path}`));
  const specSet = new Set(specRoutes.map((route) => `${route.method} ${route.path}`));

  const missingFromSpec = actualRoutes.filter((route) => !specSet.has(`${route.method} ${route.path}`));
  const extraInSpec = specRoutes.filter((route) => !actualSet.has(`${route.method} ${route.path}`));

  return {
    openApiPath,
    actualCount: actualRoutes.length,
    specCount: specRoutes.length,
    missingFromSpec,
    extraInSpec,
  };
}

if (require.main === module) {
  const openApiPath = path.resolve(process.argv[2] || defaultOpenApiPath);
  const result = verifyRoutes(openApiPath);

  console.log(`Verified OpenAPI route inventory in ${result.openApiPath}`);
  console.log(`- Mounted endpoints: ${result.actualCount}`);
  console.log(`- Documented endpoints: ${result.specCount}`);
  console.log(`- Missing from spec: ${result.missingFromSpec.length}`);
  console.log(`- Extra in spec: ${result.extraInSpec.length}`);

  if (result.missingFromSpec.length || result.extraInSpec.length) {
    if (result.missingFromSpec.length) {
      console.log('\nMissing from spec (first 25):');
      result.missingFromSpec.slice(0, 25).forEach((route) => {
        console.log(`- ${route.method} ${route.path}`);
      });
    }

    if (result.extraInSpec.length) {
      console.log('\nExtra in spec (first 25):');
      result.extraInSpec.slice(0, 25).forEach((route) => {
        console.log(`- ${route.method} ${route.path}`);
      });
    }

    process.exit(1);
  }
}

module.exports = {
  verifyRoutes,
  normalizePath,
};
