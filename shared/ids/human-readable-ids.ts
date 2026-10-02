import Joi from 'joi';
import { z } from 'zod';

/**
 * Human-readable identifier contract — single source of truth.
 *
 * Every identifier a customer, courier or agent may read over the phone or type
 * by hand uses one of the formats below. Order numbers and shipment tracking
 * numbers are deliberately SEPARATE namespaces:
 *
 *   1. ORDER NUMBER       ORD-YYYYMMDD-NLNL
 *      Example: ORD-20260927-3C8B
 *      Identifies the whole order for its entire lifecycle (one order may span
 *      several sellers and therefore several shipments). An order number is
 *      NEVER a shipment tracking identifier.
 *
 *   2. SHIPMENT TRACKING NUMBER  TRK-NLNLNL
 *      Example: TRK-3C8B2D
 *      One independent tracking number per shipment (per seller group). No date
 *      component: it is short, stable for the shipment's life and unique.
 *
 *   3. TRANSACTION ID     TXN-YYYYMMDD-NLNL
 *      Example: TXN-20260927-3C8B
 *
 *   N = digit from 2-9
 *   L = uppercase letter, A-Z excluding I, L and O
 *
 * Readability rules: 0, 1, O, I and L are excluded from the RANDOM parts so a
 * value can never be mis-heard or mis-typed as another value (0/O, 1/I/L).
 * The calendar part of `YYYYMMDD` is real calendar data and keeps its zeros and
 * ones — it is never ambiguous because its position and width are fixed.
 */

/** Digits used in random parts (no 0, no 1). */
export const HUMAN_ID_DIGITS = '23456789';

/** Letters used in random parts (A-Z without I, L and O). */
export const HUMAN_ID_LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ';

export const ORDER_NUMBER_PREFIX = 'ORD';
export const SHIPMENT_TRACKING_PREFIX = 'TRK';
export const TRANSACTION_ID_PREFIX = 'TXN';

const SEPARATOR = '-';

/**
 * `ORD-YYYYMMDD-NLNL` — anchored, no length slack: extra characters, extra
 * segments or a trailing suffix are rejected.
 */
export const ORDER_NUMBER_PATTERN = /^ORD-\d{8}-[2-9][A-HJKMNP-Z][2-9][A-HJKMNP-Z]$/;

/** `TRK-NLNLNL` — anchored, exactly six random characters after the prefix. */
export const SHIPMENT_TRACKING_NUMBER_PATTERN =
  /^TRK-[2-9][A-HJKMNP-Z][2-9][A-HJKMNP-Z][2-9][A-HJKMNP-Z]$/;

/** `TXN-YYYYMMDD-NLNL`. */
export const TRANSACTION_ID_PATTERN = /^TXN-\d{8}-[2-9][A-HJKMNP-Z][2-9][A-HJKMNP-Z]$/;

const randomFrom = (alphabet: string): string =>
  alphabet.charAt(Math.floor(Math.random() * alphabet.length));

const randomDigit = (): string => randomFrom(HUMAN_ID_DIGITS);

const randomLetter = (): string => randomFrom(HUMAN_ID_LETTERS);

/** `NLNL` — alternating digit/letter pairs (pairs keep it pronounceable). */
const randomDigitLetterSequence = (pairs: number): string => {
  let output = '';
  for (let i = 0; i < pairs; i += 1) {
    output += `${randomDigit()}${randomLetter()}`;
  }
  return output;
};

const formatDateStamp = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

/** `ORD-YYYYMMDD-NLNL`, e.g. `ORD-20260927-3C8B`. */
export const makeOrderNumber = (date: Date = new Date()): string =>
  [ORDER_NUMBER_PREFIX, formatDateStamp(date), randomDigitLetterSequence(2)].join(SEPARATOR);

/** `TRK-NLNLNL`, e.g. `TRK-3C8B2D` — one per shipment, independent of any order. */
export const makeShipmentTrackingNumber = (): string =>
  [SHIPMENT_TRACKING_PREFIX, randomDigitLetterSequence(3)].join(SEPARATOR);

/** `TXN-YYYYMMDD-NLNL`, e.g. `TXN-20260927-3C8B`. */
export const makeTransactionId = (date: Date = new Date()): string =>
  [TRANSACTION_ID_PREFIX, formatDateStamp(date), randomDigitLetterSequence(2)].join(SEPARATOR);


export const isOrderNumber = (value: unknown): value is string =>
  typeof value === 'string' && ORDER_NUMBER_PATTERN.test(value);

export const isShipmentTrackingNumber = (value: unknown): value is string =>
  typeof value === 'string' && SHIPMENT_TRACKING_NUMBER_PATTERN.test(value);

export const isTransactionId = (value: unknown): value is string =>
  typeof value === 'string' && TRANSACTION_ID_PATTERN.test(value);

/** True for an order number OR a shipment tracking number — the tracking lookup key set. */
export const isTrackingLookupIdentifier = (value: unknown): value is string =>
  isOrderNumber(value) || isShipmentTrackingNumber(value);

/**
 * Calendar date encoded in an order number / transaction id (local time, as
 * generated). Returns `null` when the value is not a valid identifier.
 */
export const extractIdentifierDate = (value: unknown): Date | null => {
  if (typeof value !== 'string') return null;
  if (!isOrderNumber(value) && !isTransactionId(value)) return null;

  const dateStamp = value.split(SEPARATOR)[1];
  const year = Number(dateStamp.slice(0, 4));
  const month = Number(dateStamp.slice(4, 6));
  const day = Number(dateStamp.slice(6, 8));
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return null;
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
    return null;
  }
  return parsed;
};

/** Zod schema for order numbers, for request-body/param validation. */
export const zodOrderNumber = (message = 'Invalid order number format') =>
  z.string().refine(isOrderNumber, { message });

/** Zod schema for shipment tracking numbers. */
export const zodShipmentTrackingNumber = (message = 'Invalid tracking number format') =>
  z.string().refine(isShipmentTrackingNumber, { message });

/** Zod schema accepting either identifier — the tracking lookup input. */
export const zodTrackingLookupIdentifier = (
  message = 'Provide a valid order number (ORD-YYYYMMDD-NLNL) or tracking number (TRK-NLNLNL)',
) => z.string().refine(isTrackingLookupIdentifier, { message });

/** Joi schema for order numbers. */
export const joiOrderNumber = (message = 'Invalid order number format') =>
  Joi.string()
    .custom((value, helpers) => (isOrderNumber(value) ? value : helpers.error('any.invalid')))
    .messages({ 'any.invalid': message });

/** Joi schema accepting either identifier — the tracking lookup input. */
export const joiTrackingLookupIdentifier = (
  message = 'Provide a valid order number (ORD-YYYYMMDD-NLNL) or tracking number (TRK-NLNLNL)',
) =>
  Joi.string()
    .custom((value, helpers) =>
      isTrackingLookupIdentifier(value) ? value : helpers.error('any.invalid'),
    )
    .messages({ 'any.invalid': message });
