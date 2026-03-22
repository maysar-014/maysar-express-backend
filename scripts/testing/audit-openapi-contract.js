const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const toBool = (value, fallback = false) => {
  if (value === undefined) return fallback;
  return !['0', 'false', 'no', 'off'].includes(String(value).toLowerCase());
};

const hasOwn = (value, key) => Boolean(value) && Object.prototype.hasOwnProperty.call(value, key);

const hasInlineExample = (node) => {
  if (!node || typeof node !== 'object') return false;
  if (Object.prototype.hasOwnProperty.call(node, 'example')) return node.example !== undefined;
  if (Array.isArray(node.examples)) return node.examples.length > 0;
  if (node.examples && typeof node.examples === 'object') return Object.keys(node.examples).length > 0;
  return false;
};

const extractSecuritySchemeNames = (security) => {
  if (!Array.isArray(security)) return [];

  return [...new Set(security.flatMap((requirement) => {
    if (!requirement || typeof requirement !== 'object') return [];
    return Object.keys(requirement);
  }))];
};

const LIKELY_PUBLIC_PATH_PATTERNS = [
  /\/health(?:\/|$)/,
  /\/metrics(?:\/|$)/,
  /\/login(?:\/|$)/,
  /\/forgot-password(?:\/|$)/,
  /\/request-password-reset(?:\/|$)/,
  /\/reset-password(?:\/|$)/,
  /\/verify-email(?:\/|$)/,
  /\/search(?:\/|$)/,
  /\/suggestions(?:\/|$)/,
  /\/storefront(?:\/|$)/,
];

const LIKELY_PUBLIC_TEXT_PATTERNS = [
  'public endpoint',
  'public api',
  'health check',
  'liveness probe',
  'readiness probe',
  'user login',
  'forgot password',
  'request password reset',
  'reset password',
  'verify email',
  'seller storefront',
];

const looksLikelyPublicOperation = ({ method, path: routePath, summary, description, tags }) => {
  const pathText = String(routePath || '').toLowerCase();
  if (method === 'OPTIONS' || method === 'HEAD') return true;
  if (LIKELY_PUBLIC_PATH_PATTERNS.some((pattern) => pattern.test(pathText))) return true;

  const text = [
    routePath,
    summary,
    description,
    ...(Array.isArray(tags) ? tags : []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return LIKELY_PUBLIC_TEXT_PATTERNS.some((pattern) => text.includes(pattern));
};

const schemaHasExample = (schema, seen = new Set()) => {
  if (!schema || typeof schema !== 'object' || seen.has(schema)) return false;
  seen.add(schema);

  if (hasInlineExample(schema)) return true;

  if (schema.items && schemaHasExample(schema.items, seen)) return true;
  if (Array.isArray(schema.prefixItems) && schema.prefixItems.some((item) => schemaHasExample(item, seen))) return true;
  if (schema.properties && Object.values(schema.properties).some((item) => schemaHasExample(item, seen))) return true;

  for (const key of ['allOf', 'anyOf', 'oneOf']) {
    if (Array.isArray(schema[key]) && schema[key].some((item) => schemaHasExample(item, seen))) {
      return true;
    }
  }

  return false;
};

const parameterHasExample = (parameter) => (
  hasInlineExample(parameter)
  || schemaHasExample(parameter?.schema)
);

const mediaTypeHasExample = (mediaType) => (
  hasInlineExample(mediaType)
  || schemaHasExample(mediaType?.schema)
);

const mediaTypeHasGeneratedExample = (mediaType) => (
  mediaType?.['x-codex-generated-example'] === true
  || mediaType?.schema?.['x-codex-generated-example'] === true
);

const operationHasExamples = (operation) => {
  const parameters = Array.isArray(operation?.parameters) ? operation.parameters : [];
  if (parameters.some(parameterHasExample)) return true;

  const content = operation?.requestBody?.content || {};
  return Object.values(content).some(mediaTypeHasExample);
};

const operationHasGeneratedExamples = (operation) => {
  const content = operation?.requestBody?.content || {};
  return Object.values(content).some(mediaTypeHasGeneratedExample);
};

const operationHasRequestInput = (operation) => {
  const parameters = Array.isArray(operation?.parameters) ? operation.parameters : [];
  if (parameters.length > 0) return true;

  const content = operation?.requestBody?.content || {};
  return Object.keys(content).length > 0;
};

const operationHasRequestSchema = (operation) => {
  const requestBody = operation?.requestBody;
  if (!requestBody) return true;
  const content = requestBody.content || {};
  return Object.values(content).some((mediaType) => Boolean(mediaType?.schema));
};

const responseHasSchema = (response) => {
  if (!response || typeof response !== 'object') return false;
  const content = response.content || {};
  return Object.values(content).some((mediaType) => Boolean(mediaType?.schema));
};

const methodMustNotHaveRequestBody = (method) => ['GET', 'HEAD'].includes(method);

const inspectOpenApi = (openApiPath) => {
  const source = fs.readFileSync(openApiPath, 'utf8');
  const strictDocument = yaml.parseDocument(source);
  const permissiveDocument = yaml.parseDocument(source, { uniqueKeys: false });
  const api = permissiveDocument.toJS();
  const rootSecurity = hasOwn(api, 'security') ? api.security : undefined;

  const duplicateKeys = strictDocument.errors
    .filter((error) => error?.code === 'DUPLICATE_KEY')
    .map((error) => ({
      code: error.code,
      message: error.message,
      line: error.linePos?.[0]?.line || null,
      column: error.linePos?.[0]?.col || null,
    }));

  const operations = [];

  for (const [routePath, pathItem] of Object.entries(api.paths || {})) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem?.[method];
      if (!operation) continue;
      const operationHasExplicitSecurity = hasOwn(operation, 'security');
      const pathHasExplicitSecurity = hasOwn(pathItem, 'security');
      const effectiveSecurity = operationHasExplicitSecurity
        ? operation.security
        : pathHasExplicitSecurity
          ? pathItem.security
          : rootSecurity;
      const effectiveSecuritySchemes = extractSecuritySchemeNames(effectiveSecurity);
      const isExplicitPublic = (
        (operationHasExplicitSecurity && Array.isArray(operation.security) && operation.security.length === 0)
        || (!operationHasExplicitSecurity && pathHasExplicitSecurity && Array.isArray(pathItem.security) && pathItem.security.length === 0)
      );
      const inheritedRootSecurity = (
        !operationHasExplicitSecurity
        && !pathHasExplicitSecurity
        && Array.isArray(rootSecurity)
        && rootSecurity.length > 0
      );
      const looksLikelyPublic = looksLikelyPublicOperation({
        method: method.toUpperCase(),
        path: routePath,
        summary: operation.summary,
        description: operation.description,
        tags: operation.tags,
      });

      const responses = operation.responses || {};
      const missingResponseSchemas = Object.entries(responses)
        .filter(([statusCode]) => !['204', '304'].includes(statusCode))
        .filter(([, response]) => !responseHasSchema(response))
        .map(([statusCode]) => statusCode);

      operations.push({
        method: method.toUpperCase(),
        path: routePath,
        operationId: operation.operationId || null,
        summary: operation.summary || null,
        description: operation.description || null,
        tags: Array.isArray(operation.tags) ? operation.tags : [],
        hasRequestInput: operationHasRequestInput(operation),
        hasExamples: operationHasExamples(operation),
        hasGeneratedExamples: operationHasGeneratedExamples(operation),
        hasRequestSchema: operationHasRequestSchema(operation),
        hasSuccessResponse: Object.keys(responses).some((statusCode) => /^2\d\d$/.test(statusCode)),
        missingResponseSchemas,
        hasSafeMethodRequestBody: methodMustNotHaveRequestBody(method.toUpperCase()) && Boolean(operation.requestBody),
        looksLikelyPublic,
        security: {
          effectiveSchemes: effectiveSecuritySchemes,
          inheritedRootSecurity,
          hasExplicitOperationSecurity: operationHasExplicitSecurity,
          hasExplicitPathSecurity: pathHasExplicitSecurity,
          isExplicitPublic,
          isProtected: Array.isArray(effectiveSecurity) && effectiveSecurity.length > 0,
        },
      });
    }
  }

  const operationsWithRequestInput = operations.filter((operation) => operation.hasRequestInput);
  const operationsWithoutRequestInput = operations.filter((operation) => !operation.hasRequestInput);
  const missingExamples = operations.filter((operation) => operation.hasRequestInput && !operation.hasExamples);
  const generatedExamples = operations.filter((operation) => operation.hasRequestInput && operation.hasExamples && operation.hasGeneratedExamples);
  const authoredExamples = operations.filter((operation) => operation.hasRequestInput && operation.hasExamples && !operation.hasGeneratedExamples);
  const missingRequestSchemas = operations.filter((operation) => !operation.hasRequestSchema);
  const operationsWithoutSuccessResponse = operations.filter((operation) => !operation.hasSuccessResponse);
  const operationsWithSafeMethodRequestBodies = operations.filter((operation) => operation.hasSafeMethodRequestBody);
  const responsesMissingSchemas = operations.flatMap((operation) =>
    operation.missingResponseSchemas.map((statusCode) => ({
      method: operation.method,
      path: operation.path,
      statusCode,
      operationId: operation.operationId,
      summary: operation.summary,
    }))
  );
  const rootSecuritySchemes = extractSecuritySchemeNames(rootSecurity);
  const explicitlyPublicOperations = operations.filter((operation) => operation.security.isExplicitPublic);
  const explicitlyProtectedOperations = operations.filter((operation) =>
    !operation.security.inheritedRootSecurity && operation.security.isProtected
  );
  const operationsWithoutExplicitSecurity = operations.filter((operation) =>
    !operation.security.hasExplicitOperationSecurity && !operation.security.hasExplicitPathSecurity
  );
  const inheritedSecurityOperations = operations.filter((operation) => operation.security.inheritedRootSecurity);
  const likelyPublicOperationsWithInheritedSecurity = inheritedSecurityOperations.filter((operation) => operation.looksLikelyPublic);
  const globalSecurityIncludesTestBypass = rootSecuritySchemes.includes('ContractTestBypass');
  const globalSecurityIncludesServiceKey = rootSecuritySchemes.includes('ServiceKey');

  return {
    generatedAt: new Date().toISOString(),
    openApiPath,
    totalOperations: operations.length,
    requestExampleCoverage: {
      operationsWithRequestInput: operationsWithRequestInput.length,
      operationsWithoutRequestInput: operationsWithoutRequestInput.length,
      withExamples: operationsWithRequestInput.length - missingExamples.length,
      authoredExamples: authoredExamples.length,
      generatedExamples: generatedExamples.length,
      missingExamples: missingExamples.length,
      operations: missingExamples,
      noInputOperations: operationsWithoutRequestInput,
    },
    requestSchemaCoverage: {
      missingSchemas: missingRequestSchemas.length,
      operations: missingRequestSchemas,
    },
    responseCoverage: {
      operationsWithoutSuccessResponse: operationsWithoutSuccessResponse.length,
      operationsWithoutSuccessResponseList: operationsWithoutSuccessResponse,
      responsesMissingSchemas: responsesMissingSchemas.length,
      responsesMissingSchemasList: responsesMissingSchemas,
      safeMethodRequestBodies: operationsWithSafeMethodRequestBodies.length,
      safeMethodRequestBodiesList: operationsWithSafeMethodRequestBodies,
    },
    authCoverage: {
      rootSecuritySchemes,
      explicitlyPublicOperations: explicitlyPublicOperations.length,
      explicitlyProtectedOperations: explicitlyProtectedOperations.length,
      operationsWithoutExplicitSecurity: operationsWithoutExplicitSecurity.length,
      operationsWithoutExplicitSecurityList: operationsWithoutExplicitSecurity,
      inheritedSecurityOperations: inheritedSecurityOperations.length,
      likelyPublicOperationsWithInheritedSecurity: likelyPublicOperationsWithInheritedSecurity.length,
      likelyPublicOperationsWithInheritedSecurityList: likelyPublicOperationsWithInheritedSecurity,
      globalSecurityIncludesTestBypass,
      globalSecurityIncludesServiceKey,
    },
    duplicateKeys,
  };
};

const formatOperation = (operation) => `${operation.method} ${operation.path}`;

const formatAuditSummary = (summary) => {
  const lines = [
    'OpenAPI Contract Audit',
    `- File: ${summary.openApiPath}`,
    `- Operations: ${summary.totalOperations}`,
    `- Operations with request input: ${summary.requestExampleCoverage.operationsWithRequestInput}`,
    `- Operations without request input: ${summary.requestExampleCoverage.operationsWithoutRequestInput}`,
    `- Input-bearing operations with request examples: ${summary.requestExampleCoverage.withExamples}`,
    `- Input-bearing operations with authored request examples: ${summary.requestExampleCoverage.authoredExamples}`,
    `- Input-bearing operations with generated request examples: ${summary.requestExampleCoverage.generatedExamples}`,
    `- Input-bearing operations missing request examples: ${summary.requestExampleCoverage.missingExamples}`,
    `- Operations missing request schemas: ${summary.requestSchemaCoverage.missingSchemas}`,
    `- Operations without any 2xx response: ${summary.responseCoverage.operationsWithoutSuccessResponse}`,
    `- Responses missing schemas: ${summary.responseCoverage.responsesMissingSchemas}`,
    `- Safe-method operations with request bodies: ${summary.responseCoverage.safeMethodRequestBodies}`,
    `- Root security schemes: ${summary.authCoverage.rootSecuritySchemes.length ? summary.authCoverage.rootSecuritySchemes.join(', ') : '(none)'}`,
    `- Operations with explicit public security: ${summary.authCoverage.explicitlyPublicOperations}`,
    `- Operations with explicit security requirements: ${summary.authCoverage.explicitlyProtectedOperations}`,
    `- Operations without explicit security declarations: ${summary.authCoverage.operationsWithoutExplicitSecurity}`,
    `- Operations inheriting root security: ${summary.authCoverage.inheritedSecurityOperations}`,
    `- Likely-public operations inheriting root security: ${summary.authCoverage.likelyPublicOperationsWithInheritedSecurity}`,
    `- Global security includes contract-test bypass: ${summary.authCoverage.globalSecurityIncludesTestBypass ? 'yes' : 'no'}`,
    `- Global security includes service key auth: ${summary.authCoverage.globalSecurityIncludesServiceKey ? 'yes' : 'no'}`,
    `- Duplicate keys: ${summary.duplicateKeys.length}`,
  ];

  if (summary.requestExampleCoverage.operations.length) {
    lines.push('');
    lines.push('Input-bearing operations missing request examples (first 50):');
    for (const operation of summary.requestExampleCoverage.operations.slice(0, 50)) {
      lines.push(`- ${formatOperation(operation)}`);
    }
  }

  if (summary.responseCoverage.operationsWithoutSuccessResponseList.length) {
    lines.push('');
    lines.push('Operations without a documented 2xx response:');
    for (const operation of summary.responseCoverage.operationsWithoutSuccessResponseList) {
      lines.push(`- ${formatOperation(operation)}`);
    }
  }

  if (summary.responseCoverage.safeMethodRequestBodiesList.length) {
    lines.push('');
    lines.push('Safe-method operations with request bodies:');
    for (const operation of summary.responseCoverage.safeMethodRequestBodiesList) {
      lines.push(`- ${formatOperation(operation)}`);
    }
  }

  if (summary.duplicateKeys.length) {
    lines.push('');
    lines.push('Duplicate YAML keys:');
    for (const issue of summary.duplicateKeys) {
      lines.push(`- line ${issue.line}, col ${issue.column}: ${issue.message.split('\n')[0]}`);
    }
  }

  if (summary.authCoverage.likelyPublicOperationsWithInheritedSecurityList.length) {
    lines.push('');
    lines.push('Likely-public operations inheriting root security (first 50):');
    for (const operation of summary.authCoverage.likelyPublicOperationsWithInheritedSecurityList.slice(0, 50)) {
      lines.push(`- ${formatOperation(operation)}`);
    }
  }

  if (summary.authCoverage.operationsWithoutExplicitSecurityList.length) {
    lines.push('');
    lines.push('Operations without explicit security declarations (first 50):');
    for (const operation of summary.authCoverage.operationsWithoutExplicitSecurityList.slice(0, 50)) {
      lines.push(`- ${formatOperation(operation)}`);
    }
  }

  return lines.join('\n');
};

const writeAuditReports = (summary, reportsDir) => {
  ensureDir(reportsDir);

  const jsonPath = path.join(reportsDir, 'openapi-contract-audit.json');
  const textPath = path.join(reportsDir, 'openapi-contract-audit.txt');

  fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2));
  fs.writeFileSync(textPath, `${formatAuditSummary(summary)}\n`);

  return { jsonPath, textPath };
};

if (require.main === module) {
  const root = process.cwd();
  const openApiPath = path.resolve(process.argv[2] || path.join(root, 'openapi.yaml'));
  const reportsDir = path.resolve(process.argv[3] || path.join(root, 'tests', 'contract', 'reports'));

  const summary = inspectOpenApi(openApiPath);
  const reportPaths = writeAuditReports(summary, reportsDir);

  console.log(formatAuditSummary(summary));
  console.log(`\nReports:\n- JSON: ${reportPaths.jsonPath}\n- Text: ${reportPaths.textPath}`);

  const shouldFail =
    (toBool(process.env.OPENAPI_AUDIT_FAIL_ON_DUPLICATES, true) && summary.duplicateKeys.length > 0)
    || (toBool(process.env.OPENAPI_AUDIT_FAIL_ON_MISSING_REQUEST_SCHEMAS, true) && summary.requestSchemaCoverage.missingSchemas > 0)
    || (toBool(process.env.OPENAPI_AUDIT_FAIL_ON_MISSING_RESPONSE_SCHEMAS, true) && summary.responseCoverage.responsesMissingSchemas > 0)
    || (toBool(process.env.OPENAPI_AUDIT_FAIL_ON_SAFE_METHOD_REQUEST_BODIES, true) && summary.responseCoverage.safeMethodRequestBodies > 0)
    || (toBool(process.env.OPENAPI_AUDIT_FAIL_ON_MISSING_SUCCESS_RESPONSE, false) && summary.responseCoverage.operationsWithoutSuccessResponse > 0)
    || (toBool(process.env.OPENAPI_AUDIT_FAIL_ON_MISSING_EXAMPLES, false) && summary.requestExampleCoverage.missingExamples > 0)
    || (toBool(process.env.OPENAPI_AUDIT_FAIL_ON_GLOBAL_TEST_AUTH, true) && (
      summary.authCoverage.globalSecurityIncludesTestBypass
      || summary.authCoverage.globalSecurityIncludesServiceKey
    ))
    || (toBool(process.env.OPENAPI_AUDIT_FAIL_ON_MISSING_EXPLICIT_SECURITY, true)
      && summary.authCoverage.operationsWithoutExplicitSecurity > 0)
    || (toBool(process.env.OPENAPI_AUDIT_FAIL_ON_PUBLIC_SECURITY_MISMATCH, true)
      && summary.authCoverage.likelyPublicOperationsWithInheritedSecurity > 0);

  if (shouldFail) {
    process.exit(1);
  }
}

module.exports = {
  inspectOpenApi,
  writeAuditReports,
  formatAuditSummary,
};
