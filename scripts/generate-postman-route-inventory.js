/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const servicesDir = path.join(repoRoot, 'services');
const collectionPath = path.join(repoRoot, 'postman', 'Maysar-Platform-E2E.postman_collection.json');
const unmountedReportPath = path.join(repoRoot, 'reports', 'unmounted-routes.json');

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];
const ROUTER_RECEIVER_PATTERN = '(?:[A-Za-z0-9_]*router|[A-Za-z0-9_]*Router|this\\.router)';

const manualModuleFileMappings = {
  // Modules that mount an app created in a non-routes file
  'compliance-service': [
    path.join(repoRoot, 'services', 'compliance-service', 'src', 'complianceService.ts')
  ]
};

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function fileExists(filePath) {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function normalizePath(value) {
  if (!value) return '';
  return value.replace(/\\/g, '/');
}

function joinPaths(...parts) {
  const cleaned = parts
    .filter(Boolean)
    .map(p => String(p))
    .join('/');
  const normalized = cleaned.replace(/\/+/g, '/');
  if (!normalized.startsWith('/')) {
    return `/${normalized}`;
  }
  return normalized;
}

function extractModuleName(indexContent) {
  const exportedModuleMatch = indexContent.match(
    /export\s+const\s+\w+Module\s*:\s*Module\s*=\s*\{[\s\S]*?\bname:\s*['"]([^'"]+)['"]/
  );
  if (exportedModuleMatch) {
    return exportedModuleMatch[1];
  }

  const allMatches = [...indexContent.matchAll(/name:\s*['"]([^'"]+)['"]/g)];
  return allMatches.length ? allMatches[allMatches.length - 1][1] : null;
}

function extractRouteTemplateValues(content) {
  const values = new Map();

  const literalAssignments = [
    ...content.matchAll(/\bconst\s+([A-Za-z0-9_]+)\s*=\s*['"`]([^'"`]+)['"`]\s*;/g),
    ...content.matchAll(/\b(?:let|var)\s+([A-Za-z0-9_]+)\s*=\s*['"`]([^'"`]+)['"`]\s*;/g),
  ];

  literalAssignments.forEach((match) => {
    values.set(match[1], match[2]);
  });

  const versionMatch = content.match(/\bapiVersion:\s*['"]([^'"]+)['"]/);
  if (versionMatch) {
    values.set('routesConfig.apiVersion', versionMatch[1]);
  }

  if (!values.has('apiPrefix') && versionMatch && content.includes('routesConfig.apiVersion')) {
    values.set('apiPrefix', `/${versionMatch[1]}`);
  }

  return values;
}

function resolveRoutePath(routePath, templateValues) {
  if (!routePath || !routePath.includes('${')) {
    return routePath;
  }

  let resolved = routePath;
  for (let i = 0; i < 5 && resolved.includes('${'); i += 1) {
    const matches = [...resolved.matchAll(/\$\{([A-Za-z0-9_.]+)\}/g)];
    if (!matches.length) {
      break;
    }

    for (const match of matches) {
      const replacement = templateValues.get(match[1]);
      if (!replacement) {
        return routePath;
      }
      resolved = resolved.replace(match[0], replacement);
    }
  }

  return resolved;
}

function extractImports(indexContent, indexDir) {
  const imports = new Map();
  const importRegex = /import\s+([^;]+)\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(indexContent)) !== null) {
    const clause = match[1].trim();
    const source = match[2];
    if (!source.startsWith('.')) {
      continue;
    }

    const hasKnownExt = /\.(ts|tsx|js|jsx)$/.test(source);
    const resolvedPath = path.resolve(indexDir, source + (hasKnownExt ? '' : '.ts'));
    const resolvedPathAlt = path.resolve(indexDir, source, 'index.ts');
    const resolved = fileExists(resolvedPath)
      ? resolvedPath
      : fileExists(resolvedPathAlt)
        ? resolvedPathAlt
        : null;
    if (!resolved) {
      continue;
    }

    if (clause.startsWith('{')) {
      const named = clause
        .replace(/[{}]/g, '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      named.forEach(entry => {
        const parts = entry.split(/\s+as\s+/i).map(s => s.trim()).filter(Boolean);
        const alias = parts.length > 1 ? parts[1] : parts[0];
        if (alias) {
          imports.set(alias, resolved);
        }
      });
    } else {
      const defaultMatch = clause.match(/^([A-Za-z0-9_]+)/);
      if (defaultMatch) {
        imports.set(defaultMatch[1], resolved);
      }
    }
  }

  const requireRegex = /const\s+([A-Za-z0-9_]+)\s*=\s*require\(['"]([^'"]+)['"]\)(?:\\.default)?/g;
  let requireMatch;
  while ((requireMatch = requireRegex.exec(indexContent)) !== null) {
    const symbol = requireMatch[1];
    const source = requireMatch[2];
    if (!source.startsWith('.')) {
      continue;
    }
    const hasKnownExt = /\.(ts|tsx|js|jsx)$/.test(source);
    const resolvedPath = path.resolve(indexDir, source + (hasKnownExt ? '' : '.ts'));
    const resolvedPathAlt = path.resolve(indexDir, source, 'index.ts');
    const resolved = fileExists(resolvedPath)
      ? resolvedPath
      : fileExists(resolvedPathAlt)
        ? resolvedPathAlt
        : null;
    if (resolved) {
      imports.set(symbol, resolved);
    }
  }

  return imports;
}

function collectRouteFiles(rootDir) {
  const results = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current.includes(`${path.sep}dist${path.sep}`)) {
      continue;
    }
    const entries = fs.readdirSync(current, { withFileTypes: true });
    entries.forEach(entry => {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '__tests__' || entry.name === 'tests') {
          return;
        }
        stack.push(fullPath);
        return;
      }
      if (!entry.isFile()) return;
      if (!entry.name.endsWith('.ts')) return;
      if (entry.name.endsWith('.d.ts')) return;
      if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.spec.ts')) return;
      if (entry.name.includes('metadata')) return;
      if (!/routes/i.test(entry.name)) return;
      results.push(fullPath);
    });
  }
  return results;
}

function extractRouteUseMappings(indexContent, imports, moduleBase) {
  const mappings = new Map();
  const aliasToFile = new Map();

  const aliasRegex = /\b(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*([A-Za-z0-9_]+)\s*\(/g;
  const assignAliasRegex = /\b([A-Za-z0-9_]+)\s*=\s*([A-Za-z0-9_]+)\s*\(/g;
  let aliasMatch;
  while ((aliasMatch = aliasRegex.exec(indexContent)) !== null) {
    const alias = aliasMatch[1];
    const symbol = aliasMatch[2];
    if (imports.has(symbol)) {
      aliasToFile.set(alias, imports.get(symbol));
    }
  }
  while ((aliasMatch = assignAliasRegex.exec(indexContent)) !== null) {
    const alias = aliasMatch[1];
    const symbol = aliasMatch[2];
    if (imports.has(symbol)) {
      aliasToFile.set(alias, imports.get(symbol));
    }
  }

  const useRegex = new RegExp(`\\b${ROUTER_RECEIVER_PATTERN}(?:\\.|\\?\\.)use\\(([^;]+)\\);`, 'g');
  let match;
  while ((match = useRegex.exec(indexContent)) !== null) {
    const args = match[1].trim();
    let prefix = '';
    let remainder = args;
    const prefixMatch = remainder.match(/^['"`]([^'"`]+)['"`]\s*,\s*(.+)$/s);
    if (prefixMatch) {
      prefix = prefixMatch[1];
      remainder = prefixMatch[2];
    }

    const allSymbols = new Map([...imports.entries(), ...aliasToFile.entries()]);
    allSymbols.forEach((filePath, symbol) => {
      const symbolRegex = new RegExp(`\\b${symbol}\\b`);
      if (symbolRegex.test(remainder)) {
        const fullPrefix = joinPaths(moduleBase, prefix);
        if (!mappings.has(filePath)) {
          mappings.set(filePath, new Set());
        }
        mappings.get(filePath).add(fullPrefix);
      }
    });
  }

  // Handle direct assignment to module routes: routes: symbol, routes = symbol(...), Module.routes = symbol(...)
  const routeAssignmentRegexes = [
    /routes\s*:\s*([A-Za-z0-9_]+)/g,
    /routes\s*=\s*([A-Za-z0-9_]+)\(/g,
    /[A-Za-z0-9_]+Module\.routes\s*=\s*([A-Za-z0-9_]+)\(/g,
    /routes\s*=\s*([A-Za-z0-9_]+)\s*;/g,
    /[A-Za-z0-9_]+Module\.routes\s*=\s*([A-Za-z0-9_]+)\s*;/g
  ];
  routeAssignmentRegexes.forEach(regex => {
    let assignMatch;
    while ((assignMatch = regex.exec(indexContent)) !== null) {
      const symbol = assignMatch[1];
      const filePath = imports.get(symbol) || aliasToFile.get(symbol);
      if (filePath) {
        if (!mappings.has(filePath)) {
          mappings.set(filePath, new Set());
        }
        mappings.get(filePath).add(joinPaths(moduleBase));
      }
    }
  });

  return mappings;
}

function extractRouteAliasMappings(indexContent, imports) {
  const mappings = new Map();
  const aliasPatterns = [
    /routeAliases\s*=\s*\[\s*\{\s*path:\s*['"`]([^'"`]+)['"`]\s*,\s*router:\s*([A-Za-z0-9_]+)/g,
    /routeAliases\s*:\s*\[\s*\{\s*path:\s*['"`]([^'"`]+)['"`]\s*,\s*router:\s*([A-Za-z0-9_]+)/g,
  ];

  aliasPatterns.forEach((regex) => {
    let match;
    while ((match = regex.exec(indexContent)) !== null) {
      const aliasPath = match[1];
      const routerSymbol = match[2];
      const filePath = imports.get(routerSymbol);
      if (!filePath) {
        continue;
      }
      if (!mappings.has(filePath)) {
        mappings.set(filePath, new Set());
      }
      mappings.get(filePath).add(aliasPath);
    }
  });

  return mappings;
}

function buildTransitiveRouteMappings(initialMappings) {
  const mappings = new Map();
  const visited = new Set();

  const enqueue = (filePath, prefix) => {
    const key = `${filePath}::${prefix}`;
    if (visited.has(key)) return;
    visited.add(key);
    if (!mappings.has(filePath)) {
      mappings.set(filePath, new Set());
    }
    mappings.get(filePath).add(prefix);
  };

  initialMappings.forEach((prefixes, filePath) => {
    prefixes.forEach(prefix => enqueue(filePath, prefix));
  });

  const queue = Array.from(visited).map(entry => {
    const [filePath, prefix] = entry.split('::');
    return { filePath, prefix };
  });

  while (queue.length > 0) {
    const { filePath, prefix } = queue.shift();
    const content = readFile(filePath);
    const imports = extractImports(content, path.dirname(filePath));
    const nestedMappings = extractRouteUseMappings(content, imports, prefix);
    nestedMappings.forEach((childPrefixes, childFile) => {
      childPrefixes.forEach(childPrefix => {
        const key = `${childFile}::${childPrefix}`;
        if (!visited.has(key)) {
          visited.add(key);
          if (!mappings.has(childFile)) {
            mappings.set(childFile, new Set());
          }
          mappings.get(childFile).add(childPrefix);
          queue.push({ filePath: childFile, prefix: childPrefix });
        }
      });
    });
  }

  return mappings;
}

function extractInlineRoutes(indexContent, moduleBase) {
  const routes = [];
  const templateValues = extractRouteTemplateValues(indexContent);
  const methodRegex = new RegExp(`\\b${ROUTER_RECEIVER_PATTERN}\\.(${HTTP_METHODS.join('|')})\\(\\s*['"\`]([^'"\`]+)['"\`]`, 'g');
  let match;
  while ((match = methodRegex.exec(indexContent)) !== null) {
    const method = match[1].toUpperCase();
    const routePath = resolveRoutePath(match[2], templateValues);
    routes.push({ method, path: joinPaths(moduleBase, routePath) });
  }
  return routes;
}

function extractRoutesFromFile(filePath, prefixes) {
  const content = readFile(filePath);
  const routes = [];
  const templateValues = extractRouteTemplateValues(content);
  const methodRegex = new RegExp(`\\b${ROUTER_RECEIVER_PATTERN}\\.(${HTTP_METHODS.join('|')})\\(\\s*['"\`]([^'"\`]+)['"\`]`, 'g');
  let match;
  while ((match = methodRegex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const routePath = resolveRoutePath(match[2], templateValues);
    prefixes.forEach(prefix => {
      routes.push({ method, path: joinPaths(prefix, routePath) });
    });
  }
  return routes;
}

function extractRawRoutesFromFile(filePath) {
  const content = readFile(filePath);
  const routes = [];
  const methodRegex = new RegExp(`\\b${ROUTER_RECEIVER_PATTERN}\\.(${HTTP_METHODS.join('|')})\\(\\s*['"\`]([^'"\`]+)['"\`]`, 'g');
  let match;
  while ((match = methodRegex.exec(content)) !== null) {
    routes.push({ method: match[1].toUpperCase(), path: match[2] });
  }
  return routes;
}

function collectModuleIndexes() {
  const entries = fs.readdirSync(servicesDir, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(servicesDir, entry.name, 'index.ts'))
    .filter(fileExists);
}

function buildRouteInventory() {
  const moduleIndexes = collectModuleIndexes();
  const allRoutes = [];
  const routeFileMappings = new Map();
  const debug = process.env.ROUTE_DEBUG === '1';

  moduleIndexes.forEach(indexPath => {
    const indexContent = readFile(indexPath);
    const moduleName = extractModuleName(indexContent);
    if (!moduleName) {
      return;
    }
    const moduleBase = joinPaths('/api', moduleName.replace(/-service$/, ''));
    const indexDir = path.dirname(indexPath);
    const imports = extractImports(indexContent, indexDir);
    const mappings = extractRouteUseMappings(indexContent, imports, moduleBase);
    const aliasMappings = extractRouteAliasMappings(indexContent, imports);

    aliasMappings.forEach((prefixes, filePath) => {
      if (!mappings.has(filePath)) {
        mappings.set(filePath, new Set());
      }
      prefixes.forEach((prefix) => mappings.get(filePath).add(prefix));
    });

    // Manual overrides for modules that mount an app factory directly
    const manual = manualModuleFileMappings[moduleName] || [];
    manual.forEach(filePath => {
      if (!mappings.has(filePath)) {
        mappings.set(filePath, new Set());
      }
      mappings.get(filePath).add(moduleBase);
    });

    if (debug) {
      console.log(`\n[route-debug] module=${moduleName}`);
    }

    mappings.forEach((prefixes, filePath) => {
      if (!routeFileMappings.has(filePath)) {
        routeFileMappings.set(filePath, new Set());
      }
      Array.from(prefixes).forEach(prefix => routeFileMappings.get(filePath).add(prefix));
    });

    // Include inline routes defined in index file (health-summary, metrics, etc.)
    allRoutes.push(...extractInlineRoutes(indexContent, moduleBase));
  });

  const transitiveMappings = buildTransitiveRouteMappings(
    new Map(Array.from(routeFileMappings.entries()).map(([filePath, prefixes]) => [filePath, Array.from(prefixes)]))
  );

  if (debug) {
    transitiveMappings.forEach((prefixes, filePath) => {
      console.log(`  ${normalizePath(path.relative(repoRoot, filePath))} -> ${Array.from(prefixes).join(', ')}`);
    });
  }

  transitiveMappings.forEach((prefixes, filePath) => {
    allRoutes.push(...extractRoutesFromFile(filePath, Array.from(prefixes)));
  });

  // Global app-level routes in src/app.ts
  allRoutes.push(
    { method: 'GET', path: '/health' },
    { method: 'GET', path: '/ready' },
    { method: 'GET', path: '/debug-sentry' }
  );

  // Deduplicate by method+path
  const seen = new Set();
  const unique = [];
  allRoutes.forEach(route => {
    const key = `${route.method} ${route.path}`;
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(route);
  });

  unique.sort((a, b) => {
    if (a.path === b.path) {
      return a.method.localeCompare(b.method);
    }
    return a.path.localeCompare(b.path);
  });

  return unique;
}

function buildRouteInventoryFolder(routes) {
  const testScript = [
    'pm.test("Route is mounted (not 404)", function () {',
    '  pm.expect(pm.response.code).to.not.equal(404);',
    '});'
  ];

  return {
    name: '99 Route Inventory (Auto)',
    description: 'Auto-generated inventory of all detected module routes.',
    item: routes.map(route => {
      const headers = [{ key: 'Accept', value: 'application/json' }];
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(route.method)) {
        headers.push({ key: 'Content-Type', value: 'application/json' });
      }
      return {
        name: `${route.method} ${route.path}`,
        event: [
          {
            listen: 'test',
            script: { type: 'text/javascript', exec: testScript }
          }
        ],
        request: {
          method: route.method,
          header: headers,
          url: `{{platform_base_url}}${route.path}`,
          description: ''
        },
        response: []
      };
    })
  };
}

function updateCollection() {
  const routes = buildRouteInventory();
  const collection = JSON.parse(readFile(collectionPath));

  collection.item = collection.item || [];
  collection.item = collection.item.filter(item => item.name !== '99 Route Inventory (Auto)');
  collection.item.push(buildRouteInventoryFolder(routes));

  fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2));
  const unmounted = buildUnmountedReport();
  fs.mkdirSync(path.dirname(unmountedReportPath), { recursive: true });
  fs.writeFileSync(unmountedReportPath, JSON.stringify(unmounted, null, 2));
  console.log(`Updated collection with ${routes.length} routes.`);
  console.log(`Unmounted route files: ${unmounted.files.length}`);
}

function buildUnmountedReport() {
  const allRouteFiles = collectRouteFiles(servicesDir);

  // Rebuild mounted mappings (transitive)
  const moduleIndexes = collectModuleIndexes();
  const routeFileMappings = new Map();

  moduleIndexes.forEach(indexPath => {
    const indexContent = readFile(indexPath);
    const moduleName = extractModuleName(indexContent);
    if (!moduleName) return;
    const moduleBase = joinPaths('/api', moduleName.replace(/-service$/, ''));
    const imports = extractImports(indexContent, path.dirname(indexPath));
    const mappings = extractRouteUseMappings(indexContent, imports, moduleBase);
    const aliasMappings = extractRouteAliasMappings(indexContent, imports);

    aliasMappings.forEach((prefixes, filePath) => {
      if (!mappings.has(filePath)) {
        mappings.set(filePath, new Set());
      }
      prefixes.forEach((prefix) => mappings.get(filePath).add(prefix));
    });

    (manualModuleFileMappings[moduleName] || []).forEach(filePath => {
      if (!mappings.has(filePath)) {
        mappings.set(filePath, new Set());
      }
      mappings.get(filePath).add(moduleBase);
    });

    mappings.forEach((prefixes, filePath) => {
      if (!routeFileMappings.has(filePath)) {
        routeFileMappings.set(filePath, new Set());
      }
      Array.from(prefixes).forEach(prefix => routeFileMappings.get(filePath).add(prefix));
    });
  });

  const transitiveMappings = buildTransitiveRouteMappings(
    new Map(Array.from(routeFileMappings.entries()).map(([filePath, prefixes]) => [filePath, Array.from(prefixes)]))
  );

  const mountedFiles = new Set(Array.from(transitiveMappings.keys()));
  const unmountedFiles = allRouteFiles.filter(filePath => !mountedFiles.has(filePath));

  return {
    generatedAt: new Date().toISOString(),
    files: unmountedFiles.map(filePath => ({
      file: normalizePath(path.relative(repoRoot, filePath)),
      routes: extractRawRoutesFromFile(filePath)
    }))
  };
}

if (require.main === module) {
  updateCollection();
}

module.exports = {
  buildRouteInventory,
  buildUnmountedReport,
  collectModuleIndexes,
  extractModuleName,
};
