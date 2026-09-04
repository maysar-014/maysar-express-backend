import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { isSystemId } from '../ids/id';
import { isTokenBlacklisted } from '../auth/token-blacklist';

export interface AuthUserContext {
  userId: string;
  email?: string;
  roles: string[];
  token?: string;
}

export interface ServiceContext {
  serviceKey: string;
  serviceId?: string;
}

type ResolveResult = {
  user?: AuthUserContext;
  service?: ServiceContext;
  error?: { code: string; message: string };
};

const parseCommaList = (value: unknown): string[] => {
  if (typeof value !== 'string') return [];
  return value.split(',').map(item => item.trim()).filter(Boolean);
};

const getHeaderValue = (value: unknown): string | undefined => {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined;
  return typeof value === 'string' ? value : undefined;
};

const isGatewayUserId = (value: string): boolean => {
  if (!value) return false;
  if (isSystemId(value)) return true;
  return value.startsWith('usr_');
};

const getBearerToken = (req: Request): string | null => {
  const header = req.headers.authorization;
  if (!header || typeof header !== 'string') return null;
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token || null;
};

const resolveFromHeaders = (req: Request, allowGatewayAuth: boolean): AuthUserContext | null => {
  if (!allowGatewayAuth) return null;
  const userIdHeader = req.headers['x-user-id'];
  const userId = Array.isArray(userIdHeader) ? userIdHeader[0] : userIdHeader;
  if (!userId || typeof userId !== 'string') return null;
  if (!isGatewayUserId(userId)) return null;

  const rolesHeader = req.headers['x-user-roles'];
  const rolesValue = Array.isArray(rolesHeader) ? rolesHeader[0] : rolesHeader;
  const roles = parseCommaList(rolesValue);

  const emailHeader = req.headers['x-user-email'];
  const email = Array.isArray(emailHeader) ? emailHeader[0] : emailHeader;

  return {
    userId,
    email: typeof email === 'string' ? email : undefined,
    roles: roles.length ? roles : ['user']
  };
};

const resolveFromToken = (token: string): ResolveResult => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return { error: { code: 'JWT_SECRET_MISSING', message: 'JWT_SECRET is not configured' } };
  }

  try {
    const payload = jwt.verify(token, secret) as any;
    const roles = Array.isArray(payload?.roles)
      ? payload.roles
      : payload?.role
        ? [payload.role]
        : [];

    return {
      user: {
        userId: String(payload?.userId || payload?.sub || ''),
        email: payload?.email,
        roles: roles.length ? roles.map(String) : ['user'],
        token
      }
    };
  } catch (error: any) {
    return { error: { code: 'INVALID_TOKEN', message: error?.message || 'Invalid token' } };
  }
};

const resolveServiceKey = (req: Request): ServiceContext | null => {
  const header = req.headers['x-service-key'];
  const serviceKey = Array.isArray(header) ? header[0] : header;
  if (!serviceKey || typeof serviceKey !== 'string') return null;

  const allowed = parseCommaList(process.env.ALLOWED_SERVICE_KEYS);
  if (!allowed.length) return null;
  if (!allowed.includes(serviceKey)) return null;

  return { serviceKey, serviceId: 'service' };
};

const isContractTestRequest = (req: Request): boolean => {
  const header = req.headers['x-contract-test'];
  const value = Array.isArray(header) ? header[0] : header;
  return value === '1' || value === 'true';
};

const resolveContractTestUser = (req: Request): AuthUserContext | null => {
  const userId = getHeaderValue(req.headers['x-user-id']);
  if (!userId || !isGatewayUserId(userId)) {
    return null;
  }

  const roles = parseCommaList(getHeaderValue(req.headers['x-user-roles']));
  const email = getHeaderValue(req.headers['x-user-email']);

  return {
    userId,
    email,
    roles
  };
};

const resolveAuthContext = (req: Request): ResolveResult => {
  if ((req as any).user || (req as any).service) {
    return {
      user: (req as any).user,
      service: (req as any).service
    };
  }

  // Contract-test bypass — only when no real Authorization header is present.
  // If a Bearer token was supplied (even an invalid one), validate it normally
  // so that contract tests exercising auth failure paths get proper 401 responses.
  const token = getBearerToken(req);
  if (token) {
    const tokenResult = resolveFromToken(token);
    if (tokenResult.user) return tokenResult;
    if (tokenResult.error) return tokenResult;
  }

  if (isContractTestRequest(req) && process.env.NODE_ENV !== 'production') {
    const contractUser = resolveContractTestUser(req);
    if (contractUser) {
      return { user: contractUser };
    }
  }

  const service = resolveServiceKey(req);
  if (service) {
    const headerUser = resolveFromHeaders(req, true);
    if (headerUser) {
      return { user: headerUser, service };
    }
    return { service };
  }

  const allowGatewayAuth = process.env.ALLOW_GATEWAY_AUTH === 'true';
  const headerUser = resolveFromHeaders(req, allowGatewayAuth);
  if (headerUser) {
    return { user: headerUser };
  }

  return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } };
};

export const attachAuthContext = (req: Request, _res: Response, next: NextFunction): void => {
  const result = resolveAuthContext(req);
  if (result.user) (req as any).user = result.user;
  if (result.service) (req as any).service = result.service;
  next();
};

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const result = resolveAuthContext(req);
  if (result.user || result.service) {
    if (result.user) (req as any).user = result.user;
    if (result.service) (req as any).service = result.service;
    next();
    return;
  }

  const error = result.error || { code: 'UNAUTHORIZED', message: 'Authentication required' };
  res.status(401).json({
    success: false,
    error
  });
};

const normalizeRoles = (roles: string[]): string[] => roles.map(role => role.toLowerCase());

const hasAnyRole = (userRoles: string[], required: string[]): boolean => {
  const normalizedUser = normalizeRoles(userRoles);
  const normalizedRequired = normalizeRoles(required);
  return normalizedRequired.some(role => normalizedUser.includes(role));
};

const respondForbidden = (res: Response) => {
  res.status(403).json({
    success: false,
    error: {
      code: 'FORBIDDEN',
      message: 'Insufficient permissions'
    }
  });
};

export const requireRole = (roles: string[] | string) => (req: Request, res: Response, next: NextFunction): void => {
  const required = Array.isArray(roles) ? roles : [roles];
  const result = resolveAuthContext(req);

  if (result.user) {
    if (hasAnyRole(result.user.roles, required)) {
      (req as any).user = result.user;
      next();
      return;
    }
    respondForbidden(res);
    return;
  }

  if (result.service) {
    (req as any).service = result.service;
    respondForbidden(res);
    return;
  }

  const error = result.error || { code: 'UNAUTHORIZED', message: 'Authentication required' };
  res.status(401).json({
    success: false,
    error
  });
};

export const requireRoleOrService = (roles: string[] | string) => (req: Request, res: Response, next: NextFunction): void => {
  const required = Array.isArray(roles) ? roles : [roles];
  const result = resolveAuthContext(req);

  if (result.service) {
    (req as any).service = result.service;
    next();
    return;
  }

  if (result.user) {
    if (hasAnyRole(result.user.roles, required)) {
      (req as any).user = result.user;
      next();
      return;
    }
    respondForbidden(res);
    return;
  }

  const error = result.error || { code: 'UNAUTHORIZED', message: 'Authentication required' };
  res.status(401).json({
    success: false,
    error
  });
};
