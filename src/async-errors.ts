// Minimal async error handling for Express 4.x.
// Ensures rejected Promises from route handlers are forwarded to next().
// Inspired by express-async-errors but kept local to avoid new deps.
/* eslint-disable @typescript-eslint/no-var-requires */

const layer = require('express/lib/router/layer');

const wrapAsync = (fn: any) => {
  if (typeof fn !== 'function') return fn;
  return function asyncWrapper(...args: any[]) {
    const next = args[args.length - 1];
    try {
      const result = fn.apply(this, args);
      if (result && typeof result.then === 'function' && typeof result.catch === 'function') {
        result.catch(next);
      }
      return result;
    } catch (err) {
      return next(err);
    }
  };
};

const patchLayer = () => {
  const originalHandleRequest = layer.prototype.handle_request;
  const originalHandleError = layer.prototype.handle_error;

  layer.prototype.handle_request = function handle_request(req: any, res: any, next: any) {
    const fn = this.handle;
    if (fn.length > 3) return next();
    return wrapAsync(fn).call(this, req, res, next);
  };

  layer.prototype.handle_error = function handle_error(err: any, req: any, res: any, next: any) {
    const fn = this.handle;
    if (fn.length !== 4) return next(err);
    return wrapAsync(fn).call(this, err, req, res, next);
  };

  layer.prototype.handle_request._patched = true;
  layer.prototype.handle_error._patched = true;
  layer.prototype.handle_request._original = originalHandleRequest;
  layer.prototype.handle_error._original = originalHandleError;
};

if (!layer.prototype.handle_request?._patched) {
  patchLayer();
}
