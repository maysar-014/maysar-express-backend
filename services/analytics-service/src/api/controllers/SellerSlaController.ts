import { Request, Response } from 'express';
import type {
  SellerSlaExecutionResultDTO,
  SellerSlaEvaluationMode,
  SellerSlaReport
} from '../../application/dto/seller-sla.dto';
import type { GetSellerSlaReport } from '../../application/use-cases/GetSellerSlaReport';

const LOOKBACK_DAYS_MIN = 1;
const LOOKBACK_DAYS_MAX = 365;

class RequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RequestValidationError';
  }
}

const parseLookbackDays = (value: unknown): number | undefined => {
  const normalized = Array.isArray(value) ? value[0] : value;
  if (normalized === undefined || normalized === null) {
    return undefined;
  }

  if (typeof normalized !== 'string' && typeof normalized !== 'number') {
    throw new RequestValidationError('lookbackDays must be an integer between 1 and 365');
  }

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < LOOKBACK_DAYS_MIN || parsed > LOOKBACK_DAYS_MAX) {
    throw new RequestValidationError('lookbackDays must be an integer between 1 and 365');
  }

  return parsed;
};

const readLookbackDays = (req: Request): number | undefined => {
  const queryLookbackDays = (req.query as { lookbackDays?: unknown } | undefined)?.lookbackDays;
  if (queryLookbackDays !== undefined) {
    return parseLookbackDays(queryLookbackDays);
  }

  const bodyLookbackDays = (req.body as { lookbackDays?: unknown } | undefined)?.lookbackDays;
  if (bodyLookbackDays !== undefined) {
    return parseLookbackDays(bodyLookbackDays);
  }

  return undefined;
};

const buildReportEnvelope = (report: SellerSlaReport) => ({
  sellerId: report.sellerId,
  evaluatedAt: report.evaluatedAt,
  periodStart: report.periodStart,
  periodEnd: report.periodEnd,
  status: report.status,
  overallComplianceScore: report.overallComplianceScore,
  goLiveReadinessScore: report.goLiveReadinessScore,
  dataCoverageScore: report.dataCoverageScore,
  summary: report.summary,
  metrics: report.metrics,
  breaches: report.breaches,
  readiness: report.readiness,
  coverage: report.coverage,
  recommendations: report.recommendations
});

export class SellerSlaController {
  constructor(private readonly useCase: Pick<GetSellerSlaReport, 'execute'> = SellerSlaController.createDefaultUseCase()) {}

  private static createDefaultUseCase(): Pick<GetSellerSlaReport, 'execute'> {
    // Lazy-load the use case so controller tests can inject a fake without loading Prisma.
    // Production code still gets the real implementation on demand.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { GetSellerSlaReport } = require('../../application/use-cases/GetSellerSlaReport') as {
      GetSellerSlaReport: new () => Pick<GetSellerSlaReport, 'execute'>;
    };

    return new GetSellerSlaReport();
  }

  private async getExecutionResult(
    req: Request,
    mode: SellerSlaEvaluationMode = 'report'
  ): Promise<SellerSlaExecutionResultDTO> {
    const sellerId = req.params.sellerId;
    const lookbackDays = readLookbackDays(req);

    return this.useCase.execute(sellerId, {
      lookbackDays,
      mode
    });
  }

  private handleError(res: Response, error: unknown, fallbackMessage: string): void {
    if (error instanceof RequestValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: fallbackMessage });
  }

  async getSellerSla(req: Request, res: Response): Promise<void> {
    try {
      const { report } = await this.getExecutionResult(req, 'report');
      res.json(buildReportEnvelope(report));
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch seller SLA report');
    }
  }

  async getSellerSlaBreaches(req: Request, res: Response): Promise<void> {
    try {
      const { report } = await this.getExecutionResult(req, 'report');
      res.json({
        sellerId: report.sellerId,
        evaluatedAt: report.evaluatedAt,
        periodStart: report.periodStart,
        periodEnd: report.periodEnd,
        status: report.status,
        summary: report.summary,
        breaches: report.breaches,
        recommendations: report.recommendations
      });
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch seller SLA breaches');
    }
  }

  async getSellerSlaReadiness(req: Request, res: Response): Promise<void> {
    try {
      const { report } = await this.getExecutionResult(req, 'report');
      res.json({
        sellerId: report.sellerId,
        evaluatedAt: report.evaluatedAt,
        periodStart: report.periodStart,
        periodEnd: report.periodEnd,
        status: report.status,
        goLiveReadinessScore: report.goLiveReadinessScore,
        summary: report.summary,
        readiness: report.readiness,
        coverage: report.coverage,
        recommendations: report.recommendations
      });
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch seller SLA readiness');
    }
  }

  async evaluateSellerSla(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.getExecutionResult(req, 'evaluate');
      res.json({
        report: buildReportEnvelope(result.report),
        persistence: result.persistence
      });
    } catch (error) {
      this.handleError(res, error, 'Failed to evaluate seller SLA');
    }
  }
}
