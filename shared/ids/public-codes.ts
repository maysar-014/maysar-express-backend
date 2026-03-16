import { randomBytes } from 'crypto';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DEFAULT_LENGTH = 6;

const randomChars = (length: number): string => {
  const bytes = randomBytes(length);
  let output = '';
  for (let i = 0; i < length; i += 1) {
    output += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return output;
};

const normalize = (value: string): string => value.trim().toUpperCase();

export const generatePublicUserCode = (): string => {
  return `MYS-${randomChars(DEFAULT_LENGTH)}`;
};

export const generateEnablerCode = (): string => {
  return `ENB-${randomChars(DEFAULT_LENGTH)}`;
};

export const normalizeEnablerCode = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const normalized = normalize(value);
  const compact = normalized.replace(/[\s-]/g, '');

  if (/^ENB[A-Z0-9]{6}$/.test(compact)) {
    return `ENB-${compact.slice(3)}`;
  }

  if (/^E[A-Z0-9]{6}$/.test(compact)) {
    return `ENB-${compact.slice(1)}`;
  }

  return null;
};

export const toShortEnablerCode = (value: string | null | undefined): string | null => {
  const normalized = normalizeEnablerCode(value);
  if (!normalized) return null;
  return `E${normalized.slice(4)}`;
};

export const isPublicUserCode = (value: string | null | undefined): boolean => {
  if (!value) return false;
  return /^MYS-[A-Z0-9]{6}$/.test(normalize(value));
};

export const isEnablerCode = (value: string | null | undefined): boolean => {
  return normalizeEnablerCode(value) !== null;
};
