import type { Request, Response } from 'express';
import type { RiskEngine } from '../../domain/risk/risk-engine';
import { sendSuccess } from '../../shared/response';

export class AdminController {
  constructor(private readonly riskEngine: RiskEngine) {}

  getBlocklist = async (_req: Request, res: Response): Promise<void> => {
    const domains = await this.riskEngine.listDomains();
    sendSuccess(res, { domains });
  };

  addDomain = async (req: Request, res: Response): Promise<void> => {
    const { domain } = req.body as { domain: string };
    await this.riskEngine.addDomain(domain);
    sendSuccess(res, { ok: true });
  };

  removeDomain = async (req: Request, res: Response): Promise<void> => {
    await this.riskEngine.removeDomain(req.params.domain);
    sendSuccess(res, { ok: true });
  };
}
