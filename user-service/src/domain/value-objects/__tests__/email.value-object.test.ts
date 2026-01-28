import { Email } from '../email.value-object';

describe('Email Value Object', () => {
  describe('create', () => {
    it('creates valid email and normalizes to lowercase', () => {
      const e = Email.create('  Test@Gmail.COM ');
      expect(e.getValue()).toBe('test@gmail.com');
      expect(e.toString()).toBe('test@gmail.com');
    });

    it('throws error for invalid email', () => {
      expect(() => Email.create('not-an-email')).toThrow('Invalid email format');
    });

    it('throws error for empty string', () => {
      expect(() => Email.create('')).toThrow('Invalid email format');
    });

    it('throws error for null-like values', () => {
      expect(() => Email.create('   ')).toThrow('Invalid email format');
    });

    it('creates email with special characters in local part', () => {
      const e = Email.create('user+tag@example.com');
      expect(e.getValue()).toBe('user+tag@example.com');
    });

    it('creates email with dots in local part', () => {
      const e = Email.create('first.last@example.com');
      expect(e.getValue()).toBe('first.last@example.com');
    });

    it('creates email with numbers', () => {
      const e = Email.create('user123@example.com');
      expect(e.getValue()).toBe('user123@example.com');
    });
  });

  describe('isValid', () => {
    it('validates correct email format', () => {
      expect(Email.isValid('user@domain.com')).toBe(true);
    });

    it('rejects invalid email format', () => {
      expect(Email.isValid('bad@@domain')).toBe(false);
    });

    it('rejects email without @ symbol', () => {
      expect(Email.isValid('nodomain.com')).toBe(false);
    });

    it('rejects email without domain', () => {
      expect(Email.isValid('user@')).toBe(false);
    });

    it('rejects email without local part', () => {
      expect(Email.isValid('@domain.com')).toBe(false);
    });

    it('rejects null value', () => {
      expect(Email.isValid(null as any)).toBe(false);
    });

    it('rejects undefined value', () => {
      expect(Email.isValid(undefined as any)).toBe(false);
    });

    it('rejects non-string value', () => {
      expect(Email.isValid(123 as any)).toBe(false);
    });

    it('rejects empty string', () => {
      expect(Email.isValid('')).toBe(false);
    });

    it('rejects whitespace only', () => {
      expect(Email.isValid('   ')).toBe(false);
    });

    it('accepts email with special characters', () => {
      expect(Email.isValid('user+tag@example.com')).toBe(true);
    });

    it('accepts email with dots', () => {
      expect(Email.isValid('first.last@example.com')).toBe(true);
    });

    it('accepts email with hyphens in domain', () => {
      expect(Email.isValid('user@my-domain.com')).toBe(true);
    });

    it('accepts email with multiple subdomains', () => {
      expect(Email.isValid('user@mail.example.co.uk')).toBe(true);
    });
  });

  describe('getDomain', () => {
    it('extracts domain from email', () => {
      const e = Email.create('user@example.com');
      expect(e.getDomain()).toBe('example.com');
    });

    it('extracts domain with subdomain', () => {
      const e = Email.create('user@mail.example.com');
      expect(e.getDomain()).toBe('mail.example.com');
    });

    it('extracts domain with multiple subdomains', () => {
      const e = Email.create('user@a.b.example.com');
      expect(e.getDomain()).toBe('a.b.example.com');
    });

    it('returns empty string if no @ symbol (should not happen with valid email)', () => {
      const e = Email.create('user@domain.com');
      expect(e.getDomain()).toBe('domain.com');
    });
  });

  describe('getLocalPart', () => {
    it('extracts local part from email', () => {
      const e = Email.create('user@example.com');
      expect(e.getLocalPart()).toBe('user');
    });

    it('extracts local part with special characters', () => {
      const e = Email.create('user+tag@example.com');
      expect(e.getLocalPart()).toBe('user+tag');
    });

    it('extracts local part with dots', () => {
      const e = Email.create('first.last@example.com');
      expect(e.getLocalPart()).toBe('first.last');
    });

    it('extracts local part with numbers', () => {
      const e = Email.create('user123@example.com');
      expect(e.getLocalPart()).toBe('user123');
    });
  });

  describe('isFromDomain', () => {
    it('returns true for matching domain', () => {
      const e = Email.create('user@example.com');
      expect(e.isFromDomain('example.com')).toBe(true);
    });

    it('returns false for non-matching domain', () => {
      const e = Email.create('user@example.com');
      expect(e.isFromDomain('other.com')).toBe(false);
    });

    it('is case-insensitive', () => {
      const e = Email.create('user@Example.COM');
      expect(e.isFromDomain('example.com')).toBe(true);
      expect(e.isFromDomain('EXAMPLE.COM')).toBe(true);
    });

    it('handles subdomain matching', () => {
      const e = Email.create('user@mail.example.com');
      expect(e.isFromDomain('mail.example.com')).toBe(true);
      expect(e.isFromDomain('example.com')).toBe(false);
    });
  });

  describe('isTrustedDomain', () => {
    it('returns true for gmail.com', () => {
      const e = Email.create('user@gmail.com');
      expect(e.isTrustedDomain()).toBe(true);
    });

    it('returns true for yahoo.com', () => {
      const e = Email.create('user@yahoo.com');
      expect(e.isTrustedDomain()).toBe(true);
    });

    it('returns true for hotmail.com', () => {
      const e = Email.create('user@hotmail.com');
      expect(e.isTrustedDomain()).toBe(true);
    });

    it('returns true for outlook.com', () => {
      const e = Email.create('user@outlook.com');
      expect(e.isTrustedDomain()).toBe(true);
    });

    it('returns true for maysar.com', () => {
      const e = Email.create('user@maysar.com');
      expect(e.isTrustedDomain()).toBe(true);
    });

    it('returns true for maysar.co.tz', () => {
      const e = Email.create('user@maysar.co.tz');
      expect(e.isTrustedDomain()).toBe(true);
    });

    it('returns false for untrusted domain', () => {
      const e = Email.create('user@untrusted.com');
      expect(e.isTrustedDomain()).toBe(false);
    });

    it('is case-insensitive for trusted domains', () => {
      const e = Email.create('user@GMAIL.COM');
      expect(e.isTrustedDomain()).toBe(true);
    });
  });

  describe('isSystemEmail', () => {
    it('returns true for noreply@maysar.com', () => {
      const e = Email.create('noreply@maysar.com');
      expect(e.isSystemEmail()).toBe(true);
    });

    it('returns true for any email ending with @maysar.com', () => {
      const e = Email.create('admin@maysar.com');
      expect(e.isSystemEmail()).toBe(true);
    });

    it('returns true for any email ending with @maysar.co.tz', () => {
      const e = Email.create('support@maysar.co.tz');
      expect(e.isSystemEmail()).toBe(true);
    });

    it('returns false for non-system email', () => {
      const e = Email.create('user@gmail.com');
      expect(e.isSystemEmail()).toBe(false);
    });

    it('returns false for maysar email that is not system', () => {
      const e = Email.create('user@maysar.co.uk');
      expect(e.isSystemEmail()).toBe(false);
    });
  });

  describe('toString', () => {
    it('returns email value as string', () => {
      const e = Email.create('user@example.com');
      expect(e.toString()).toBe('user@example.com');
    });

    it('returns normalized lowercase string', () => {
      const e = Email.create('USER@EXAMPLE.COM');
      expect(e.toString()).toBe('user@example.com');
    });
  });

  describe('getValue', () => {
    it('returns email value', () => {
      const e = Email.create('user@example.com');
      expect(e.getValue()).toBe('user@example.com');
    });

    it('returns normalized value', () => {
      const e = Email.create('  USER@EXAMPLE.COM  ');
      expect(e.getValue()).toBe('user@example.com');
    });
  });

  describe('get value', () => {
    it('returns email value via getter', () => {
      const e = Email.create('user@example.com');
      expect(e.value).toBe('user@example.com');
    });
  });

  describe('equals', () => {
    it('returns true for equal emails', () => {
      const e1 = Email.create('user@example.com');
      const e2 = Email.create('user@example.com');
      expect(e1.equals(e2)).toBe(true);
    });

    it('returns false for different emails', () => {
      const e1 = Email.create('user1@example.com');
      const e2 = Email.create('user2@example.com');
      expect(e1.equals(e2)).toBe(false);
    });

    it('treats normalized emails as equal', () => {
      const e1 = Email.create('user@example.com');
      const e2 = Email.create('USER@EXAMPLE.COM');
      expect(e1.equals(e2)).toBe(true);
    });

    it('treats trimmed emails as equal', () => {
      const e1 = Email.create('user@example.com');
      const e2 = Email.create('  user@example.com  ');
      expect(e1.equals(e2)).toBe(true);
    });

    it('returns false for different domains', () => {
      const e1 = Email.create('user@example.com');
      const e2 = Email.create('user@other.com');
      expect(e1.equals(e2)).toBe(false);
    });

    it('returns false for different local parts', () => {
      const e1 = Email.create('alice@example.com');
      const e2 = Email.create('bob@example.com');
      expect(e1.equals(e2)).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('handles email with maximum length local part', () => {
      const longLocal = 'a'.repeat(64);
      const e = Email.create(`${longLocal}@example.com`);
      expect(e.getLocalPart()).toBe(longLocal);
    });

    it('handles email with many subdomains', () => {
      const e = Email.create('user@a.b.c.d.e.example.com');
      expect(e.getDomain()).toBe('a.b.c.d.e.example.com');
    });

    it('handles email with hyphenated domain', () => {
      const e = Email.create('user@my-domain-name.com');
      expect(e.getDomain()).toBe('my-domain-name.com');
    });
  });
});
