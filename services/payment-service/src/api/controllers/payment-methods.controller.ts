import { Request, Response } from "express";
import {
  PaymentMethodConfigService,
  getPaymentMethodConfigService,
} from "../../config/payment-methods.config";

/**
 * Payment Method Discovery & Operations
 *
 * GET /payment-methods            — authoritative, buyer-facing list of methods.
 *                                    The frontend renders payment options ONLY
 *                                    from this response (no hard-coded master list).
 * GET /admin/payment-methods       — operations/admin view of every method's
 *                                    environment + configuration state. Secrets
 *                                    are never included.
 */
export class PaymentMethodsController {
  constructor(
    private readonly configService: PaymentMethodConfigService = getPaymentMethodConfigService(),
  ) {}

  listPublic(_req: Request, res: Response): void {
    res.status(200).json({
      success: true,
      data: this.configService.listPublic(),
    });
  }

  listAdmin(_req: Request, res: Response): void {
    const misconfigured = this.configService.validateAll();
    res.status(200).json({
      success: true,
      data: this.configService.listAdminStatus(),
      meta: {
        misconfiguredCodes: misconfigured.map((code) => code.toLowerCase()),
        misconfiguredCount: misconfigured.length,
      },
    });
  }
}
