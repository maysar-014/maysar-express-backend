import type { Request, Response } from 'express';
import { GetEnablerEarningsLedgerUseCase } from '../../application/use-cases/get-enabler-earnings-ledger.use-case';
import { GetEnablerEarningsSummaryUseCase } from '../../application/use-cases/get-enabler-earnings-summary.use-case';

export class EnablerEarningsController {
  constructor(
    private readonly getEnablerEarningsLedgerUseCase: GetEnablerEarningsLedgerUseCase,
    private readonly getEnablerEarningsSummaryUseCase: GetEnablerEarningsSummaryUseCase
  ) {}

  private respondError(res: Response, error: unknown): void {
    const message = error instanceof Error ? error.message : 'Unable to load enabler earnings';
    const status = message.toLowerCase().includes('not found') ? 404 : 400;
    res.status(status).json({ error: message });
  }

  async getLedger(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.getEnablerEarningsLedgerUseCase.execute(req.params.enablerId, req.query as any);
      res.status(200).json({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      this.respondError(res, error);
    }
  }

  async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.getEnablerEarningsSummaryUseCase.execute(req.params.enablerId);
      res.status(200).json({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      this.respondError(res, error);
    }
  }
}
