import { SecurityAuditEngine, securityAuditEngine } from './security-audit';

describe('SecurityAuditEngine', () => {
  const originalEnv = { ...process.env };
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    process.env = { ...originalEnv };
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.OPENWEATHER_API_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
    logSpy.mockRestore();
  });

  it('performs full security audit and returns summary/compliance/recommendations', async () => {
    const engine = new SecurityAuditEngine();
    const report = await engine.performFullSecurityAudit();

    expect(report.summary.totalVulnerabilities).toBe(14);
    expect(report.summary.critical).toBe(0);
    expect(report.summary.high).toBe(5);
    expect(report.summary.medium).toBe(4);
    expect(report.summary.low).toBe(2);
    expect(report.summary.info).toBe(3);
    expect(report.summary.overallRisk).toBe('high');
    expect(report.summary.complianceScore).toBeCloseTo(42, 6);
    expect(report.compliance).toEqual(
      expect.objectContaining({
        inputValidation: false,
        authentication: true,
        authorization: true,
        dataProtection: true,
        secureConfiguration: true,
        owaspTop10: expect.objectContaining({
          A01: false,
          A02: false,
          A03: false,
          A04: false,
          A05: false,
          A06: false,
          A07: false
        })
      })
    );
    expect(report.recommendations).toEqual(
      expect.arrayContaining([
        'Strengthen authentication mechanisms with MFA and secure session management',
        'Implement comprehensive authorization checks and role-based access control',
        'Implement strict input validation and sanitization for all user inputs',
        'Implement proper data sanitization in logs and error messages',
        'Review and harden security configuration for production deployment',
        'Audit cryptographic implementations and key management practices',
        'Implement automated dependency vulnerability scanning and updates'
      ])
    );
  });

  it('calculates overall risk levels from vulnerability severities', () => {
    const engine = new SecurityAuditEngine();
    const addVulnerability = (
      engine as unknown as {
        addVulnerability: (v: {
          severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
          category: 'authentication' | 'authorization' | 'input_validation' | 'data_exposure' | 'injection' | 'configuration' | 'cryptography' | 'dependencies';
          title: string;
          description: string;
          impact: string;
          recommendation: string;
        }) => void;
      }
    ).addVulnerability.bind(engine);
    const calculateOverallRisk = (
      engine as unknown as {
        calculateOverallRisk: () => 'critical' | 'high' | 'medium' | 'low' | 'acceptable';
      }
    ).calculateOverallRisk.bind(engine);

    expect(calculateOverallRisk()).toBe('acceptable');

    addVulnerability({
      severity: 'low',
      category: 'configuration',
      title: 'low',
      description: 'low',
      impact: 'low',
      recommendation: 'low'
    });
    expect(calculateOverallRisk()).toBe('low');

    addVulnerability({
      severity: 'high',
      category: 'input_validation',
      title: 'high',
      description: 'high',
      impact: 'high',
      recommendation: 'high'
    });
    expect(calculateOverallRisk()).toBe('medium');

    addVulnerability({
      severity: 'high',
      category: 'authorization',
      title: 'high2',
      description: 'high2',
      impact: 'high2',
      recommendation: 'high2'
    });
    addVulnerability({
      severity: 'high',
      category: 'data_exposure',
      title: 'high3',
      description: 'high3',
      impact: 'high3',
      recommendation: 'high3'
    });
    expect(calculateOverallRisk()).toBe('high');

    addVulnerability({
      severity: 'critical',
      category: 'configuration',
      title: 'critical',
      description: 'critical',
      impact: 'critical',
      recommendation: 'critical'
    });
    expect(calculateOverallRisk()).toBe('critical');
  });

  it('assesses compliance booleans from vulnerability set', () => {
    const engine = new SecurityAuditEngine();
    const addVulnerability = (
      engine as unknown as {
        addVulnerability: (v: {
          severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
          category: 'authentication' | 'authorization' | 'input_validation' | 'data_exposure' | 'injection' | 'configuration' | 'cryptography' | 'dependencies';
          title: string;
          description: string;
          impact: string;
          recommendation: string;
          owasp?: string;
        }) => void;
      }
    ).addVulnerability.bind(engine);

    addVulnerability({
      severity: 'high',
      category: 'authorization',
      title: 'broken-access',
      description: 'broken-access',
      impact: 'high',
      recommendation: 'fix',
      owasp: 'A01:2021-Broken Access Control'
    });
    addVulnerability({
      severity: 'high',
      category: 'input_validation',
      title: 'injection',
      description: 'injection',
      impact: 'high',
      recommendation: 'fix',
      owasp: 'A03:2021-Injection'
    });
    addVulnerability({
      severity: 'high',
      category: 'data_exposure',
      title: 'data',
      description: 'data',
      impact: 'high',
      recommendation: 'fix',
      owasp: 'A04:2021-Insecure Design'
    });
    addVulnerability({
      severity: 'critical',
      category: 'configuration',
      title: 'config',
      description: 'config',
      impact: 'critical',
      recommendation: 'fix',
      owasp: 'A05:2021-Security Misconfiguration'
    });

    const compliance = (
      engine as unknown as {
        assessCompliance: () => {
          owaspTop10: Record<string, boolean>;
          authentication: boolean;
          authorization: boolean;
          inputValidation: boolean;
          dataProtection: boolean;
          secureConfiguration: boolean;
        };
      }
    ).assessCompliance();

    expect(compliance.authorization).toBe(false);
    expect(compliance.inputValidation).toBe(false);
    expect(compliance.dataProtection).toBe(false);
    expect(compliance.secureConfiguration).toBe(false);
    expect(compliance.owaspTop10.A01).toBe(false);
    expect(compliance.owaspTop10.A03).toBe(false);
    expect(compliance.owaspTop10.A04).toBe(false);
    expect(compliance.owaspTop10.A05).toBe(false);
  });

  it('generates default recommendation when no vulnerabilities exist', () => {
    const engine = new SecurityAuditEngine();
    const recommendations = (
      engine as unknown as { generateRecommendations: () => string[] }
    ).generateRecommendations();

    expect(recommendations).toEqual([
      'Security posture is generally good, continue regular security assessments'
    ]);
  });

  it('filters vulnerabilities by severity and category', () => {
    const engine = new SecurityAuditEngine();
    const addVulnerability = (
      engine as unknown as {
        addVulnerability: (v: {
          severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
          category: 'authentication' | 'authorization' | 'input_validation' | 'data_exposure' | 'injection' | 'configuration' | 'cryptography' | 'dependencies';
          title: string;
          description: string;
          impact: string;
          recommendation: string;
        }) => void;
      }
    ).addVulnerability.bind(engine);

    addVulnerability({
      severity: 'high',
      category: 'input_validation',
      title: 'v1',
      description: 'v1',
      impact: 'v1',
      recommendation: 'v1'
    });
    addVulnerability({
      severity: 'low',
      category: 'configuration',
      title: 'v2',
      description: 'v2',
      impact: 'v2',
      recommendation: 'v2'
    });

    expect(engine.getVulnerabilities()).toHaveLength(2);
    expect(engine.getVulnerabilitiesBySeverity('high')).toHaveLength(1);
    expect(engine.getVulnerabilitiesByCategory('configuration')).toHaveLength(1);
  });

  it('exports a global security audit engine instance', () => {
    expect(securityAuditEngine).toBeInstanceOf(SecurityAuditEngine);
  });
});
