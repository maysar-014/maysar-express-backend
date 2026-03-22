import type { Request } from 'express';

const isTruthy = (value?: string): boolean => {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
};

export const shouldBypassRateLimit = (req: Request): boolean => {
  if (isTruthy(process.env.DISABLE_RATE_LIMITING)) return true;
  if (isTruthy(process.env.CONTRACT_TESTS)) return true;
  if (process.env.NODE_ENV === 'test') return true;

  const headerValue =
    String(req.headers['x-contract-test'] ?? req.headers['x-test-csrf'] ?? '')
      .trim()
      .toLowerCase();

  return headerValue === '1' || headerValue === 'true';
};
