const DEFAULT_BASE_URL = 'http://localhost:3000';

export const isLiveE2EEnabled = ['1', 'true', 'yes'].includes(
  String(process.env.RUN_LIVE_E2E || '').trim().toLowerCase()
);

export const liveTestSuite = isLiveE2EEnabled ? describe : describe.skip;

export const resolveLiveBaseUrl = (): string => {
  const rawBaseUrl = String(
    process.env.E2E_BASE_URL
      || process.env.PLATFORM_BASE_URL
      || process.env.BASE_URL
      || DEFAULT_BASE_URL
  ).trim();

  return rawBaseUrl.replace(/\/+$/, '');
};

export type JsonResponse = {
  status: number;
  ok: boolean;
  body: unknown;
  text: string;
};

export const requestJson = async (
  path: string,
  init: RequestInit = {}
): Promise<JsonResponse> => {
  const response = await fetch(`${resolveLiveBaseUrl()}${path}`, init);
  const text = await response.text();

  let body: unknown = text;
  if (text.length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  } else {
    body = {};
  }

  return {
    status: response.status,
    ok: response.ok,
    body,
    text
  };
};

export const extractAccessToken = (body: unknown): string => {
  if (!body || typeof body !== 'object') {
    throw new Error('Expected a JSON object response body');
  }

  const accessToken = (body as { accessToken?: unknown }).accessToken;
  if (typeof accessToken !== 'string' || !accessToken.trim()) {
    throw new Error('Expected login response to include an accessToken');
  }

  return accessToken;
};

export const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Expected a JSON object response body');
  }

  return value as Record<string, unknown>;
};
