import { Router, Request, RequestHandler } from 'express';
import { requireAuth, AuthUserContext, ServiceContext } from '@shared/middleware/auth-context.middleware';
import { asyncHandler } from '@shared/middleware/async-handler';
import { SellerSlaController } from '../controllers/SellerSlaController';

type RequestWithAuth = Request & {
  user?: AuthUserContext;
  service?: ServiceContext;
};

const router = Router();
const controller = new SellerSlaController();

const normalizeRoles = (roles: unknown): string[] => {
  if (!Array.isArray(roles)) return [];
  return roles.map(role => String(role).toLowerCase());
};

const sellerSlaAccessMiddleware: RequestHandler = (req, res, next) => {
  const authReq = req as RequestWithAuth;

  if (authReq.service) {
    next();
    return;
  }

  const roles = normalizeRoles(authReq.user?.roles);
  const elevatedRoles = new Set(['admin', 'superuser', 'super-admin', 'system']);
  const isElevatedUser = roles.some(role => elevatedRoles.has(role));
  const isSeller = roles.includes('seller');
  const { sellerId } = authReq.params;
  const userId = authReq.user?.userId;

  if (isElevatedUser) {
    next();
    return;
  }

  if (isSeller && userId === sellerId) {
    next();
    return;
  }

  res.status(403).json({
    success: false,
    error: {
      code: 'FORBIDDEN',
      message: 'Unauthorized seller SLA access'
    }
  });
};

router.use(requireAuth);

router.get('/sellers/:sellerId/sla', sellerSlaAccessMiddleware, asyncHandler((req, res) => controller.getSellerSla(req, res)));
router.get('/sellers/:sellerId/sla/breaches', sellerSlaAccessMiddleware, asyncHandler((req, res) => controller.getSellerSlaBreaches(req, res)));
router.get('/sellers/:sellerId/sla/readiness', sellerSlaAccessMiddleware, asyncHandler((req, res) => controller.getSellerSlaReadiness(req, res)));
router.post('/sellers/:sellerId/sla/evaluate', sellerSlaAccessMiddleware, asyncHandler((req, res) => controller.evaluateSellerSla(req, res)));

export default router;
