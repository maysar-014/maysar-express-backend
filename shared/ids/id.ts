import { randomBytes } from 'crypto';

const CROCKFORD_BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const DOMAIN_PREFIXES: Record<string, string> = {
  Auth: 'ath',
  Analytics: 'ana',
  BusinessRegistry: 'biz',
  Catalog: 'cat',
  Checkout: 'chk',
  Commission: 'com',
  Community: 'cmm',
  Compliance: 'cmp',
  Enabler: 'enb',
  Inventory: 'inv',
  Logistics: 'log',
  Maps: 'map',
  Notification: 'ntf',
  Order: 'ord',
  Payment: 'pay',
  Payout: 'pyo',
  Production: 'prd',
  Support: 'sup',
  Training: 'trn',
  User: 'usr',
  Wallet: 'wal',
  // Seller location & inventory (catalog sub-domain)
  SellerLocation: 'sloc',
  ProductLocation: 'ploc',
  StockTransfer: 'xfr',
  FulfillmentSelection: 'fsel',
};

const modelHasId = new Set<string>();

const encodeBase32 = (value: bigint, length: number): string => {
  let output = '';
  let remaining = value;
  for (let i = 0; i < length; i++) {
    const index = Number(remaining % 32n);
    output = CROCKFORD_BASE32[index] + output;
    remaining = remaining / 32n;
  }
  return output;
};

const encodeTime = (timeMs: number): string => {
  return encodeBase32(BigInt(timeMs), 10);
};

const encodeRandom = (): string => {
  const bytes = randomBytes(10); // 80 bits
  const hex = bytes.toString('hex');
  const value = BigInt(`0x${hex}`);
  return encodeBase32(value, 16);
};

export const createUlid = (): string => {
  return `${encodeTime(Date.now())}${encodeRandom()}`;
};

const camelCaseWords = (value: string): string[] => {
  if (!value) return [];
  return value.split(/(?=[A-Z])/).filter(Boolean);
};

const toPrefixCode = (value: string): string => {
  const words = camelCaseWords(value);
  if (words.length >= 2) {
    const first = words[0].slice(0, 3);
    const second = words[1].slice(0, 3);
    return `${first}${second}`.toLowerCase();
  }
  const base = words.length > 0 ? words[0] : value;
  return base.slice(0, 3).toLowerCase();
};

const stripLeading = (value: string, prefix: string): string => {
  if (!value) return value;
  if (value.toLowerCase().startsWith(prefix.toLowerCase())) {
    return value.slice(prefix.length);
  }
  return value;
};

export const getModelPrefix = (modelName?: string | null): string => {
  if (!modelName) return 'obj';

  const [domainRaw, entityRaw] = modelName.split('_');
  let resolvedDomain = domainRaw || modelName;
  let resolvedEntity: string | undefined = entityRaw;

  const domainKeys = Object.keys(DOMAIN_PREFIXES);
  let domainKey = domainKeys.find(
    key => key.toLowerCase() === resolvedDomain.toLowerCase()
  );

  if (!domainKey) {
    const prefixKey = domainKeys
      .sort((a, b) => b.length - a.length)
      .find(key => modelName.toLowerCase().startsWith(key.toLowerCase()));

    if (prefixKey) {
      domainKey = prefixKey;
      resolvedDomain = prefixKey;
      const remainder = modelName.slice(prefixKey.length);
      resolvedEntity = remainder ? remainder.replace(/^_/, '') : undefined;
    }
  }

  const domainCode = (domainKey ? DOMAIN_PREFIXES[domainKey] : undefined)
    || resolvedDomain.slice(0, 3).toLowerCase();

  if (!resolvedEntity || resolvedEntity === resolvedDomain) {
    return domainCode;
  }

  const strippedEntity = stripLeading(resolvedEntity, resolvedDomain);
  const entityCode = toPrefixCode(strippedEntity || resolvedEntity);
  if (!entityCode || entityCode === domainCode) {
    return domainCode;
  }
  return `${domainCode}_${entityCode}`;
};

export const makeId = (prefix: string): string => {
  return `${prefix}_${createUlid()}`;
};

/**
 * Generate a Master Order ID in the format MSR-MO-{YYYYMMDD}-{6 uppercase alphanumeric}
 * Example: MSR-MO-20260823-A3K7PQ
 */
export const makeMasterOrderId = (): string => {
  const now = new Date();
  const yyyy = now.getUTCFullYear().toString();
  const mm = (now.getUTCMonth() + 1).toString().padStart(2, '0');
  const dd = now.getUTCDate().toString().padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;

  // 6 uppercase alphanumeric chars from crypto random
  const chars = 'ABCDEFGHJKMNPQRSTVWXYZ0123456789'; // Crockford-safe chars
  const bytes = randomBytes(6);
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars[bytes[i] % chars.length];
  }

  return `MSR-MO-${dateStr}-${suffix}`;
};

export const isPrefixedUlid = (value: string): boolean => {
  if (!value) return false;
  const pattern = /^[a-z]{2,6}(?:_[a-z]{2,6})?_[0-9A-HJKMNP-TV-Z]{26}$/;
  return pattern.test(value);
};

export const isSystemId = (value: string): boolean => {
  if (!value) return false;
  if (isPrefixedUlid(value)) return true;
  // allow legacy UUID/CUID for backward compatibility
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(value)) return true;
  const cuidRegex = /^c[a-z0-9]{24,}$/i;
  return cuidRegex.test(value);
};

export const registerModelIds = (
  models: ReadonlyArray<{ name: string; fields?: ReadonlyArray<{ name?: string }> }>
): void => {
  models.forEach(model => {
    const fields = Array.isArray(model.fields) ? model.fields : [];
    const hasIdField = fields.some(field => field?.name === 'id');
    if (hasIdField) {
      modelHasId.add(model.name);
    }
  });
};

export const modelSupportsId = (modelName?: string | null): boolean => {
  if (!modelName) return false;
  return modelHasId.has(modelName);
};
