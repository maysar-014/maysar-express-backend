import type { UserContext } from './user-context';

declare global {
  namespace Express {
    interface Request {
      user?: UserContext;
      requestId?: string;
      correlationId?: string;
      startTime?: number;
      userId?: string;
    }
  }
}

export {};
