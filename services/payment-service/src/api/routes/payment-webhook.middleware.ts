import express from 'express';
import { extractPaymentWebhookRequest } from '../controllers/payment-webhook.utils';

const hasOwn = (value: object, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key);

const collectCandidates = (source: Record<string, unknown>, keys: string[]): unknown[] =>
  keys.filter((key) => hasOwn(source, key)).map((key) => source[key]);

export const requireWebhookIdempotencyKey = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const header = req.headers['x-webhook-idempotency-key'];
  const value = Array.isArray(header) ? header[0] : header;

  if (typeof value !== 'string' || value.trim().length === 0) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: "Header 'x-webhook-idempotency-key' is required"
      }
    });
    return;
  }

  next();
};

export const validatePaymentWebhookRequest = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const { parsedBody, providerReference } = extractPaymentWebhookRequest(req);
  const rawStatus = parsedBody.status ?? req.query.status ?? req.query.Status;
  const query = req.query as Record<string, unknown>;
  const trackingIdCandidates = [
    ...collectCandidates(parsedBody, ['OrderTrackingId', 'orderTrackingId', 'order_tracking_id']),
    ...collectCandidates(query, ['OrderTrackingId', 'orderTrackingId', 'order_tracking_id']),
  ];
  const notificationTypeCandidates = [
    ...collectCandidates(parsedBody, ['OrderNotificationType', 'orderNotificationType', 'order_notification_type']),
    ...collectCandidates(query, ['OrderNotificationType', 'orderNotificationType', 'order_notification_type']),
  ];
  const merchantReferenceCandidates = [
    ...collectCandidates(parsedBody, [
      'OrderMerchantReference',
      'orderMerchantReference',
      'order_merchant_reference',
      'merchantReference',
      'merchant_reference',
      'tx_ref',
    ]),
    ...collectCandidates(query, [
      'OrderMerchantReference',
      'orderMerchantReference',
      'order_merchant_reference',
      'merchantReference',
      'merchant_reference',
      'tx_ref',
    ]),
  ];

  if (!providerReference) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'OrderTrackingId is required'
      }
    });
    return;
  }

  if (trackingIdCandidates.length > 0) {
    const rawTrackingId = trackingIdCandidates[0];
    if (typeof rawTrackingId !== 'string' || rawTrackingId.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'OrderTrackingId must be a non-empty string'
        }
      });
      return;
    }
  }

  if (typeof rawStatus !== 'string' || rawStatus.trim().length === 0) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Webhook status is required'
      }
    });
    return;
  }

  if (notificationTypeCandidates.length > 0) {
    const rawNotificationType = notificationTypeCandidates[0];
    if (typeof rawNotificationType !== 'string' || rawNotificationType.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'OrderNotificationType must be a non-empty string'
        }
      });
      return;
    }
  }

  if (merchantReferenceCandidates.length > 0) {
    const rawMerchantReference = merchantReferenceCandidates[0];
    if (typeof rawMerchantReference !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'OrderMerchantReference must be a string'
        }
      });
      return;
    }
  }

  next();
};
