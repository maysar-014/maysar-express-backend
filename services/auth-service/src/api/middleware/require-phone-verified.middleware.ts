// @ts-nocheck
/**
 * requirePhoneVerified Middleware
 * Gates routes that require a verified phone number.
 * Reads isPhoneVerified from the DB — never from the JWT — to ensure
 * the check reflects the current persisted state.
 */

import { Request, Response, NextFunction } from 'express';
import { IUserRepository } from '../../domain/repositories';

export const requirePhoneVerified = (userRepository: IUserRepository) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = (req as any).user?.userId || (req as any).user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' }
      });
      return;
    }

    try {
      const user = await userRepository.findById(userId);

      if (!user || !user.isPhoneVerified) {
        res.status(403).json({
          success: false,
          error: {
            code: 'PHONE_VERIFICATION_REQUIRED',
            message: 'Phone verification is required to perform this action. Please verify your phone number.'
          }
        });
        return;
      }

      next();
    } catch (err: any) {
      console.error('requirePhoneVerified middleware error:', err?.message);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'An internal error occurred.' }
      });
    }
  };
