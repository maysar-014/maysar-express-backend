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

describe('SMTPService fallback', () => {
  it('delegates to in-memory fallback and logs', async () => {
    const smtp = new SMTPService();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    await expect(smtp.sendEmail('x@y.com', 'hi', '<p>hi</p>')).resolves.toBeUndefined();
  });
});
