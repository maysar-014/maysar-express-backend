import type { Request, Response, NextFunction } from 'express';

type AsyncRoute = (req: Request, res: Response, next: NextFunction) => unknown;

export const asyncHandler = (fn: AsyncRoute) => (req: Request, res: Response, next: NextFunction): void => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
