/**
 * RequestController (Phase 1 §1.1–§1.6) — customer-facing surface.
 *
 * The userId ALWAYS comes from `(req as any).user.userId` (auth context),
 * never from the request body (§1.1 access control). The provider/ops surface
 * lives in ProviderRequestController.
 */

import { Request, Response } from 'express';
import { CreateRequestUseCase } from '../../application/use-cases/create-request.use-case';
import { ListRequestsUseCase } from '../../application/use-cases/list-requests.use-case';
import { GetRequestUseCase } from '../../application/use-cases/get-request.use-case';
import { CancelRequestUseCase } from '../../application/use-cases/cancel-request.use-case';
import { PostMessageUseCase } from '../../application/use-cases/post-message.use-case';
import { ListMessagesUseCase } from '../../application/use-cases/list-messages.use-case';
import { ListCustomerQuotesUseCase } from '../../application/use-cases/list-customer-quotes.use-case';
import { ResolveAssessmentLinkUseCase, LinkResolutionError } from '../../application/use-cases/resolve-assessment-link.use-case';
import { ConvertQuoteToOrderUseCase } from '../../application/use-cases/convert-quote-to-order.use-case';

export class RequestController {
  constructor(
    private readonly createRequest: CreateRequestUseCase,
    private readonly listRequests: ListRequestsUseCase,
    private readonly getRequest: GetRequestUseCase,
    private readonly cancelRequest: CancelRequestUseCase,
    private readonly _postMessage: PostMessageUseCase,
    private readonly _listMessages: ListMessagesUseCase,
    private readonly listCustomerQuotes: ListCustomerQuotesUseCase,
    private readonly resolveLink: ResolveAssessmentLinkUseCase,
    private readonly convertQuote: ConvertQuoteToOrderUseCase,
  ) {}

  private customerId(req: Request): string {
    return (req as any).user?.userId ?? (req as any).userId ?? '';
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const customerId = this.customerId(req);
      if (!customerId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }
      const result = await this.createRequest.execute(customerId, req.body ?? {});
      res.status(201).json({ success: true, data: result, timestamp: new Date() });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    try {
      const customerId = this.customerId(req);
      const limit = Number(req.query.limit ?? 20);
      const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : null;
      const data = await this.listRequests.execute(customerId, { limit, cursor });
      res.json({ success: true, data, timestamp: new Date() });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async get(req: Request, res: Response): Promise<void> {
    try {
      const customerId = this.customerId(req);
      const request = await this.getRequest.execute(customerId, req.params.requestId);
      res.json({ success: true, data: request.toJSON(), timestamp: new Date() });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async cancel(req: Request, res: Response): Promise<void> {
    try {
      const customerId = this.customerId(req);
      const request = await this.cancelRequest.execute(customerId, req.params.requestId);
      res.json({ success: true, data: request.toJSON(), timestamp: new Date() });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async postMessage(req: Request, res: Response): Promise<void> {
    try {
      const customerId = this.customerId(req);
      const message = await this._postMessage.execute(
        { id: customerId, role: 'customer' },
        req.params.requestId,
        { body: req.body?.body, attachments: req.body?.attachments },
      );
      res.status(201).json({ success: true, data: message.toJSON(), timestamp: new Date() });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listMessages(req: Request, res: Response): Promise<void> {
    try {
      const customerId = this.customerId(req);
      const limit = Number(req.query.limit ?? 50);
      const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : null;
      const messages = await this._listMessages.execute(
        { id: customerId, role: 'customer' },
        req.params.requestId,
        { limit, cursor },
      );
      res.json({ success: true, data: messages.map((m) => m.toJSON()), timestamp: new Date() });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async customerQuotes(req: Request, res: Response): Promise<void> {
    try {
      const quotes = await this.listCustomerQuotes.execute(req.params.requestId);
      res.json({ success: true, data: quotes, timestamp: new Date() });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /** Public — the raw token is the credential (no auth middleware). */
  async resolveAssessmentLink(req: Request, res: Response): Promise<void> {
    try {
      const token = req.params.token;
      if (!token) {
        res.status(400).json({ success: false, error: { code: 'TOKEN_REQUIRED', message: 'token is required' } });
        return;
      }
      const data = await this.resolveLink.execute(token);
      res.json({ success: true, data, timestamp: new Date() });
    } catch (error) {
      if (error instanceof LinkResolutionError) {
        res.status(410).json({ success: false, error: { code: error.code, message: error.message } });
        return;
      }
      this.handleError(error, res);
    }
  }

  /** Public, idempotent — converts the accepted quote into a normal order. */
  async convertQuoteToOrder(req: Request, res: Response): Promise<void> {
    try {
      const token = req.params.token;
      if (!token) {
        res.status(400).json({ success: false, error: { code: 'TOKEN_REQUIRED', message: 'token is required' } });
        return;
      }
      const data = await this.convertQuote.execute({ token });
      res.status(data.created ? 201 : 200).json({ success: true, data, timestamp: new Date() });
    } catch (error) {
      if (error instanceof LinkResolutionError) {
        res.status(410).json({ success: false, error: { code: error.code, message: error.message } });
        return;
      }
      this.handleError(error, res);
    }
  }

  private handleError(error: unknown, res: Response): void {
    const anyError = error as any;
    const status = typeof anyError?.httpStatus === 'number' ? anyError.httpStatus : 500;
    const code = typeof anyError?.code === 'string' ? anyError.code : 'INTERNAL_SERVER_ERROR';
    const message = anyError?.message ?? 'Unknown error';
    if (status >= 500) console.error('[RequestController]', error);
    res.status(status).json({ success: false, error: { code, message }, timestamp: new Date() });
  }
}