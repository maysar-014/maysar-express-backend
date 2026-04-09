const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const repoRoot = path.resolve(__dirname, '..', '..');
const openApiPath = path.join(repoRoot, 'openapi.yaml');
const collectionPath = path.join(repoRoot, 'postman', 'Maysar-Platform-E2E.postman_collection.json');
const contractFolderName = '98 - OpenAPI Contract Coverage';
const routeInventoryFolderName = '99 Route Inventory (Auto)';
const httpMethods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function deepClone(value) {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodePointerSegment(segment) {
  return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

function resolveLocalRef(ref, rootDoc) {
  if (!ref || typeof ref !== 'string' || !ref.startsWith('#/')) return null;
  const parts = ref.slice(2).split('/').map(decodePointerSegment);
  let current = rootDoc;
  for (const part of parts) {
    if (current == null) return null;
    current = current[part];
  }
  return current || null;
}

function resolveNode(node, rootDoc) {
  if (!node || typeof node !== 'object') return node;
  if (node.$ref) {
    const resolved = resolveLocalRef(node.$ref, rootDoc);
    if (!resolved) return node;
    return resolveNode(resolved, rootDoc);
  }
  return node;
}

function normalizeTemplatePath(routePath) {
  return `/${String(routePath)
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .map((segment) => segment.replace(/\{[^}]+\}/g, '{}'))
    .join('/')}`;
}

function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value));
}

function isParamLikeValue(value) {
  const text = String(value || '');
  if (!text) return false;
  if (isUuidLike(text)) return true;
  if (/^\d+$/.test(text)) return true;
  if (/^(test|missing|sample|mock|fake|example)-/i.test(text)) return true;
  if (/^sess-/i.test(text)) return true;
  if (/^(buyer|seller|courier|supplier|enabler|system)-\d+$/i.test(text)) return true;
  if (text.length > 6 && /[a-z]/i.test(text) && /\d/.test(text)) return true;
  if (text.length > 4 && text.includes('_')) return true;
  if (/^[A-Za-z0-9_-]*Id$/.test(text)) return true;
  if (/^[A-Za-z0-9_-]*_id$/i.test(text)) return true;
  return false;
}

function buildVariableMap(collection) {
  return new Map((collection.variable || []).map((entry) => [entry.key, entry.value]));
}

function preferredVariableName(name) {
  const text = String(name || '').toLowerCase();
  const matchers = [
    [/^(user|buyer|owner)id$/, 'user_id'],
    [/^user_id$/, 'user_id'],
    [/buyerid/, 'user_id'],
    [/sellerid/, 'seller_id'],
    [/businessid/, 'business_id'],
    [/orderid/, 'order_id'],
    [/paymentid/, 'payment_id'],
    [/deliveryid/, 'delivery_id'],
    [/trackingnumber/, 'order_tracking_number'],
    [/sessionid/, 'session_id'],
    [/notificationid/, 'notification_id'],
    [/messageid/, 'notification_id'],
    [/templateid/, 'template_id'],
    [/trainingid/, 'training_id'],
    [/campaignid/, 'campaign_id'],
    [/commissionid/, 'commission_id'],
    [/courierid/, 'courier_id'],
    [/routeid/, 'route_id'],
    [/postid/, 'post_id'],
    [/articleid/, 'post_id'],
    [/threadid/, 'post_id'],
    [/enablerid/, 'enabler_id'],
    [/payoutid/, 'payout_id'],
    [/variantid/, 'missing_id'],
    [/verificationid/, 'missing_id'],
    [/cartid/, 'missing_id'],
    [/\bid$/, 'missing_id'],
  ];

  for (const [pattern, variableName] of matchers) {
    if (pattern.test(text)) return variableName;
  }
  return null;
}

function sampleValueForName(name, schema, rootDoc, varMap) {
  const variableName = preferredVariableName(name);
  if (variableName && varMap.has(variableName)) {
    const variableValue = varMap.get(variableName);
    if (variableValue !== undefined && variableValue !== '') {
      return `{{${variableName}}}`;
    }
  }

  const text = String(name || '').toLowerCase();
  if (text.includes('email')) return 'contract@example.com';
  if (text.includes('phone')) return '+255712345678';
  if (text.includes('currency')) return 'TZS';
  if (text.includes('country')) return 'TZ';
  if (text.includes('status')) return 'pending';
  if (text.includes('priority')) return 'medium';
  if (text.includes('role')) return 'buyer';
  if (text.includes('page')) return '1';
  if (text.includes('limit')) return '20';
  if (text.includes('url') || text.includes('uri')) return 'https://example.com/resource';
  if (text.includes('date-time') || text.includes('datetime') || text.includes('time')) return '2024-01-01T00:00:00Z';
  if (text.includes('date')) return '2024-01-01';
  if (text.includes('token')) return 'sample-token';

  const resolvedSchema = resolveNode(schema, rootDoc);
  if (resolvedSchema && typeof resolvedSchema === 'object') {
    if (resolvedSchema.example !== undefined) return resolvedSchema.example;
    if (Array.isArray(resolvedSchema.enum) && resolvedSchema.enum.length > 0) return resolvedSchema.enum[0];
    if (resolvedSchema.default !== undefined) return resolvedSchema.default;
    if (resolvedSchema.format === 'uuid') return '00000000-0000-4000-8000-000000000001';
    if (resolvedSchema.format === 'email') return 'contract@example.com';
    if (resolvedSchema.format === 'date-time') return '2024-01-01T00:00:00Z';
    if (resolvedSchema.format === 'date') return '2024-01-01';
    if (resolvedSchema.format === 'uri') return 'https://example.com/resource';
    if (resolvedSchema.format === 'binary') return 'sample-file.bin';
    if (resolvedSchema.type === 'integer' || resolvedSchema.type === 'number') return 1;
    if (resolvedSchema.type === 'boolean') return true;
  }

  if (variableName && varMap.has(variableName)) {
    const variableValue = varMap.get(variableName);
    if (variableValue !== undefined && variableValue !== '') return variableValue;
  }

  if (text.includes('id')) return '00000000-0000-4000-8000-000000000001';
  return `sample-${text || 'value'}`.replace(/[^a-z0-9-]/g, '-');
}

function buildExampleFromSchema(schema, rootDoc, nameHint, seen = new Set()) {
  const resolved = resolveNode(schema, rootDoc);
  if (!resolved || typeof resolved !== 'object') return sampleValueForName(nameHint, resolved, rootDoc, buildVariableMapFromRoot(rootDoc));
  if (seen.has(resolved)) return sampleValueForName(nameHint, resolved, rootDoc, buildVariableMapFromRoot(rootDoc));
  seen.add(resolved);

  if (resolved.example !== undefined) return deepClone(resolved.example);
  if (Array.isArray(resolved.enum) && resolved.enum.length > 0) return deepClone(resolved.enum[0]);
  if (resolved.default !== undefined) return deepClone(resolved.default);
  if (Array.isArray(resolved.oneOf) && resolved.oneOf.length > 0) return buildExampleFromSchema(resolved.oneOf[0], rootDoc, nameHint, seen);
  if (Array.isArray(resolved.anyOf) && resolved.anyOf.length > 0) return buildExampleFromSchema(resolved.anyOf[0], rootDoc, nameHint, seen);
  if (Array.isArray(resolved.allOf) && resolved.allOf.length > 0) {
    const merged = {};
    resolved.allOf.forEach((entry) => {
      const value = buildExampleFromSchema(entry, rootDoc, nameHint, seen);
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(merged, value);
      }
    });
    if (Object.keys(merged).length > 0) return merged;
  }

  const schemaType = resolved.type || (resolved.properties ? 'object' : null);
  if (schemaType === 'object') {
    const result = {};
    const propertyEntries = Object.entries(resolved.properties || {});
    const requiredKeys = Array.isArray(resolved.required) ? resolved.required : [];
    const keys = requiredKeys.length > 0
      ? requiredKeys
      : propertyEntries.slice(0, 3).map(([key]) => key);

    for (const key of keys) {
      const childSchema = resolved.properties ? resolved.properties[key] : undefined;
      result[key] = buildExampleFromSchema(childSchema, rootDoc, key, seen);
    }

    if (Object.keys(result).length > 0) return result;
    if (resolved.additionalProperties && typeof resolved.additionalProperties === 'object') {
      return {
        sample: buildExampleFromSchema(resolved.additionalProperties, rootDoc, `${nameHint}Item`, seen),
      };
    }
    return {};
  }

  if (schemaType === 'array') {
    return [buildExampleFromSchema(resolved.items, rootDoc, `${nameHint}Item`, seen)];
  }

  if (schemaType === 'integer' || schemaType === 'number') return 1;
  if (schemaType === 'boolean') return true;
  if (schemaType === 'string') {
    return sampleValueForName(nameHint, resolved, rootDoc, buildVariableMapFromRoot(rootDoc));
  }

  if (resolved.format) {
    return sampleValueForName(nameHint, resolved, rootDoc, buildVariableMapFromRoot(rootDoc));
  }

  return sampleValueForName(nameHint, resolved, rootDoc, buildVariableMapFromRoot(rootDoc));
}

function buildVariableMapFromRoot(rootDoc) {
  const collection = rootDoc.__collection;
  return collection ? buildVariableMap(collection) : new Map();
}

function collectOperationParameters(pathItem, operation, rootDoc) {
  const params = [];
  const seen = new Set();
  for (const source of [pathItem?.parameters || [], operation?.parameters || []]) {
    for (const parameter of source) {
      const resolved = resolveNode(parameter, rootDoc);
      if (!resolved || typeof resolved !== 'object') continue;
      const key = `${resolved.in || 'query'}:${resolved.name || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      params.push(resolved);
    }
  }
  return params;
}

function parameterValue(parameter, rootDoc, varMap) {
  const resolved = resolveNode(parameter, rootDoc);
  const schema = resolved?.schema ? resolveNode(resolved.schema, rootDoc) : undefined;
  const name = resolved?.name || 'value';

  if (resolved?.example !== undefined) return resolved.example;
  if (resolved?.default !== undefined) return resolved.default;
  if (resolved?.examples && typeof resolved.examples === 'object') {
    const firstExample = Object.values(resolved.examples)[0];
    if (firstExample && typeof firstExample === 'object' && firstExample.value !== undefined) return firstExample.value;
  }
  if (schema?.example !== undefined) return schema.example;
  if (Array.isArray(schema?.enum) && schema.enum.length > 0) return schema.enum[0];

  const variableName = preferredVariableName(name);
  if (variableName && varMap.has(variableName) && varMap.get(variableName) !== '') {
    return `{{${variableName}}}`;
  }

  return sampleValueForName(name, schema, rootDoc, varMap);
}

function renderUrlValue(value) {
  if (value === undefined || value === null) return '';
  const text = String(value);
  if (/^\{\{[^}]+\}\}$/.test(text)) return text;
  return encodeURIComponent(text);
}

function parseBaseUrl(baseUrl) {
  try {
    return new URL(String(baseUrl));
  } catch {
    return new URL('http://localhost:3000');
  }
}

function splitRawUrl(rawUrl) {
  const raw = String(rawUrl || '');
  const [pathPart, queryPart = ''] = raw.split('?');
  const normalizedPath = pathPart
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/^\{\{platform_base_url\}\}/, '');
  return {
    path: normalizedPath,
    query: queryPart,
  };
}

function buildUrlObject(rawUrl, rootDoc) {
  const raw = String(rawUrl || '');
  const baseUrl = buildVariableMapFromRoot(rootDoc).get('platform_base_url') || 'http://localhost:3000';
  const parsed = parseBaseUrl(baseUrl);
  const { path, query } = splitRawUrl(raw);
  const queryParts = query
    ? query.split('&').filter(Boolean).map((entry) => {
      const [key, value = ''] = entry.split('=');
      return {
        key: decodeURIComponent(key),
        value: decodeURIComponent(value),
      };
    })
    : [];

  return {
    raw,
    protocol: parsed.protocol.replace(/:$/, ''),
    host: parsed.hostname.split('.'),
    port: parsed.port || undefined,
    path: path.split('/').filter(Boolean),
    query: queryParts,
  };
}

function buildRequestUrl(operation, pathItem, rootDoc, varMap) {
  let urlPath = String(operation.path);
  const params = collectOperationParameters(pathItem, operation, rootDoc);

  for (const parameter of params.filter((entry) => String(entry.in || '').toLowerCase() === 'path')) {
    const value = renderUrlValue(parameterValue(parameter, rootDoc, varMap));
    urlPath = urlPath.replace(new RegExp(`\\{${escapeRegExp(parameter.name)}\\}`, 'g'), value);
  }

  const query = [];
  for (const parameter of params.filter((entry) => String(entry.in || '').toLowerCase() === 'query')) {
    const value = parameterValue(parameter, rootDoc, varMap);
    if (value === undefined || value === null || value === '') continue;
    const renderedValue = renderUrlValue(value);
    query.push(`${encodeURIComponent(parameter.name)}=${renderedValue}`);
  }

  return `{{platform_base_url}}${urlPath}${query.length > 0 ? `?${query.join('&')}` : ''}`;
}

function flattenBodyValue(value, prefix = '') {
  if (value === undefined) return [];
  if (value === null) return [{ key: prefix || 'value', value: '' }];
  if (Array.isArray(value)) {
    if (value.length === 0) return [{ key: prefix || 'items', value: '' }];
    return value.flatMap((entry, index) => flattenBodyValue(entry, prefix ? `${prefix}[${index}]` : String(index)));
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) return [{ key: prefix || 'value', value: '{}' }];
    return entries.flatMap(([key, entryValue]) => flattenBodyValue(entryValue, prefix ? `${prefix}.${key}` : key));
  }
  return [{ key: prefix || 'value', value: String(value) }];
}

function buildRequestBody(operation, rootDoc) {
  const resolvedRequestBody = resolveNode(operation.requestBody, rootDoc);
  if (!resolvedRequestBody || typeof resolvedRequestBody !== 'object') return undefined;

  const content = resolvedRequestBody.content || {};
  const preferredType = [
    'application/json',
    'multipart/form-data',
    'application/x-www-form-urlencoded',
    'text/plain',
  ].find((type) => content[type]) || Object.keys(content)[0];

  if (!preferredType) return undefined;

  const mediaType = resolveNode(content[preferredType], rootDoc) || {};
  const schema = mediaType.schema ? resolveNode(mediaType.schema, rootDoc) : undefined;
  const example = buildExampleFromSchema(schema, rootDoc, operation.operationId || operation.summary || operation.path);

  if (preferredType === 'multipart/form-data') {
    return {
      mode: 'formdata',
      formdata: flattenBodyValue(example).map((entry) => ({
        key: entry.key,
        value: entry.value,
        type: 'text',
      })),
    };
  }

  if (preferredType === 'application/x-www-form-urlencoded') {
    return {
      mode: 'urlencoded',
      urlencoded: flattenBodyValue(example).map((entry) => ({
        key: entry.key,
        value: entry.value,
        type: 'text',
      })),
    };
  }

  return {
    mode: 'raw',
    raw: typeof example === 'string' ? example : JSON.stringify(example, null, 2),
    options: {
      raw: {
        language: preferredType === 'text/plain' ? 'text' : 'json',
      },
    },
  };
}

function normalizeCollectionUrl(url, varMap) {
  let raw = '';
  if (typeof url === 'string') {
    raw = url;
  } else if (url && typeof url.raw === 'string') {
    raw = url.raw;
  } else if (url && Array.isArray(url.path)) {
    raw = `/${url.path.join('/')}`;
  } else if (url && typeof url === 'object') {
    const protocol = url.protocol ? `${url.protocol}://` : '';
    const host = Array.isArray(url.host) ? url.host.join('.') : '';
    const pathname = Array.isArray(url.path) ? `/${url.path.join('/')}` : '';
    raw = `${protocol}${host}${pathname}`;
  }

  raw = String(raw).trim();
  raw = raw.replace(/^https?:\/\/[^/]+/i, '');
  raw = raw.replace(/^\{\{platform_base_url\}\}/, '');
  raw = raw.replace(/^\{\{[^}]+\}\}/, '');
  raw = raw.split('?')[0];

  const segments = raw
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      if (/^\{\{[^}]+\}\}$/.test(segment)) {
        const key = segment.slice(2, -2);
        if (key === 'platform_base_url') return '';
        if (key === 'apiPrefix' && varMap.has(key) && varMap.get(key)) return String(varMap.get(key));
        const variableValue = varMap.get(key);
        if (variableValue !== undefined && variableValue !== '' && !isParamLikeValue(variableValue)) {
          return String(variableValue);
        }
        return '{}';
      }

      if (/^:[A-Za-z0-9_]+$/.test(segment)) return '{}';
      if (/^\{[^}]+\}$/.test(segment)) return '{}';
      if (isParamLikeValue(segment)) return '{}';
      return segment;
    })
    .filter(Boolean);

  return `/${segments.join('/')}`.replace(/\/+/g, '/');
}

function collectCollectionRouteKeys(items, varMap, keys = new Set()) {
  for (const item of items || []) {
    if (item.item) {
      collectCollectionRouteKeys(item.item, varMap, keys);
      continue;
    }

    if (!item.request) continue;
    const method = String(item.request.method || '').toUpperCase();
    const normalizedPath = normalizeCollectionUrl(item.request.url, varMap);
    if (method && normalizedPath) keys.add(`${method} ${normalizedPath}`);
  }

  return keys;
}

function normalizeOpenApiRouteKey(method, routePath) {
  return `${String(method).toUpperCase()} ${normalizeTemplatePath(routePath)}`;
}

function collectOpenApiOperations(spec, rootDoc) {
  const operations = [];
  for (const [routePath, pathItemRaw] of Object.entries(spec.paths || {})) {
    const pathItem = resolveNode(pathItemRaw, rootDoc) || {};
    for (const method of httpMethods) {
      const operationRaw = pathItem[method];
      if (!operationRaw) continue;
      const operation = resolveNode(operationRaw, rootDoc) || {};
      const tags = Array.isArray(operation.tags) ? operation.tags : [];
      operations.push({
        method: method.toUpperCase(),
        path: routePath,
        normalizedKey: normalizeOpenApiRouteKey(method, routePath),
        summary: operation.summary || '',
        description: operation.description || '',
        tags,
        operationId: operation.operationId || '',
        operation,
        pathItem,
      });
    }
  }
  return operations;
}

function buildMissingContractFolder(operations, rootDoc) {
  const tagOrder = new Map((rootDoc.tags || []).map((tag, index) => [tag.name, index]));
  const groups = new Map();

  for (const op of operations) {
    const groupName = op.tags[0] || 'Ungrouped';
    if (!groups.has(groupName)) groups.set(groupName, []);
    groups.get(groupName).push(buildContractRequestItem(op, rootDoc));
  }

  const sortedGroupNames = [...groups.keys()].sort((left, right) => {
    const leftIndex = tagOrder.has(left) ? tagOrder.get(left) : Number.MAX_SAFE_INTEGER;
    const rightIndex = tagOrder.has(right) ? tagOrder.get(right) : Number.MAX_SAFE_INTEGER;
    if (leftIndex !== rightIndex) return leftIndex - rightIndex;
    return left.localeCompare(right);
  });

  return {
    name: contractFolderName,
    description: 'OpenAPI contract requests added to keep the collection aligned with openapi.yaml.',
    event: buildCoverageSkipPrerequestEvent(),
    item: sortedGroupNames.map((tagName) => ({
      name: tagName,
      item: groups.get(tagName).sort((a, b) => a.name.localeCompare(b.name)),
    })),
  };
}

function buildCoverageSkipPrerequestEvent() {
  return [{
    listen: 'prerequest',
    script: {
      type: 'text/javascript',
      exec: [
        'const runCoverageRequests = String(pm.collectionVariables.get("run_coverage_requests") || "").toLowerCase() === "true";',
        'if (!runCoverageRequests) { pm.execution.skipRequest(); }'
      ]
    }
  }];
}

function buildContractRequestItem(op, rootDoc) {
  const rawUrl = buildRequestUrl(op, op.pathItem, rootDoc, buildVariableMapFromRoot(rootDoc));
  const request = {
    method: op.method,
    header: [{ key: 'Accept', value: 'application/json' }],
    url: buildUrlObject(rawUrl, rootDoc),
    description: `${op.method} ${op.path}`,
  };

  const body = buildRequestBody(op.operation, rootDoc);
  if (body) {
    request.body = body;
    if (body.mode === 'raw') {
      const contentType = (() => {
        const resolvedRequestBody = resolveNode(op.operation.requestBody, rootDoc);
        const content = resolvedRequestBody?.content || {};
        const preferredType = [
          'application/json',
          'text/plain',
        ].find((type) => content[type]) || Object.keys(content)[0];
        return preferredType || 'application/json';
      })();
      request.header.push({ key: 'Content-Type', value: contentType });
    }
  }

  return {
    name: op.summary || `${op.method} ${op.path}`,
    description: op.description || `${op.method} ${op.path}`,
    request,
    response: [],
  };
}

function pruneNonContractRequests(items, openApiKeySet, varMap) {
  const result = [];
  for (const item of items || []) {
    if (item.item) {
      const prunedChildren = pruneNonContractRequests(item.item, openApiKeySet, varMap);
      if (prunedChildren.length > 0) {
        result.push({ ...item, item: prunedChildren });
      }
      continue;
    }

    if (!item.request) {
      result.push(item);
      continue;
    }

    const method = String(item.request.method || '').toUpperCase();
    const normalizedPath = normalizeCollectionUrl(item.request.url, varMap);
    const key = `${method} ${normalizedPath}`;
    if (openApiKeySet.has(key)) {
      result.push(item);
    }
  }
  return result;
}

function insertFolderBeforeTarget(items, folder, targetName) {
  const index = items.findIndex((item) => item && item.name === targetName);
  if (index === -1) {
    items.push(folder);
    return items;
  }

  const nextItems = items.slice();
  nextItems.splice(index, 0, folder);
  return nextItems;
}

function main() {
  const dryRun = process.argv.includes('--dry-run');

  if (!fs.existsSync(openApiPath)) {
    throw new Error(`openapi.yaml not found at ${openApiPath}`);
  }
  if (!fs.existsSync(collectionPath)) {
    throw new Error(`Collection not found at ${collectionPath}`);
  }

  const spec = yaml.parse(fs.readFileSync(openApiPath, 'utf8'));
  const collection = readJson(collectionPath);
  const rootDoc = spec;
  rootDoc.__collection = collection;

  const varMap = buildVariableMap(collection);
  const openApiOperations = collectOpenApiOperations(spec, rootDoc);
  const openApiKeySet = new Set(openApiOperations.map((op) => op.normalizedKey));
  const baseItems = (collection.item || []).filter((item) => item && item.name !== contractFolderName);
  const collectionKeySet = collectCollectionRouteKeys(baseItems, varMap);

  const missingOperations = openApiOperations.filter((op) => !collectionKeySet.has(op.normalizedKey));
  const prunedItems = pruneNonContractRequests(baseItems, openApiKeySet, varMap);
  const contractFolder = buildMissingContractFolder(missingOperations, rootDoc);

  let nextItems = prunedItems;
  if (contractFolder.item.length > 0) {
    nextItems = insertFolderBeforeTarget(nextItems, contractFolder, routeInventoryFolderName);
  }

  const nextCollection = {
    ...collection,
    info: {
      ...collection.info,
      description: 'Auto-generated unified collection synchronized with openapi.yaml.',
    },
    item: nextItems,
  };

  const finalVarMap = buildVariableMap(nextCollection);
  const finalCollectionKeys = collectCollectionRouteKeys(nextCollection.item, finalVarMap);
  const remainingMissing = openApiOperations.filter((op) => !finalCollectionKeys.has(op.normalizedKey));
  const remainingExtra = [...finalCollectionKeys].filter((key) => !openApiKeySet.has(key));

  if (dryRun) {
    console.log(`Dry run: would remove ${collectionKeySet.size - finalCollectionKeys.size + missingOperations.length} request(s) and add ${missingOperations.length} missing contract request(s).`);
    console.log(`Remaining missing after sync: ${remainingMissing.length}`);
    console.log(`Remaining extra after sync: ${remainingExtra.length}`);
    if (remainingMissing.length > 0) {
      console.log('Remaining missing keys:');
      remainingMissing.forEach((op) => console.log(`  ${op.normalizedKey}`));
    }
    if (remainingExtra.length > 0) {
      console.log('Remaining extra keys:');
      remainingExtra.forEach((key) => console.log(`  ${key}`));
    }
    return;
  }

  writeJson(collectionPath, nextCollection);

  console.log(`Synced Postman collection from openapi.yaml.`);
  console.log(`Removed non-contract requests: ${collectionKeySet.size - finalCollectionKeys.size + missingOperations.length}`);
  console.log(`Added missing contract requests: ${missingOperations.length}`);
  console.log(`Remaining missing after sync: ${remainingMissing.length}`);
  console.log(`Remaining extra after sync: ${remainingExtra.length}`);

  if (remainingMissing.length > 0 || remainingExtra.length > 0) {
    console.warn('Warning: the collection still differs from openapi.yaml after sync.');
  }
}

main();
