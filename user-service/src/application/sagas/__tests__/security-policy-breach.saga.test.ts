import { executeSecurityPolicyBreachSaga, SecurityPolicyBreachEvent } from '../security-policy-breach.saga';
import { notificationClient, auditClient, sessionClient } from '../service-clients';

jest.mock('../service-clients');
jest.mock('../../../infrastructure/services/logger.service');

describe('Security Policy Breach Saga', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auditClient.recordEvent as jest.Mock).mockResolvedValue(undefined);
    (notificationClient.sendEmail as jest.Mock).mockResolvedValue(undefined);
    (sessionClient.invalidateUserSessions as jest.Mock).mockResolvedValue(undefined);
  });

  test('handles low severity suspicious login', async () => {
    const event: SecurityPolicyBreachEvent = {
      eventId: 'evt-1',
      aggregateId: 'agg-1',
      userId: 'user-1',
      breachType: 'suspicious_login',
      severity: 'low',
      details: { ip: '192.168.1.1' },
      timestamp: new Date()
    };

    await executeSecurityPolicyBreachSaga(event);

    expect(auditClient.recordEvent).toHaveBeenCalledWith('security_team', 'breach_alert', expect.any(Object));
    expect(notificationClient.sendEmail).toHaveBeenCalledWith('user-1', 'security_alert', expect.any(Object));
    expect(sessionClient.invalidateUserSessions).not.toHaveBeenCalled();
  });

  test('handles critical severity with session termination', async () => {
    const event: SecurityPolicyBreachEvent = {
      eventId: 'evt-2',
      aggregateId: 'agg-2',
      userId: 'user-2',
      breachType: 'location_anomaly',
      severity: 'critical',
      details: {},
      timestamp: new Date()
    };

    await executeSecurityPolicyBreachSaga(event);

    expect(sessionClient.invalidateUserSessions).toHaveBeenCalledWith('user-2', expect.stringContaining('Security breach'));
    expect(notificationClient.sendEmail).toHaveBeenCalledWith('user-2', 'security_alert_critical', expect.any(Object));
  });

  test('sends critical alert email for critical severity', async () => {
    const event: SecurityPolicyBreachEvent = {
      eventId: 'evt-3',
      aggregateId: 'agg-3',
      userId: 'user-3',
      breachType: 'suspicious_login',
      severity: 'critical',
      details: {},
      timestamp: new Date()
    };

    await executeSecurityPolicyBreachSaga(event);

    expect(notificationClient.sendEmail).toHaveBeenCalledWith('user-3', 'security_alert_critical', expect.any(Object));
  });

  test('sends regular alert email for non-critical severity', async () => {
    const event: SecurityPolicyBreachEvent = {
      eventId: 'evt-4',
      aggregateId: 'agg-4',
      userId: 'user-4',
      breachType: 'suspicious_login',
      severity: 'low',
      details: {},
      timestamp: new Date()
    };

    await executeSecurityPolicyBreachSaga(event);

    expect(notificationClient.sendEmail).toHaveBeenCalledWith('user-4', 'security_alert', expect.any(Object));
  });

  test('handles audit recording failure', async () => {
    const event: SecurityPolicyBreachEvent = {
      eventId: 'evt-5',
      aggregateId: 'agg-5',
      userId: 'user-5',
      breachType: 'suspicious_login',
      severity: 'medium',
      details: {},
      timestamp: new Date()
    };

    (auditClient.recordEvent as jest.Mock).mockRejectedValueOnce(new Error('Audit error'));

    await expect(executeSecurityPolicyBreachSaga(event)).rejects.toThrow('Audit error');
  });

  test('handles session termination failure', async () => {
    const event: SecurityPolicyBreachEvent = {
      eventId: 'evt-6',
      aggregateId: 'agg-6',
      userId: 'user-6',
      breachType: 'location_anomaly',
      severity: 'critical',
      details: {},
      timestamp: new Date()
    };

    (sessionClient.invalidateUserSessions as jest.Mock).mockRejectedValueOnce(new Error('Session error'));

    await expect(executeSecurityPolicyBreachSaga(event)).rejects.toThrow('Session error');
  });

  test('handles multiple_failed_attempts breach type', async () => {
    const event: SecurityPolicyBreachEvent = {
      eventId: 'evt-7',
      aggregateId: 'agg-7',
      userId: 'user-7',
      breachType: 'multiple_failed_attempts',
      severity: 'medium',
      details: { attempts: 5 },
      timestamp: new Date()
    };

    await executeSecurityPolicyBreachSaga(event);

    expect(auditClient.recordEvent).toHaveBeenCalled();
  });

  test('handles unusual_activity breach type', async () => {
    const event: SecurityPolicyBreachEvent = {
      eventId: 'evt-8',
      aggregateId: 'agg-8',
      userId: 'user-8',
      breachType: 'unusual_activity',
      severity: 'high',
      details: {},
      timestamp: new Date()
    };

    await executeSecurityPolicyBreachSaga(event);

    expect(auditClient.recordEvent).toHaveBeenCalled();
  });
});
