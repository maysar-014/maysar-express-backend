import type { ReportSecurityBreachDTO } from './report-security-breach.dto';

describe('ReportSecurityBreachDTO', () => {
  it('supports breach report request/response contracts', () => {
    const request: ReportSecurityBreachDTO.Request = {
      userId: 'user-9',
      breachType: 'suspicious_login',
      severity: 'high',
      details: { ip: '127.0.0.1' },
      reportedBy: 'system'
    };
    const response: ReportSecurityBreachDTO.Response = {
      success: true,
      message: 'Security alert created',
      alertId: 'alert-1'
    };

    expect(request.breachType).toBe('suspicious_login');
    expect(response.alertId).toBe('alert-1');
  });
});
