import { Request } from 'express';

interface JsonMap {
  [key: string]: unknown;
}

export interface ParsedPaymentWebhookRequest {
  parsedBody: JsonMap;
  providerReference?: string;
  providerTransactionId?: string;
  paymentStatus: string;
  merchantReference?: string;
  notificationType?: string;
}

const asRecord = (value: unknown): JsonMap => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as JsonMap;
};

const readString = (...candidates: unknown[]): string | undefined => {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }

    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return String(candidate);
    }

    if (Array.isArray(candidate)) {
      const match = candidate.find((entry) => (
        (typeof entry === 'string' && entry.trim().length > 0)
        || (typeof entry === 'number' && Number.isFinite(entry))
      ));
      if (typeof match === 'string') {
        return match.trim();
      }
      if (typeof match === 'number' && Number.isFinite(match)) {
        return String(match);
      }
    }
  }

  return undefined;
};

const parseBody = (body: unknown): JsonMap => {
  if (Buffer.isBuffer(body)) {
    try {
      return asRecord(JSON.parse(body.toString('utf8') || '{}'));
    } catch {
      return {};
    }
  }

  return asRecord(body);
};

export const extractPaymentWebhookRequest = (req: Request): ParsedPaymentWebhookRequest => {
  const parsedBody = parseBody(req.body);
  const data = asRecord(parsedBody.data);
  const query = req.query as Record<string, unknown>;

  const providerReference = readString(
    parsedBody.OrderTrackingId,
    parsedBody.orderTrackingId,
    parsedBody.order_tracking_id,
    data.OrderTrackingId,
    data.orderTrackingId,
    data.order_tracking_id,
    query.OrderTrackingId,
    query.orderTrackingId,
    query.order_tracking_id
  );

  const merchantReference = readString(
    parsedBody.OrderMerchantReference,
    parsedBody.orderMerchantReference,
    parsedBody.order_merchant_reference,
    parsedBody.merchant_reference,
    parsedBody.merchantReference,
    parsedBody.tx_ref,
    data.OrderMerchantReference,
    data.orderMerchantReference,
    data.order_merchant_reference,
    data.merchant_reference,
    data.merchantReference,
    data.tx_ref,
    query.OrderMerchantReference,
    query.orderMerchantReference,
    query.order_merchant_reference,
    query.merchant_reference,
    query.merchantReference,
    query.tx_ref
  );

  const providerTransactionId = readString(
    parsedBody.id,
    parsedBody.tracking_id,
    parsedBody.transaction_id,
    data.id,
    data.tracking_id,
    data.transaction_id,
    query.id,
    providerReference,
    merchantReference
  );

  const paymentStatus = readString(parsedBody.status, data.status, query.Status, query.status) ?? 'PENDING';

  const notificationType = readString(
    parsedBody.OrderNotificationType,
    parsedBody.orderNotificationType,
    parsedBody.order_notification_type,
    data.OrderNotificationType,
    data.orderNotificationType,
    data.order_notification_type,
    query.OrderNotificationType,
    query.orderNotificationType,
    query.order_notification_type
  );

  return {
    parsedBody,
    providerReference,
    providerTransactionId,
    paymentStatus,
    merchantReference,
    notificationType,
  };
};
