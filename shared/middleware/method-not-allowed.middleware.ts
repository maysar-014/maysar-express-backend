import { Request, Response, NextFunction } from 'express';

type Layer = {
  route?: {
    methods?: Record<string, boolean>;
  };
  name?: string;
  handle?: { stack?: Layer[] };
  match?: (path: string) => boolean;
  path?: string;
  regexp?: RegExp;
};

const normalizePath = (value: string): string => {
  if (!value) return '/';
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  return withLeadingSlash.length > 1 ? withLeadingSlash.replace(/\/+$/, '') : withLeadingSlash;
};

const collectAllowedMethods = (stack: Layer[], requestPath: string): Set<string> => {
  const allowed = new Set<string>();

  for (const layer of stack) {
    if (!layer) continue;

    if (layer.route) {
      const matched =
        (typeof layer.match === 'function' && layer.match(requestPath))
        || (layer.regexp instanceof RegExp && layer.regexp.test(requestPath));
      if (matched) {
        const methods = layer.route.methods || {};
        Object.keys(methods).forEach(method => allowed.add(method.toUpperCase()));
      }
      continue;
    }

    if (layer.name === 'router' && layer.handle?.stack) {
      const matched = layer.regexp instanceof RegExp
        ? layer.regexp.exec(requestPath)
        : (typeof layer.match === 'function' && layer.match(requestPath) ? [requestPath] : null);
      if (!matched) continue;

      const consumed = typeof matched[0] === 'string'
        ? normalizePath(matched[0])
        : '/';
      const normalizedRequestPath = normalizePath(requestPath);
      let trimmedPath = '/';
      if (normalizedRequestPath !== consumed && normalizedRequestPath.startsWith(consumed)) {
        trimmedPath = normalizePath(normalizedRequestPath.slice(consumed.length));
      }

      const nested = collectAllowedMethods(layer.handle.stack, trimmedPath);
      nested.forEach(method => allowed.add(method));
    }
  }

  return allowed;
};

export const methodNotAllowedMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const router = (req.app as { _router?: { stack?: Layer[] } })._router;
  if (!router?.stack) {
    next();
    return;
  }

  const requestPath = req.path || '/';
  const allowed = collectAllowedMethods(router.stack, requestPath);

  if (allowed.size > 0 && !allowed.has(req.method.toUpperCase())) {
    if (!allowed.has('OPTIONS')) {
      allowed.add('OPTIONS');
    }
    if (allowed.has('GET') && !allowed.has('HEAD')) {
      allowed.add('HEAD');
    }

    res.set('Allow', Array.from(allowed).sort().join(', '));
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  next();
};
