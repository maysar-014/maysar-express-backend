import { ReportSecurityBreachUseCase } from '../report-security-breach.use-case';
import { UserRole } from '../../../domain/types/user.types';
import { UserFactory } from '../../../domain/entities/__tests__/user.factory';

jest.mock('../../../application/sagas/saga-event-handler');

describe('ReportSecurityBreachUseCase', () => {
  it('returns not found when user missing', async () => {
    const repo: any = { findById: jest.fn().mockResolvedValue(null) };
    const mockEmailService: any = { sendEmail: jest.fn() };
    const mockNotificationClient: any = { notify: jest.fn() };
    const sut = new ReportSecurityBreachUseCase(repo, mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'x', breachType: 'suspicious_login', severity: 'high', details: {} });
    expect(out.success).toBe(false);
    expect(out.message).toContain('User not found');
  });

  it('rejects invalid breach type', async () => {
    const user = UserFactory.create({ id: 'u1' });
    const repo: any = { findById: jest.fn().mockResolvedValue(user) };
    const mockEmailService: any = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    const mockNotificationClient: any = { notify: jest.fn().mockResolvedValue(undefined) };
    const sut = new ReportSecurityBreachUseCase(repo, mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'u1', breachType: 'invalid' as any, severity: 'high', details: {} });
    expect(out.success).toBe(false);
    expect(out.message).toContain('Invalid breach type');
  });

  it('rejects invalid severity', async () => {
    const user = UserFactory.create({ id: 'u1' });
    const repo: any = { findById: jest.fn().mockResolvedValue(user) };
    const mockEmailService: any = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    const mockNotificationClient: any = { notify: jest.fn().mockResolvedValue(undefined) };
    const sut = new ReportSecurityBreachUseCase(repo, mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'u1', breachType: 'suspicious_login', severity: 'invalid' as any, details: {} });
    expect(out.success).toBe(false);
    expect(out.message).toContain('Invalid severity');
  });

  it('reports suspicious login', async () => {
    const user = UserFactory.create({ id: 'u1' });
    const repo: any = {
      findById: jest.fn().mockResolvedValue(user),
      recordSecurityEvent: jest.fn().mockResolvedValue({ id: 'alert-123' })
    };
    const mockEmailService: any = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    const mockNotificationClient: any = { notify: jest.fn().mockResolvedValue(undefined) };
    const sut = new ReportSecurityBreachUseCase(repo, mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'u1', breachType: 'suspicious_login', severity: 'high', details: { location: 'unknown' } });
    expect(out.success).toBe(true);
    expect(out.alertId).toBeDefined();
  });

  it('reports multiple failed attempts', async () => {
    const user = UserFactory.create({ id: 'u1' });
    const repo: any = {
      findById: jest.fn().mockResolvedValue(user),
      recordSecurityEvent: jest.fn().mockResolvedValue({ id: 'alert-456' })
    };
    const mockEmailService: any = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    const mockNotificationClient: any = { notify: jest.fn().mockResolvedValue(undefined) };
    const sut = new ReportSecurityBreachUseCase(repo, mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'u1', breachType: 'multiple_failed_attempts', severity: 'medium', details: { attempts: 5 } });
    expect(out.success).toBe(true);
    expect(out.alertId).toBeDefined();
  });

  it('handles errors gracefully', async () => {
    const repo: any = { findById: jest.fn().mockRejectedValue(new Error('DB error')) };
    const mockEmailService: any = { sendEmail: jest.fn() };
    const mockNotificationClient: any = { notify: jest.fn() };
    const sut = new ReportSecurityBreachUseCase(repo, mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'u1', breachType: 'suspicious_login', severity: 'high', details: {} });
    expect(out.success).toBe(false);
  });
});
