// scripts/verification/http-client.mjs

export class FlowTimeoutError extends Error {
  constructor(method, path, timeoutMs) {
    super(`Request timed out after ${timeoutMs}ms: ${method} ${path}`);
    this.name = 'FlowTimeoutError';
    this.code = 'FLOW_TIMEOUT';
  }
}

export class RouteNotFoundError extends Error {
  constructor(method, path) {
    super(`Route not found (404): ${method} ${path}`);
    this.name = 'RouteNotFoundError';
    this.status = 404;
  }
}

export class ServerError extends Error {
  constructor(method, path, status, body) {
    super(`Server error (${status}): ${method} ${path}`);
    this.name = 'ServerError';
    this.status = status;
    this.body = body;
  }
}

export class FlowError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'FlowError';
    this.status = status;
    this.body = body;
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Makes an authenticated HTTP request against the Maysar platform.
 *
 * @param {object} options
 * @param {string} options.method
 * @param {string} options.path - e.g. "/api/order/orders"
 * @param {string} [options.authRole] - role key to look up JWT from ctx.sessions
 * @param {object} [options.body] - request body (will be JSON.stringify'd)
 * @param {object} [options.headers] - additional headers
 * @param {string} [options.idempotencyKey] - value for idempotency-key header
 * @param {boolean} [options.serviceKey] - if true, add x-service-key header
 * @param {object} ctx - FlowContext with sessions and config
 */
export async function makeRequest(options, ctx) {
  const { method, path: urlPath, authRole, body, headers = {}, idempotencyKey, serviceKey } = options;
  const { sessions, config } = ctx;
  const baseUrl = config.apiBaseUrl;
  const timeoutMs = config.flowTimeoutMs;

  const url = `${baseUrl}${urlPath}`;
  const requestHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Attach JWT
  if (authRole && sessions[authRole]?.jwt) {
    requestHeaders['Authorization'] = `Bearer ${sessions[authRole].jwt}`;
  }

  // Attach idempotency key
  if (idempotencyKey) {
    requestHeaders['idempotency-key'] = idempotencyKey;
  }

  // Attach service key for maintenance endpoints
  if (serviceKey && process.env.SERVICE_KEY) {
    requestHeaders['x-service-key'] = process.env.SERVICE_KEY;
  }

  // Attach CSRF token for 2FA endpoints
  if (sessions[authRole]?.csrfToken) {
    requestHeaders['x-csrf-token'] = sessions[authRole].csrfToken;
  }

  const maxRetries = 3;
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const startTime = Date.now();

    try {
      const fetchOptions = {
        method: method.toUpperCase(),
        headers: requestHeaders,
        signal: controller.signal,
      };

      if (body !== undefined && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      const durationMs = Date.now() - startTime;
      let data;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      // For 4xx/5xx, do NOT retry — throw typed errors immediately
      if (response.status === 404) {
        throw new RouteNotFoundError(method, urlPath);
      }
      if (response.status >= 500) {
        throw new ServerError(method, urlPath, response.status, data);
      }
      if (response.status >= 400) {
        throw new FlowError(
          `HTTP ${response.status}: ${method} ${urlPath}`,
          response.status,
          data,
        );
      }

      return { status: response.status, data, durationMs };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new FlowTimeoutError(method, urlPath, timeoutMs);
      }
      // Don't retry 4xx/5xx typed errors
      if (err instanceof RouteNotFoundError || err instanceof ServerError || err instanceof FlowError) {
        throw err;
      }
      // Network error — retry with backoff
      lastError = err;
      if (attempt < maxRetries - 1) {
        await sleep(Math.pow(2, attempt) * 200); // 200ms, 400ms, 800ms
      }
    }
  }

  throw lastError || new Error(`Failed after ${maxRetries} attempts: ${method} ${urlPath}`);
}
