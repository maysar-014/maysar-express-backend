const fs = require('fs');
const path = require('path');

const NON_404_CODES = [200, 201, 202, 204, 400, 401, 403, 404, 409, 422, 429, 500, 501, 503];
const SUPPORTED_ROLES = ['buyer', 'seller', 'courier', 'supplier', 'enabler', 'system'];
const KYC_REQUIRED_ROLES = new Set(['seller', 'courier', 'supplier', 'enabler']);

function body(payload) {
  return {
    mode: 'raw',
    raw: JSON.stringify(payload, null, 2),
    options: { raw: { language: 'json' } }
  };
}

function roleEmailInitLines() {
  return SUPPORTED_ROLES.flatMap((role) => [
    `const roleEmail_${role} = pm.collectionVariables.get("role_${role}_email") || "";`,
    `if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(roleEmail_${role})) {`,
    `  pm.collectionVariables.set("role_${role}_email", "${role}." + pm.collectionVariables.get("run_id") + "@example.com");`,
    '}'
  ]);
}

function buildRoleOperations(role, roleUserVar, roleTokenVar) {
  const roleUpper = role.toUpperCase();
  const authVar = roleTokenVar;
  const validPricingPayload = {
    cost: 50000,
    desired_margin: 1.4,
    category_multiplier: 1.6,
    pricing_mode: 'BALANCED'
  };

  return [
    { name: `[PASS] ${roleUpper} Verify Session`, method: 'GET', url: '{{platform_base_url}}/api/auth/verify', expected: [200, 400, 401, 403, 500], routeMustExist: true, authVar },

    { name: `[PASS] ${roleUpper} Catalog Health`, method: 'GET', url: '{{platform_base_url}}/api/catalog/health', expected: [200], routeMustExist: true, authVar },
    { name: `[PASS] ${roleUpper} Catalog Pricing Calculate`, method: 'POST', url: '{{platform_base_url}}/api/catalog/pricing/calculate', expected: [200, 400, 401, 403, 422, 500], routeMustExist: true, authVar, body: body(validPricingPayload) },

    { name: `[PASS] ${roleUpper} Order List`, method: 'GET', url: `{{platform_base_url}}/api/order/orders?buyerId={{${roleUserVar}}}`, expected: [200, 400, 401, 403, 500, 503], routeMustExist: true, authVar },
    { name: `[PASS] ${roleUpper} Order Create`, method: 'POST', url: '{{platform_base_url}}/api/order/orders', expected: [200, 201, 400, 401, 403, 422, 500, 503], routeMustExist: true, authVar, body: body({ buyerId: '{{user_id}}', sellerId: '{{seller_id}}', items: [{ productId: 'prod-1', quantity: 1, price: { amount: 1000, currency: 'TZS' }, weight: 1 }], currency: 'TZS', deliveryAddress: { street: 'A', city: 'B', postalCode: '11101', country: 'TZ' }, paymentMethod: 'COD' }) },
    { name: `[PASS] ${roleUpper} Order Analytics`, method: 'GET', url: '{{platform_base_url}}/api/order/orders/analytics/stats', expected: [200, 401, 403, 500, 503], routeMustExist: true, authVar },

    { name: `[PASS] ${roleUpper} Notification Health`, method: 'GET', url: '{{platform_base_url}}/api/notification/health', expected: [200], routeMustExist: true, authVar },
    { name: `[PASS] ${roleUpper} Notification SMS Statistics`, method: 'GET', url: '{{platform_base_url}}/api/notification/sms/statistics', expected: [200, 400, 401, 403, 500], routeMustExist: true, authVar },
    { name: `[PASS] ${roleUpper} Notification SMS Send`, method: 'POST', url: '{{platform_base_url}}/api/notification/sms/send', expected: [200, 201, 400, 401, 403, 422, 500], routeMustExist: true, authVar, body: body({ phoneNumber: '+255700000000', message: `Role ${roleUpper} flow message` }) },

    { name: `[PASS] ${roleUpper} Enabler Hub Products`, method: 'GET', url: '{{platform_base_url}}/api/enabler/hub/products', expected: [200, 401, 403, 500], routeMustExist: true, authVar },
    { name: `[PASS] ${roleUpper} Enabler Register Reachability`, method: 'POST', url: '{{platform_base_url}}/api/enabler/enablers/register', expected: [200, 201, 400, 401, 403, 422, 500], routeMustExist: true, authVar, body: body({ userId: '{{user_id}}', businessId: '{{business_id}}', displayName: `QA ${roleUpper} {{run_id}}` }) },

    { name: `[PASS] ${roleUpper} Maps Health`, method: 'GET', url: '{{platform_base_url}}/api/maps/health', expected: [200, 503], routeMustExist: true, authVar },
    { name: `[PASS] ${roleUpper} Maps Ready`, method: 'GET', url: '{{platform_base_url}}/api/maps/health/ready', expected: [200, 503], routeMustExist: true, authVar },

    { name: `[PASS] ${roleUpper} Compliance Verify Document`, method: 'POST', url: '{{platform_base_url}}/api/compliance/api/compliance/verify-document', expected: [200, 400, 401, 403, 422, 500], routeMustExist: true, authVar, body: body({ userId: `{{${roleUserVar}}}`, documentType: 'passport', documentUrl: 'https://example.com/doc.pdf' }) },
    { name: `[PASS] ${roleUpper} Compliance KYC Status`, method: 'GET', url: `{{platform_base_url}}/api/compliance/api/compliance/kyc-status/{{${roleUserVar}}}`, expected: [200, 400, 401, 403, 404, 422, 500], routeMustExist: true, authVar },

    { name: `[PASS] ${roleUpper} Production Dashboard`, method: 'GET', url: '{{platform_base_url}}/api/production/dashboard', expected: [200, 401, 403, 500], routeMustExist: true, authVar },
    { name: `[PASS] ${roleUpper} Support Tickets List`, method: 'GET', url: '{{platform_base_url}}/api/support/tickets', expected: [200, 401, 403, 500], routeMustExist: true, authVar },
    { name: `[PASS] ${roleUpper} Support Ticket Create`, method: 'POST', url: '{{platform_base_url}}/api/support/tickets', expected: [200, 201, 400, 401, 403, 422, 500], routeMustExist: true, authVar, body: body({ subject: `Role ${roleUpper} support`, description: 'Role matrix validation flow' }) }
  ];
}

function buildRoleKycVerificationSteps(role, roleUpper, roleUserVar) {
  if (!KYC_REQUIRED_ROLES.has(role)) {
    return [];
  }

  return [
    {
      name: `[PASS] ${roleUpper} KYC Submission`,
      method: 'POST',
      url: '{{platform_base_url}}/api/compliance/api/compliance/verify-document',
      expected: [200],
      routeMustExist: true,
      body: body({
        userId: `{{${roleUserVar}}}`,
        documentType: 'passport',
        documentUrl: 'https://example.com/doc.pdf'
      })
    },
    {
      name: `[PASS] ${roleUpper} KYC Admin Approval`,
      method: 'POST',
      url: '{{platform_base_url}}/api/compliance/api/compliance/manual-review',
      expected: [200],
      routeMustExist: true,
      body: body({
        userId: `{{${roleUserVar}}}`,
        decision: 'approved',
        reviewerId: '{{kyc_admin_id}}'
      })
    },
    {
      name: `[PASS] ${roleUpper} KYC Verified Check`,
      method: 'GET',
      url: `{{platform_base_url}}/api/compliance/api/compliance/kyc-status/{{${roleUserVar}}}`,
      expected: [200],
      routeMustExist: true,
      capture: [{ var: `role_${role}_kyc_status`, paths: ['data.verificationStatus'] }],
      assertions: [
        'pm.test("KYC is approved before role operations", function () {',
        '  pm.expect(json && json.success).to.eql(true);',
        '  const status = String((json && json.data && json.data.verificationStatus) || "").toLowerCase();',
        '  pm.expect(status).to.eql("approved");',
        '});'
      ]
    }
  ];
}

function buildRoleJourneyItems(role) {
  const roleUpper = role.toUpperCase();
  const roleEmailVar = `role_${role}_email`;
  const roleUserVar = `role_${role}_user_id`;
  const roleTokenVar = `role_${role}_token`;
  const roleKycSteps = buildRoleKycVerificationSteps(role, roleUpper, roleUserVar);

  return [
    {
      name: `[PASS] ${roleUpper} CSRF Bootstrap`,
      method: 'GET',
      url: '{{platform_base_url}}/health',
      expected: [200, 503],
      routeMustExist: true,
      headers: [{ key: 'X-Disable-Auto-Auth', value: 'true' }]
    },
    {
      name: `[PASS] ${roleUpper} Register`,
      method: 'POST',
      url: '{{platform_base_url}}/api/auth/register',
      expected: [200, 400, 409, 422, 429, 500],
      routeMustExist: true,
      headers: [{ key: 'X-Disable-Auto-Auth', value: 'true' }],
      body: body({ email: `{{${roleEmailVar}}}`, role, profile: { name: `${roleUpper} User {{run_id}}` }, password: '{{auth_password}}' }),
      capture: [
        { var: roleUserVar, paths: ['userId', 'data.userId'] },
        { var: 'user_id', paths: ['userId', 'data.userId'] }
      ]
    },
    {
      name: `[PASS] ${roleUpper} Login`,
      method: 'POST',
      url: '{{platform_base_url}}/api/auth/login',
      expected: [200, 400, 401, 403, 429, 500],
      routeMustExist: true,
      headers: [{ key: 'X-Disable-Auto-Auth', value: 'true' }],
      body: body({ email: `{{${roleEmailVar}}}`, password: '{{auth_password}}' }),
      assertions: [
        `if (pm.response.code === 429) {`,
        `  pm.test("Existing role token is available when login is rate limited", function () {`,
        `    const token = pm.collectionVariables.get("${roleTokenVar}") || "";`,
        `    pm.expect(token.length).to.be.greaterThan(0);`,
        `  });`,
        `}`
      ],
      capture: [
        { var: roleTokenVar, paths: ['token', 'accessToken', 'jwt', 'data.accessToken', 'data.token'] },
        { var: 'jwt_token', paths: ['token', 'accessToken', 'jwt', 'data.accessToken', 'data.token'] },
        { var: roleUserVar, paths: ['user.id', 'userId', 'data.user.id', 'data.userId'] },
        { var: 'user_id', paths: ['user.id', 'userId', 'data.user.id', 'data.userId'] }
      ]
    },
    ...roleKycSteps,
    ...buildRoleOperations(role, roleUserVar, roleTokenVar),
    {
      name: `[PASS] ${roleUpper} Logout`,
      method: 'POST',
      url: '{{platform_base_url}}/api/auth/logout',
      expected: [200, 400, 401, 403, 500],
      routeMustExist: true,
      authVar: roleTokenVar
    }
  ];
}

function makeTests(expected, options = {}) {
  const lines = [
    `const expected = ${JSON.stringify(expected)};`,
    'pm.test("Status code is expected", function () {',
    '  pm.expect(expected).to.include(pm.response.code);',
    '});',
    'pm.test("Response time under threshold", function () {',
    '  const max = Number(pm.collectionVariables.get("max_response_time_ms") || "12000");',
    '  pm.expect(pm.response.responseTime).to.be.below(max);',
    '});',
    'let json = null;',
    'try { json = pm.response.json(); } catch (e) {}',
    'pm.collectionVariables.set("last_status_code", String(pm.response.code));',
    'pm.collectionVariables.set("last_request_name", pm.info.requestName);',
    'const csrfFromResponse = pm.cookies.get("csrf-token");',
    'if (csrfFromResponse) {',
    '  pm.collectionVariables.set("csrf_token", csrfFromResponse);',
    '}'
  ];

  if (options.routeMustExist) {
    lines.push('pm.test("Route is mounted (not 404)", function () {');
    lines.push('  pm.expect(pm.response.code).to.not.equal(404);');
    lines.push('});');
  }

  if (options.assertions && options.assertions.length > 0) {
    lines.push(...options.assertions);
  }

  if (options.capture && options.capture.length > 0) {
    lines.push('if (json) {');
    for (const cap of options.capture) {
      lines.push(`  {`);
      lines.push(`    const paths = ${JSON.stringify(cap.paths)};`);
      lines.push('    let val;');
      lines.push('    for (const p of paths) {');
      lines.push(
        '      const candidate = p.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), json);'
      );
      lines.push('      if (candidate !== undefined && candidate !== null && String(candidate).length > 0) { val = candidate; break; }');
      lines.push('    }');
      lines.push(`    if (val !== undefined) { pm.collectionVariables.set(${JSON.stringify(cap.var)}, String(val)); }`);
      lines.push('  }');
    }
    lines.push('}');
  }

  return lines;
}

function request(item) {
  const req = {
    method: item.method,
    header: [{ key: 'Accept', value: 'application/json' }, ...(item.headers || [])],
    url: item.url,
    description: item.description || ''
  };

  if (item.body) {
    req.body = item.body;
    if (!req.header.some((h) => h.key.toLowerCase() === 'content-type')) {
      req.header.push({ key: 'Content-Type', value: 'application/json' });
    }
  }

  if (item.authVar) {
    req.header.push({ key: 'Authorization', value: `Bearer {{${item.authVar}}}` });
  }

  return {
    name: item.name,
    event: [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: makeTests(item.expected, {
            routeMustExist: Boolean(item.routeMustExist),
            capture: item.capture || [],
            assertions: item.assertions || []
          })
        }
      }
    ],
    request: req,
    response: []
  };
}

function folder(name, items) {
  return { name, item: items.map(request) };
}

const collection = {
  info: {
    name: 'Maysar Monolith E2E Flow Collection (Port 3000)',
    description: [
      'Single-entry-point collection for the modular monolith on port 3000.',
      '',
      'Design:',
      '- Role-journey matrix per supported role: register -> login -> role operations -> logout.',
      '- PASS checks for mounted module routes (route must exist, not 404).',
      '- FAIL checks for validation/auth/business errors.',
      '- GAP checks for currently unmounted modules (expected 404).',
      '- Note: Postman Runner marks any non-2xx HTTP response with a red request icon, even when assertions intentionally expect that status.',
      '',
      'Run order:',
      '00 -> 01 -> 02 -> 03 -> 04 -> 05 -> 06 -> 07 -> 08',
      '',
      'Important:',
      '- Base URL is strictly {{platform_base_url}} only.',
      '- Monolith route model is /api/{service-name-without-"-service"}.'
    ].join('\n'),
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    version: '1.0.0'
  },
  variable: [
    { key: 'platform_base_url', value: 'http://localhost:3000' },
    { key: 'max_response_time_ms', value: '12000' },
    { key: 'run_id', value: '' },
    { key: 'correlation_id', value: '' },
    { key: 'csrf_token', value: '' },
    { key: 'jwt_token', value: '' },
    { key: 'auth_email', value: 'test.user@example.com' },
    { key: 'auth_password', value: 'SecurePassword123!' },
    { key: 'kyc_admin_id', value: '00000000-0000-4000-8000-000000000001' },
    ...SUPPORTED_ROLES.flatMap((role) => ([
      { key: `role_${role}_email`, value: '' },
      { key: `role_${role}_token`, value: '' },
      { key: `role_${role}_user_id`, value: '' },
      { key: `role_${role}_kyc_status`, value: '' }
    ])),
    { key: 'test_password', value: 'SecurePassword123!' },
    { key: 'test_email', value: '' },
    { key: 'user_id', value: '' },
    { key: 'business_id', value: '' },
    { key: 'order_id', value: '' },
    { key: 'payment_id', value: '' },
    { key: 'session_id', value: 'sess-missing' },
    { key: 'delivery_id', value: '' },
    { key: 'training_id', value: '' },
    { key: 'template_id', value: '' },
    { key: 'notification_id', value: '' },
    { key: 'enabler_id', value: 'enabler-001' },
    { key: 'seller_id', value: 'seller-001' },
    { key: 'missing_id', value: '00000000-0000-0000-0000-000000000000' }
  ],
  event: [
    {
      listen: 'prerequest',
      script: {
        type: 'text/javascript',
        exec: [
          'if (!pm.collectionVariables.get("run_id")) {',
          '  pm.collectionVariables.set("run_id", String(Date.now()));',
          '}',
          'if (!pm.collectionVariables.get("test_email")) {',
          '  pm.collectionVariables.set("test_email", "qa." + pm.collectionVariables.get("run_id") + "@example.com");',
          '}',
          'if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(pm.collectionVariables.get("test_email") || "")) {',
          '  pm.collectionVariables.set("test_email", "qa." + pm.collectionVariables.get("run_id") + "@example.com");',
          '}',
          'if (!pm.collectionVariables.get("auth_email") || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(pm.collectionVariables.get("auth_email") || "")) {',
          '  pm.collectionVariables.set("auth_email", pm.collectionVariables.get("test_email"));',
          '}',
          ...roleEmailInitLines(),
          'const rand = Math.floor(Math.random() * 1000000).toString(16);',
          'const correlationId = Date.now() + "-" + rand;',
          'pm.collectionVariables.set("correlation_id", correlationId);',
          'pm.request.headers.upsert({ key: "X-Correlation-Id", value: correlationId });',
          '',
          'const disableAutoAuth = pm.request.headers.get("X-Disable-Auto-Auth") === "true";',
          'pm.request.headers.remove("X-Disable-Auto-Auth");',
          'if (!disableAutoAuth) {',
          '  const token = pm.collectionVariables.get("jwt_token");',
          '  if (token && !pm.request.headers.has("Authorization")) {',
          '    pm.request.headers.upsert({ key: "Authorization", value: "Bearer " + token });',
          '  }',
          '}',
          '',
          'const disableAutoCsrf = pm.request.headers.get("X-Disable-Auto-CSRF") === "true";',
          'pm.request.headers.remove("X-Disable-Auto-CSRF");',
          'if (!disableAutoCsrf) {',
          '  const method = String(pm.request.method || "GET").toUpperCase();',
          '  if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && !pm.request.headers.has("X-CSRF-Token")) {',
          '    let csrf = pm.collectionVariables.get("csrf_token") || pm.cookies.get("csrf-token");',
          '    if (!csrf) {',
          '      csrf = "csrf-" + pm.collectionVariables.get("run_id") + "-" + rand;',
          '    }',
          '    pm.request.headers.upsert({ key: "X-CSRF-Token", value: csrf });',
          '    if (!pm.request.headers.has("Cookie")) {',
          '      pm.request.headers.upsert({ key: "Cookie", value: "csrf-token=" + csrf });',
          '    }',
          '    pm.collectionVariables.set("csrf_token", csrf);',
          '  }',
          '}',
          '',
          'const method = String(pm.request.method || "GET").toUpperCase();',
          'if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && !pm.request.headers.has("Idempotency-Key")) {',
          '  pm.request.headers.upsert({ key: "Idempotency-Key", value: pm.collectionVariables.get("run_id") + "-" + rand });',
          '}'
        ]
      }
    }
  ],
  item: []
};

collection.item.push(
  folder('00 - Core Entry Point', [
    { name: '[PASS] Global Health', method: 'GET', url: '{{platform_base_url}}/health', expected: [200, 503], routeMustExist: true },
    { name: '[PASS] Global Readiness', method: 'GET', url: '{{platform_base_url}}/ready', expected: [200, 503], routeMustExist: true },
    { name: '[NEGATIVE] Unknown Global Route', method: 'GET', url: '{{platform_base_url}}/__missing__', expected: [404] }
  ])
);

collection.item.push(
  {
    name: '01 - Role Journeys (Register -> Login -> Operate -> Logout)',
    item: SUPPORTED_ROLES.map((role) =>
      folder(`${role.toUpperCase()} - Full Supported Operations`, buildRoleJourneyItems(role))
    )
  }
);

collection.item.push(
  folder('02 - Authentication (Complete Endpoint Coverage)', [
    {
      name: '[PASS] Auth CSRF Bootstrap',
      method: 'GET',
      url: '{{platform_base_url}}/health',
      expected: [200, 503],
      routeMustExist: true
    },
    {
      name: '[PASS] Auth Register',
      method: 'POST',
      url: '{{platform_base_url}}/api/auth/register',
      expected: [200, 400, 409, 422, 429, 500],
      routeMustExist: true,
      body: body({ email: '{{auth_email}}', role: 'buyer', profile: { name: 'Postman User {{run_id}}' }, password: '{{auth_password}}' }),
      capture: [{ var: 'user_id', paths: ['userId', 'data.userId'] }]
    },
    {
      name: '[CHECK] Auth Login (Capture Token When Available)',
      method: 'POST',
      url: '{{platform_base_url}}/api/auth/login',
      expected: [200, 400, 401, 403, 429, 500],
      routeMustExist: true,
      body: body({ email: '{{auth_email}}', password: '{{auth_password}}' }),
      capture: [
        { var: 'jwt_token', paths: ['token', 'accessToken', 'jwt', 'data.accessToken', 'data.token'] },
        { var: 'user_id', paths: ['user.id', 'userId', 'data.user.id', 'data.userId'] }
      ]
    },
    { name: '[PASS] Auth Verify Session', method: 'GET', url: '{{platform_base_url}}/api/auth/verify', expected: [200, 400, 401, 403, 500], routeMustExist: true },
    { name: '[GAP] Auth Refresh Token (Stub/Not Implemented)', method: 'POST', url: '{{platform_base_url}}/api/auth/refresh', expected: [200, 400, 401, 403, 500, 501], routeMustExist: true, body: body({ refreshToken: 'refresh-token-placeholder' }) },
    { name: '[PASS] Auth Logout', method: 'POST', url: '{{platform_base_url}}/api/auth/logout', expected: [200, 400, 401, 403, 500], routeMustExist: true },
    { name: '[GAP] Auth Forgot Password (Stub/Not Implemented)', method: 'POST', url: '{{platform_base_url}}/api/auth/forgot-password', expected: [200, 400, 401, 403, 422, 429, 500, 501], routeMustExist: true, body: body({ email: '{{auth_email}}' }) },
    { name: '[GAP] Auth Reset Password Route Reachability (Stub/Not Implemented)', method: 'POST', url: '{{platform_base_url}}/api/auth/reset-password', expected: [400, 401, 403, 422, 500, 501], routeMustExist: true, body: body({ token: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', newPassword: '{{auth_password}}', confirmPassword: '{{auth_password}}' }) },
    { name: '[GAP] Auth 2FA Enable Route Reachability (Stub/Not Implemented)', method: 'POST', url: '{{platform_base_url}}/api/auth/2fa/enable', expected: [400, 401, 403, 422, 500, 501], routeMustExist: true, body: body({ password: '{{auth_password}}', totpCode: '123456' }) },
    { name: '[GAP] Auth 2FA Disable Route Reachability (Stub/Not Implemented)', method: 'POST', url: '{{platform_base_url}}/api/auth/2fa/disable', expected: [400, 401, 403, 422, 500, 501], routeMustExist: true, body: body({ password: '{{auth_password}}' }) },
    { name: '[GAP] Auth 2FA Verify Route Reachability (Stub/Not Implemented)', method: 'POST', url: '{{platform_base_url}}/api/auth/2fa/verify', expected: [400, 401, 403, 422, 500, 501], routeMustExist: true, body: body({ secret: 'base32secret3232', totpCode: '123456' }) },
    { name: '[PASS] Auth Report Suspicious Activity', method: 'POST', url: '{{platform_base_url}}/api/auth/report-suspicious', expected: [200, 400, 401, 403, 422, 500], routeMustExist: true, body: body({ activity: 'collection-e2e-check', details: { runId: '{{run_id}}' } }) },
    { name: '[PASS] Auth Stats Route Reachability', method: 'GET', url: '{{platform_base_url}}/api/auth/stats', expected: [200, 401, 403, 500], routeMustExist: true },

    { name: '[PASS] Auth 2FA Setup Route Reachability', method: 'POST', url: '{{platform_base_url}}/api/auth/2fa/setup', expected: [200, 400, 401, 403, 500], routeMustExist: true, body: body({ userId: '{{user_id}}', email: '{{auth_email}}', method: 'totp', deviceName: 'Postman Runner' }) },
    { name: '[PASS] Auth 2FA Verify Setup Route Reachability', method: 'POST', url: '{{platform_base_url}}/api/auth/2fa/verify-setup', expected: [200, 400, 401, 403, 500], routeMustExist: true, body: body({ userId: '{{user_id}}', code: '123456' }) },
    { name: '[PASS] Auth 2FA Backup Code Verification', method: 'POST', url: '{{platform_base_url}}/api/auth/2fa/backup', expected: [200, 400, 401, 403, 500], routeMustExist: true, body: body({ userId: '{{user_id}}', code: 'BACKUP-CODE-1' }) },
    { name: '[PASS] Auth 2FA Backup Code Regeneration', method: 'POST', url: '{{platform_base_url}}/api/auth/2fa/backup-codes/regenerate', expected: [200, 400, 401, 403, 500], routeMustExist: true, body: body({ userId: '{{user_id}}' }) },
    { name: '[PASS] Auth 2FA Status Route Reachability', method: 'GET', url: '{{platform_base_url}}/api/auth/2fa/status', expected: [200, 400, 401, 403, 500], routeMustExist: true },

    {
      name: '[PASS] Auth Session Create',
      method: 'POST',
      url: '{{platform_base_url}}/api/auth/sessions',
      expected: [201, 400, 422, 500],
      routeMustExist: true,
      body: body({ userId: '{{user_id}}', role: 'USER', deviceInfo: 'Postman Runner', ipAddress: '127.0.0.1' }),
      capture: [{ var: 'session_id', paths: ['sessionId', 'data.sessionId'] }]
    },
    { name: '[PASS] Auth Session List', method: 'GET', url: '{{platform_base_url}}/api/auth/sessions?userId={{user_id}}', expected: [200, 400, 500], routeMustExist: true },
    { name: '[PASS] Auth Session Delete', method: 'DELETE', url: '{{platform_base_url}}/api/auth/sessions/{{session_id}}', expected: [204, 400, 404, 500], routeMustExist: true }
  ])
);

collection.item.push(
  folder('03 - Mounted Modules (Pass + Fail)', [

    { name: '[PASS] Catalog Health', method: 'GET', url: '{{platform_base_url}}/api/catalog/health', expected: [200], routeMustExist: true },
    { name: '[PASS] Catalog Pricing Calculate Route Reachability', method: 'POST', url: '{{platform_base_url}}/api/catalog/pricing/calculate', expected: [200, 400, 422, 500], routeMustExist: true, body: body({ cost: 50000, desired_margin: 1.4, category_multiplier: 1.6, pricing_mode: 'BALANCED' }) },
    { name: '[FAIL] Catalog Pricing Invalid Payload', method: 'POST', url: '{{platform_base_url}}/api/catalog/pricing/calculate', expected: [400, 422, 500], body: body({ cost: 0, desired_margin: -1, category_multiplier: -1, pricing_mode: 'BALANCED' }) },

    { name: '[PASS] Enabler Hub Products', method: 'GET', url: '{{platform_base_url}}/api/enabler/hub/products', expected: [200], routeMustExist: true },
    { name: '[PASS] Enabler Register Route Reachability', method: 'POST', url: '{{platform_base_url}}/api/enabler/enablers/register', expected: [200, 201, 400, 422, 500], routeMustExist: true, body: body({ userId: '{{user_id}}', businessId: '{{business_id}}', displayName: 'QA Enabler {{run_id}}' }) },
    { name: '[FAIL] Enabler Register Invalid', method: 'POST', url: '{{platform_base_url}}/api/enabler/enablers/register', expected: [400, 422, 500], body: body({ userId: '', businessId: '' }) },

    { name: '[PASS] Notification Health', method: 'GET', url: '{{platform_base_url}}/api/notification/health', expected: [200], routeMustExist: true },
    { name: '[PASS] Notification SMS Statistics Route Reachability', method: 'GET', url: '{{platform_base_url}}/api/notification/sms/statistics', expected: [200, 400, 500], routeMustExist: true },
    { name: '[FAIL] Notification SMS Send Invalid Phone', method: 'POST', url: '{{platform_base_url}}/api/notification/sms/send', expected: [400, 422, 500], body: body({ phoneNumber: '0700', message: '' }) },

    { name: '[PASS] Order List Route Reachability', method: 'GET', url: '{{platform_base_url}}/api/order/orders?buyerId=buyer-1', expected: [200, 400, 500, 503], routeMustExist: true },
    { name: '[PASS] Order Create Route Reachability', method: 'POST', url: '{{platform_base_url}}/api/order/orders', expected: [201, 200, 400, 422, 500], routeMustExist: true, body: body({ buyerId: 'buyer-1', sellerId: 'seller-1', items: [{ productId: 'prod-1', quantity: 1, price: { amount: 1000, currency: 'TZS' }, weight: 1 }], currency: 'TZS', deliveryAddress: { street: 'A', city: 'B', postalCode: '11101', country: 'TZ' }, paymentMethod: 'COD' }) },
    { name: '[FAIL] Order Create Invalid', method: 'POST', url: '{{platform_base_url}}/api/order/orders', expected: [400, 422, 500], body: body({ buyerId: '', items: [] }) },
    { name: '[PASS] Order Analytics Route Reachability', method: 'GET', url: '{{platform_base_url}}/api/order/orders/analytics/stats', expected: [200, 500], routeMustExist: true },

    { name: '[PASS] Maps Health', method: 'GET', url: '{{platform_base_url}}/api/maps/health', expected: [200, 503], routeMustExist: true },
    { name: '[PASS] Maps Ready', method: 'GET', url: '{{platform_base_url}}/api/maps/health/ready', expected: [200], routeMustExist: true },
    { name: '[PASS] Maps Live', method: 'GET', url: '{{platform_base_url}}/api/maps/health/live', expected: [200], routeMustExist: true },

    { name: '[PASS] Compliance Route Reachability (verify-document)', method: 'POST', url: '{{platform_base_url}}/api/compliance/api/compliance/verify-document', expected: [200, 400, 422, 500], routeMustExist: true, body: body({ userId: 'ckyc000000000000000000001', documentType: 'passport', documentUrl: 'https://example.com/doc.pdf' }) },
    { name: '[FAIL] Compliance Invalid Payload', method: 'POST', url: '{{platform_base_url}}/api/compliance/api/compliance/verify-document', expected: [422, 400], body: body({ userId: 'bad', documentType: 'invalid', documentUrl: 'x' }) },
    { name: '[PASS] Compliance KYC Status Route Reachability', method: 'GET', url: '{{platform_base_url}}/api/compliance/api/compliance/kyc-status/ckyc000000000000000000001', expected: [200, 404, 400, 500], routeMustExist: true },

    { name: '[PASS] Production Dashboard Route Reachability', method: 'GET', url: '{{platform_base_url}}/api/production/dashboard', expected: [200, 401, 403, 500], routeMustExist: true },
    { name: '[FAIL] Production Create Plan Invalid', method: 'POST', url: '{{platform_base_url}}/api/production/plans', expected: [400, 422, 500], body: body({}) },

    { name: '[PASS] Support Tickets Route Reachability', method: 'GET', url: '{{platform_base_url}}/api/support/tickets', expected: [401, 403, 500], routeMustExist: true, headers: [{ key: 'X-Disable-Auto-Auth', value: 'true' }] },
    { name: '[FAIL] Support Create Ticket Unauthorized', method: 'POST', url: '{{platform_base_url}}/api/support/tickets', expected: [401, 403], headers: [{ key: 'X-Disable-Auto-Auth', value: 'true' }], body: body({ subject: 'Need help', description: 'Ticket test' }) }
  ])
);

collection.item.push(
  folder('04 - Unmounted Module Gap Checks (Expected 404)', [
    { name: '[GAP] User Module Not Mounted', method: 'GET', url: '{{platform_base_url}}/api/user/health', expected: [404] },
    { name: '[GAP] Business Registry Module Not Mounted', method: 'GET', url: '{{platform_base_url}}/api/business-registry/health', expected: [404] },
    { name: '[GAP] Checkout Module Not Mounted', method: 'POST', url: '{{platform_base_url}}/api/checkout/initiate', expected: [404], body: body({ cartId: 'c1' }) },
    { name: '[GAP] Payment Module Not Mounted', method: 'POST', url: '{{platform_base_url}}/api/payment/payments', expected: [404], body: body({ orderId: 'o1', amount: 1000, method: 'CARD' }) },
    { name: '[GAP] Wallet Module Not Mounted', method: 'GET', url: '{{platform_base_url}}/api/wallet/wallets/u1/balance', expected: [404] },
    { name: '[GAP] Payout Module Not Mounted', method: 'POST', url: '{{platform_base_url}}/api/payout/payouts', expected: [404], body: body({ amount: 1000 }) },
    { name: '[GAP] Training Module Not Mounted', method: 'POST', url: '{{platform_base_url}}/api/training/api/v1/training/start', expected: [404], body: body({ learnerId: 'u1', learnerRole: 'buyer', moduleId: 'm1' }) },
    { name: '[GAP] Logistics Module Not Mounted', method: 'GET', url: '{{platform_base_url}}/api/logistics/api/v1/couriers', expected: [404] },
    { name: '[GAP] Community Module Not Mounted', method: 'GET', url: '{{platform_base_url}}/api/community/api/posts/published', expected: [404] },
    { name: '[GAP] Analytics Module Not Mounted', method: 'GET', url: '{{platform_base_url}}/api/analytics/health', expected: [404] },
    { name: '[GAP] Inventory Module Not Mounted', method: 'GET', url: '{{platform_base_url}}/api/inventory/health', expected: [404] },
    { name: '[GAP] Commission Module Not Mounted', method: 'GET', url: '{{platform_base_url}}/api/commission/health', expected: [404] }
  ])
);

collection.item.push(
  folder('05 - Auth and Security Failures', [
    { name: '[FAIL] Auth Verify Without Authorization Header', method: 'GET', url: '{{platform_base_url}}/api/auth/verify', expected: [400, 401, 403], headers: [{ key: 'X-Disable-Auto-Auth', value: 'true' }] },
    { name: '[FAIL] Auth Forgot Password Invalid Email', method: 'POST', url: '{{platform_base_url}}/api/auth/forgot-password', expected: [400, 422, 403], body: body({ email: 'bad-email' }) },
    { name: '[FAIL] Auth Reset Password Invalid Token', method: 'POST', url: '{{platform_base_url}}/api/auth/reset-password', expected: [400, 422, 403], body: body({ token: 'short', newPassword: '123', confirmPassword: '123' }) },
    { name: '[FAIL] Auth Report Suspicious Missing Fields', method: 'POST', url: '{{platform_base_url}}/api/auth/report-suspicious', expected: [400, 422], body: body({}) }
  ])
);

collection.item.push(
  folder('06 - Order and Catalog Failures', [
    { name: '[FAIL] Order Get Missing', method: 'GET', url: '{{platform_base_url}}/api/order/orders/{{missing_id}}', expected: [404, 500] },
    { name: '[FAIL] Order COD Validate Invalid Payload', method: 'POST', url: '{{platform_base_url}}/api/order/orders/cod/validate', expected: [400, 422, 500], body: body({}) },
    { name: '[FAIL] Order Resolve Dispute Missing Data', method: 'POST', url: '{{platform_base_url}}/api/order/orders/disputes/{{missing_id}}/resolve', expected: [400, 404, 500], body: body({}) },
    { name: '[FAIL] Catalog Unknown Route', method: 'GET', url: '{{platform_base_url}}/api/catalog/unknown', expected: [404] }
  ])
);

collection.item.push(
  folder('07 - Notification and Enabler Failures', [
    { name: '[FAIL] Notification SMS Retry Missing Message', method: 'POST', url: '{{platform_base_url}}/api/notification/sms/retry/', expected: [404] },
    { name: '[FAIL] Notification SMS Webhook Invalid Body', method: 'POST', url: '{{platform_base_url}}/api/notification/sms/webhook/africastalking', expected: [200, 400, 500], body: body({ invalid: true }), routeMustExist: true },
    { name: '[FAIL] Enabler Protected Route Unauthorized', method: 'POST', url: '{{platform_base_url}}/api/enabler/enablers/{{enabler_id}}/listings', expected: [401, 403, 500], headers: [{ key: 'X-Disable-Auto-Auth', value: 'true' }], body: body({ productId: 'p1' }) }
  ])
);

collection.item.push(
  folder('08 - Regression Sentinels', [
    { name: '[SENTINEL] Global Health Still Available', method: 'GET', url: '{{platform_base_url}}/health', expected: [200, 503], routeMustExist: true },
    { name: '[SENTINEL] Auth Route Still Mounted', method: 'GET', url: '{{platform_base_url}}/api/auth/verify', expected: NON_404_CODES, routeMustExist: true },
    { name: '[SENTINEL] Catalog Route Still Mounted', method: 'GET', url: '{{platform_base_url}}/api/catalog/health', expected: [200], routeMustExist: true },
    { name: '[SENTINEL] Notification Route Still Mounted', method: 'GET', url: '{{platform_base_url}}/api/notification/health', expected: [200], routeMustExist: true },
    { name: '[SENTINEL] Order Route Still Mounted', method: 'GET', url: '{{platform_base_url}}/api/order/orders?buyerId=buyer-1', expected: NON_404_CODES, routeMustExist: true }
  ])
);

const outDir = path.join(process.cwd(), 'postman');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'Maysar-Platform-E2E.postman_collection.json');
fs.writeFileSync(outPath, JSON.stringify(collection, null, 2), 'utf8');

const rootPath = path.join(process.cwd(), 'Maysar-Platform-E2E.postman_collection.json');
fs.writeFileSync(rootPath, JSON.stringify(collection, null, 2), 'utf8');

console.log(outPath);
console.log(rootPath);
