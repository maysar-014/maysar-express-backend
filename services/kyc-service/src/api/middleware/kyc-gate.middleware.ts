import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../infrastructure/database/prisma-client';

export const requireKycListingCapacity = (
  countFn: (userId: string) => Promise<number>
) => async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as { user?: { userId?: string } }).user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required for KYC checks'
        }
      });
      return;
    }

    const user = await prisma.user_User.findUnique({
      where: { id: userId },
      select: { kycLevel: true, kycLimitMaxListings: true }
    });

    const maxAllowed = user?.kycLimitMaxListings ?? 5;
    const currentLevel = user?.kycLevel ?? 0;
    const currentCount = await countFn(userId);

    if (currentCount >= maxAllowed) {
      res.status(403).json({
        success: false,
        error: {
          code: 'KYC_LISTING_CAP_REACHED',
          message: `You have reached your KYC listing cap of ${maxAllowed}. Upgrade your KYC level to create more listings.`,
          currentCount,
          maxAllowed,
          currentLevel
        }
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'KYC_GATE_ERROR',
        message: error instanceof Error ? error.message : 'Unable to validate KYC listing capacity'
      }
    });
  }
};

export const requireKycLevel = (minLevel: number) => async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as { user?: { userId?: string } }).user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required for KYC checks'
        }
      });
      return;
    }

    const user = await prisma.user_User.findUnique({
      where: { id: userId },
      select: { kycLevel: true, kycStatus: true }
    });

    const currentLevel = user?.kycLevel ?? 0;
    if (currentLevel >= minLevel) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      error: {
        code: 'KYC_LEVEL_REQUIRED',
        message: `KYC level ${minLevel} is required to perform this action. Please complete verification to unlock it.`,
        requiredLevel: minLevel,
        currentLevel
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'KYC_GATE_ERROR',
        message: error instanceof Error ? error.message : 'Unable to validate KYC level'
      }
    });
  }
};
