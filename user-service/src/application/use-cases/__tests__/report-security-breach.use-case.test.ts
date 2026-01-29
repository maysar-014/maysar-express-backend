import { ReportSecurityBreachUseCase } from '../report-security-breach.use-case';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.value-object';
import { PhoneNumber } from '../../../domain/value-objects/phone-number.value-object';
import { UserRole } from '../../../domain/types/user.types';

describe('ReportSecurityBreachUseCase', () => {
  it('returns not found when user missing', async () => {
    const repo: any = { findById: jest.fn().mockResolvedValue(null) };
    const sut = new ReportSecurityBreachUseCase(repo);
    const out = await sut.execute({ userId: 'x', breachType: 'suspicious_login', severity: 'high', details: {} });
    expect(out.success).toBe(false);
    expect(out.message).toContain('User not found');
  });

  it('rejects invalid breach type', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    const repo: any = { findById: jest.fn().mockResolvedValue(user) };
    const sut = new ReportSecurityBreachUseCase(repo);
    const out = await sut.execute({ userId: 'u1', breachType: 'invalid' as any, severity: 'high', details: {} });
    expect(out.success).toBe(false);
    expect(out.message).toContain('Invalid breach type');
  });

  it('rejects invalid severity', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    const repo: any = { findById: jest.fn().mockResolvedValue(user) };
    const sut = new ReportSecurityBreachUseCase(repo);
    const out = await sut.execute({ userId: 'u1', breachType: 'suspicious_login', severity: 'invalid' as any, details: {} });
    expect(out.success).toBe(false);
    expect(out.message).toContain('Invalid severity');
  });

  it('reports suspicious login', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    const repo: any = { findById: jest.fn().mockResolvedValue(user), recordSecurityEvent: jest.fn() };
    const sut = new ReportSecurityBreachUseCase(repo);
    const out = await sut.execute({ userId: 'u1', breachType: 'suspicious_login', severity: 'high', details: { location: 'unknown' } });
    expect(out.success).toBe(true);
    expect(out.alertId).toBeDefined();
  });

  it('reports multiple failed attempts', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    const repo: any = { findById: jest.fn().mockResolvedValue(user), recordSecurityEvent: jest.fn() };
    const sut = new ReportSecurityBreachUseCase(repo);
    const out = await sut.execute({ userId: 'u1', breachType: 'multiple_failed_attempts', severity: 'medium', details: { attempts: 5 } });
    expect(out.success).toBe(true);
    expect(out.alertId).toBeDefined();
  });

  it('handles errors gracefully', async () => {
    const repo: any = { findById: jest.fn().mockRejectedValue(new Error('DB error')) };
    const sut = new ReportSecurityBreachUseCase(repo);
    const out = await sut.execute({ userId: 'u1', breachType: 'suspicious_login', severity: 'high', details: {} });
    expect(out.success).toBe(false);
  });
});
