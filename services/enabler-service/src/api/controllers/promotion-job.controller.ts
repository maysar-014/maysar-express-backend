import type { Request, Response } from 'express';
import { AcceptPromotionJobUseCase } from '../../application/use-cases/accept-promotion-job.use-case';
import { ListPromotionJobsUseCase } from '../../application/use-cases/list-promotion-jobs.use-case';

type AuthenticatedRequest = Request & {
  user?: {
    userId?: string;
    id?: string;
  };
};

export class PromotionJobController {
  constructor(
    private readonly listPromotionJobsUseCase: ListPromotionJobsUseCase,
    private readonly acceptPromotionJobUseCase: AcceptPromotionJobUseCase
  ) {}

  private getHeaderValue(value: unknown): string | undefined {
    if (Array.isArray(value)) {
      return typeof value[0] === 'string' ? value[0] : undefined;
    }

    return typeof value === 'string' ? value : undefined;
  }

  private resolveAcceptedByUserId(req: Request): string | undefined {
    const authenticatedRequest = req as AuthenticatedRequest;
    return (
      authenticatedRequest.user?.userId ||
      authenticatedRequest.user?.id ||
      this.getHeaderValue(req.headers['x-user-id'])
    );
  }

  private respondError(res: Response, error: unknown): void {
    const message = error instanceof Error ? error.message : 'Promotion job request failed';
    const lower = message.toLowerCase();

    let status = 400;
    if (lower.includes('not found')) {
      status = 404;
    } else if (
      lower.includes('already accepted') ||
      lower.includes('not available') ||
      lower.includes('only available for approved')
    ) {
      status = 409;
    }

    res.status(status).json({ error: message });
  }

  async listJobs(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.listPromotionJobsUseCase.execute(req.params.enablerId, req.query as never);
      res.status(200).json({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      this.respondError(res, error);
    }
  }

  async acceptJob(req: Request, res: Response): Promise<void> {
    try {
      const acceptedByUserId = this.resolveAcceptedByUserId(req);
      const result = await this.acceptPromotionJobUseCase.execute(req.params.enablerId, req.params.jobId, {
        ...(req.body || {}),
        ...(acceptedByUserId ? { acceptedByUserId } : {})
      });

      res.status(201).json({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      this.respondError(res, error);
    }
  }
}
