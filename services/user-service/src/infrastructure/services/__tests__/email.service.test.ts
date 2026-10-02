import { InMemoryEmailService, SMTPService } from '../email.service';

describe('InMemoryEmailService', () => {
  let svc: InMemoryEmailService;

  beforeEach(() => {
    svc = new InMemoryEmailService();
    svc.clearSentEmails();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('sends verification, reset, welcome and security emails', async () => {
    await svc.sendVerificationEmail('a@b.com', 'token123');
    await svc.sendPasswordResetEmail('a@b.com', 'reset123');
    await svc.sendWelcomeEmail('a@b.com', 'Alice');
    await svc.sendSecurityAlert('a@b.com', 'suspicious', { ip: '1.2.3.4' });

    const sent = svc.getSentEmails();
    expect(sent.length).toBeGreaterThanOrEqual(4);
    expect(sent[0]?.to).toBe('a@b.com');
  });
});

describe('SMTPService configuration', () => {
  // SMTPService reads SMTP_* in its constructor, so this suite must control the
  // environment. Previously it inherited whatever the developer or CI had
  // exported: with credentials present the transporter was built,
  // getTransporter() did not throw, and the test attempted a REAL outbound SMTP
  // send instead of asserting the unconfigured path it claims to cover.
  const SMTP_VARS = [
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_PORT',
    'SMTP_SECURE',
    'SMTP_FROM',
    'SMTP_FROM_NAME',
  ] as const;

  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = Object.fromEntries(SMTP_VARS.map((k) => [k, process.env[k]]));
    for (const k of SMTP_VARS) delete process.env[k];
  });

  afterEach(() => {
    for (const k of SMTP_VARS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('throws when SMTP is not configured', async () => {
    const smtp = new SMTPService();
    await expect(smtp.sendEmail('x@y.com', 'hi', '<p>hi</p>')).rejects.toThrow('SMTP is not configured');
  });

  it('throws for every templated sender, not just sendEmail', async () => {
    const smtp = new SMTPService();
    await expect(smtp.sendVerificationEmail('x@y.com', 'tok')).rejects.toThrow('SMTP is not configured');
    await expect(smtp.sendPasswordResetEmail('x@y.com', 'tok')).rejects.toThrow('SMTP is not configured');
    await expect(smtp.sendWelcomeEmail('x@y.com', 'Alice')).rejects.toThrow('SMTP is not configured');
    await expect(smtp.sendSecurityAlert('x@y.com', 'suspicious', {})).rejects.toThrow('SMTP is not configured');
  });
});
