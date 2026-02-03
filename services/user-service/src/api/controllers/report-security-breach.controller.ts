import { Request, Response } from 'express';
import { ReportSecurityBreachUseCase, ReportSecurityBreachInput } from '../../application/use-cases';
import { ReportSecurityBreachDTO } from '../../application/dto/report-security-breach.dto';
import { logger } from '../../infrastructure/services/logger.service';

/**
 * Report Security Breach Controller
 * Layer Responsibility: Transport & validation only
 * Business logic delegated to Use Case
 */
export class ReportSecurityBreachController {
  constructor(private reportSecurityBreachUseCase: ReportSecurityBreachUseCase) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const requestBody = req.body as ReportSecurityBreachDTO.Request;

      // Validation
      if (!requestBody.userId || !requestBody.breachType || !requestBody.severity) {
        res.status(400).json({ success: false, message: 'Missing required fields' });
        return;
      }

      // Delegate to use case
      const input: ReportSecurityBreachInput = {
        userId: requestBody.userId,
        breachType: requestBody.breachType,
        severity: requestBody.severity,
        details: requestBody.details,
        reportedBy: requestBody.reportedBy
      };

      const result = await this.reportSecurityBreachUseCase.execute(input);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      logger.error('Report security breach failed', { error });
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}
