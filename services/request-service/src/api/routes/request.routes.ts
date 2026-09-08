/**
 * Request Routes — customer + provider surface.
 *
 * Mounted by RequestModule at /api/request. Public link routes are token-gated
 * (no auth middleware — the raw token is the credential). Everything else is
 * authenticated; userId comes from the auth context.
 *
 *   POST   /api/request/requests                       create request
 *   GET    /api/request/requests                       list own
 *   GET    /api/request/requests/:requestId            get own
 *   POST   /api/request/requests/:requestId/cancel     cancel own
 *   POST   /api/request/requests/:requestId/messages
 *   GET    /api/request/requests/:requestId/messages
 *   GET    /api/request/requests/:requestId/quotes     customer-visible quotes
 *
 *   GET    /api/request/requests/assess/:token          public link resolve
 *   POST   /api/request/requests/assess/:token/convert  idempotent conversion
 *
 *   GET    /api/request/provider/requests                      provider queue
 *   GET    /api/request/provider/requests/:requestId           provider detail
 *   POST   /api/request/provider/requests/:requestId/assignment (admin/ops)
 *   POST   /api/request/provider/requests/:requestId/assessment
 *   POST   /api/request/provider/requests/:requestId/quotes
 *   GET    /api/request/provider/requests/:requestId/messages
 *   GET    /api/request/provider/quotes/:quoteId
 *   POST   /api/request/provider/quotes/:quoteId/publish
 *   POST   /api/request/provider/quotes/:quoteId/assessment-link
 */

import { Router } from 'express';
import { requireAuth, requireRole } from '@shared/middleware/auth-context.middleware';
import { healthRoutes } from './health.routes';
import { RequestController } from '../controllers/request.controller';
import { ProviderRequestController } from '../controllers/provider-request.controller';
import { PrismaRequestRepository } from '../../infrastructure/repositories/prisma-request.repository';
import { PrismaRequestMessageRepository } from '../../infrastructure/repositories/prisma-request-message.repository';
import { PrismaRequestAssessmentRepository } from '../../infrastructure/repositories/prisma-request-assessment.repository';
import { PrismaRequestQuoteRepository } from '../../infrastructure/repositories/prisma-request-quote.repository';
import { PrismaRequestAccessLinkRepository } from '../../infrastructure/repositories/prisma-request-access-link.repository';
import { PrismaRequestItemRepository } from '../../infrastructure/repositories/prisma-request-item.repository';
import { PrismaRequestSourceRepository } from '../../infrastructure/repositories/prisma-request-source.repository';
import { PrismaRequestSupplierRepository } from '../../infrastructure/repositories/prisma-request-supplier.repository';
import { PrismaRequestProcurementRepository } from '../../infrastructure/repositories/prisma-request-procurement.repository';
import { CreateRequestUseCase } from '../../application/use-cases/create-request.use-case';
import { ListRequestsUseCase } from '../../application/use-cases/list-requests.use-case';
import { GetRequestUseCase } from '../../application/use-cases/get-request.use-case';
import { CancelRequestUseCase } from '../../application/use-cases/cancel-request.use-case';
import { PostMessageUseCase } from '../../application/use-cases/post-message.use-case';
import { ListMessagesUseCase } from '../../application/use-cases/list-messages.use-case';
import { ListCustomerQuotesUseCase } from '../../application/use-cases/list-customer-quotes.use-case';
import { ResolveAssessmentLinkUseCase } from '../../application/use-cases/resolve-assessment-link.use-case';
import { ConvertQuoteToOrderUseCase } from '../../application/use-cases/convert-quote-to-order.use-case';
import { ListProviderRequestsUseCase } from '../../application/use-cases/list-provider-requests.use-case';
import { AssessRequestUseCase } from '../../application/use-cases/assess-request.use-case';
import { AssignRequestProviderUseCase } from '../../application/use-cases/assign-request-provider.use-case';
import { CreateQuoteUseCase } from '../../application/use-cases/create-quote.use-case';
import { PublishQuoteUseCase } from '../../application/use-cases/publish-quote.use-case';
import { RegisterSupplierUseCase } from '../../application/use-cases/register-supplier.use-case';
import { ListSuppliersUseCase } from '../../application/use-cases/list-suppliers.use-case';
import { SetItemSourceUseCase } from '../../application/use-cases/set-item-source.use-case';
import { ListProcurementUseCase } from '../../application/use-cases/list-procurement.use-case';
import { AdvanceProcurementUseCase } from '../../application/use-cases/advance-procurement.use-case';
import { GetProviderQuoteDetailUseCase } from '../../application/use-cases/get-provider-quote-detail.use-case';
import { MarkSupplierInviteUseCase } from '../../application/use-cases/mark-supplier-invite.use-case';
import { GetDemandAnalyticsUseCase } from '../../application/use-cases/get-demand-analytics.use-case';
let customerController: RequestController | null = null;
let providerController: ProviderRequestController | null = null;

export function getCustomerController(): RequestController {
  if (!customerController) {
    const requestRepo = new PrismaRequestRepository();
    const messageRepo = new PrismaRequestMessageRepository();
    const quoteRepo = new PrismaRequestQuoteRepository();
    const linkRepo = new PrismaRequestAccessLinkRepository();

    const resolver = new ResolveAssessmentLinkUseCase(requestRepo, quoteRepo, linkRepo);

    customerController = new RequestController(
      new CreateRequestUseCase(requestRepo, messageRepo),
      new ListRequestsUseCase(requestRepo),
      new GetRequestUseCase(requestRepo),
      new CancelRequestUseCase(requestRepo, messageRepo),
      new PostMessageUseCase(requestRepo, messageRepo),
      new ListMessagesUseCase(requestRepo, messageRepo),
      new ListCustomerQuotesUseCase(requestRepo, quoteRepo),
      resolver,
      new ConvertQuoteToOrderUseCase(requestRepo, quoteRepo, linkRepo, messageRepo, resolver),
    );
  }
  return customerController;
}

export function getProviderController(): ProviderRequestController {
  if (!providerController) {
    const requestRepo = new PrismaRequestRepository();
    const messageRepo = new PrismaRequestMessageRepository();
    const assessmentRepo = new PrismaRequestAssessmentRepository();
    const quoteRepo = new PrismaRequestQuoteRepository();
    const linkRepo = new PrismaRequestAccessLinkRepository();
    const itemRepo = new PrismaRequestItemRepository();
    const sourceRepo = new PrismaRequestSourceRepository();
    const supplierRepo = new PrismaRequestSupplierRepository();
    const procurementRepo = new PrismaRequestProcurementRepository();

    providerController = new ProviderRequestController(
      new ListProviderRequestsUseCase(requestRepo),
      new AssessRequestUseCase(requestRepo, assessmentRepo, messageRepo),
      new AssignRequestProviderUseCase(requestRepo),
      new CreateQuoteUseCase(requestRepo, quoteRepo, itemRepo),
      new PublishQuoteUseCase(requestRepo, quoteRepo, messageRepo, itemRepo, sourceRepo),
      new GetProviderQuoteDetailUseCase(quoteRepo),
      new GenerateAssessmentLinkUseCase(requestRepo, quoteRepo, linkRepo, process.env.REQUEST_ASSESS_BASE_URL ?? ''),
      new ListMessagesUseCase(requestRepo, messageRepo),
      new RegisterSupplierUseCase(supplierRepo),
      new ListSuppliersUseCase(supplierRepo, sourceRepo),
      new SetItemSourceUseCase(itemRepo, sourceRepo, supplierRepo),
      new ListProcurementUseCase(procurementRepo),
      new AdvanceProcurementUseCase(procurementRepo, itemRepo),
      new MarkSupplierInviteUseCase(supplierRepo),
      new GetDemandAnalyticsUseCase(requestRepo, quoteRepo),
    );
  }
  return providerController;
}

export function createRequestRoutes(): Router {
  const router = Router();
  router.use('/health', healthRoutes);

  const customer = getCustomerController();
  const provider = getProviderController();

  // ── Public token-gated link routes (NO auth middleware) ───────────────────
  router.get('/requests/assess/:token', (req, res) => customer.resolveAssessmentLink(req, res));
  router.post('/requests/assess/:token/convert', (req, res) => customer.convertQuoteToOrder(req, res));

  // ── Provider routes (role enforced), mounted under /provider ─────────────
  const providerRouter = Router();
  providerRouter.use(requireRole(['provider', 'admin', 'ops']));
  // Phase 2 §2.2–2.3 — supplier registry + sourcing + procurement
  providerRouter.get('/suppliers', (req, res) => provider.listSuppliers(req, res));
  providerRouter.post('/suppliers', (req, res) => provider.createSupplier(req, res));
  providerRouter.put('/suppliers/:supplierId', (req, res) => provider.updateSupplier(req, res));
  // Phase 5 — growth loop: invite lifecycle (PENDING → INVITE_READY → INVITED)
  providerRouter.post('/suppliers/:supplierId/invite-ready', (req, res) => provider.markSupplierInviteReady(req, res));
  providerRouter.post('/suppliers/:supplierId/invited', (req, res) => provider.markSupplierInvited(req, res));
  providerRouter.post('/items/:itemId/sources', (req, res) => provider.attachItemSource(req, res));
  providerRouter.post('/sources/:sourceId/confirm', (req, res) => provider.confirmItemSource(req, res));
  providerRouter.get('/orders/:orderId/procurement', (req, res) => provider.orderProcurement(req, res));
  providerRouter.patch('/procurement/:procurementId', (req, res) => provider.patchProcurement(req, res));
  // §5.3 — demand analytics aggregate (static, MUST precede /:requestId)
  providerRouter.get('/analytics', (req, res) => provider.analytics(req, res));
  // NOTE: /quotes/:quoteId MUST be registered before /:requestId, otherwise
  // GET /provider/requests/quotes/:quoteId is captured by /:requestId.
  providerRouter.get('/quotes/:quoteId', (req, res) => provider.quoteDetail(req, res));
  providerRouter.post('/quotes/:quoteId/publish', (req, res) => provider.publishQuote(req, res));
  providerRouter.post('/quotes/:quoteId/assessment-link', (req, res) => provider.generateAssessmentLink(req, res));
  providerRouter.get('/', (req, res) => provider.list(req, res));
  providerRouter.get('/:requestId', (req, res) => provider.get(req, res));
  providerRouter.post('/:requestId/assignment', (req, res) => provider.assign(req, res));
  providerRouter.post('/:requestId/assessment', (req, res) => provider.assess(req, res));
  providerRouter.post('/:requestId/quotes', (req, res) => provider.createQuote(req, res));
  providerRouter.get('/:requestId/messages', (req, res) => provider.listMessages(req, res));
  router.use('/provider/requests', providerRouter);

  // ── Authenticated customer routes ─────────────────────────────────────────
  router.use(requireAuth);
  router.post('/requests', (req, res) => customer.create(req, res));
  router.get('/requests', (req, res) => customer.list(req, res));
  router.get('/requests/:requestId', (req, res) => customer.get(req, res));
  router.post('/requests/:requestId/cancel', (req, res) => customer.cancel(req, res));
  router.post('/requests/:requestId/messages', (req, res) => customer.postMessage(req, res));
  router.get('/requests/:requestId/messages', (req, res) => customer.listMessages(req, res));
  router.get('/requests/:requestId/quotes', (req, res) => customer.customerQuotes(req, res));

  return router;
}
import { GenerateAssessmentLinkUseCase } from '../../application/use-cases/generate-assessment-link.use-case';