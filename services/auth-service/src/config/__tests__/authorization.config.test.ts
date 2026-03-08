jest.mock('../../infrastructure/services/logger.service', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

describe('AuthorizationConfigManager', () => {
  const loadModule = async () => {
    jest.resetModules();
    return import('../authorization.config');
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  it('maintains singleton instance and loads defaults', async () => {
    const module = await loadModule();
    const first = module.AuthorizationConfigManager.getInstance();
    const second = module.AuthorizationConfigManager.getInstance();

    expect(first).toBe(second);
    expect(first.getAllRoles().length).toBeGreaterThanOrEqual(module.DEFAULT_ROLES.length);
    expect(first.getAllPolicies().length).toBeGreaterThanOrEqual(module.DEFAULT_POLICIES.length);
    expect(first.getAllPermissions().length).toBeGreaterThanOrEqual(module.DEFAULT_PERMISSIONS.length);
  });

  it('updates and removes role/permission/policy configurations', async () => {
    const module = await loadModule();
    const manager = module.AuthorizationConfigManager.getInstance();

    manager.updateRole({
      name: 'qa-role',
      description: 'QA role',
      permissions: [{ resource: 'products', action: 'view', scope: 'organization' }]
    });
    expect(manager.getRole('qa-role')).toBeDefined();

    manager.updatePermission({
      resource: 'qa',
      action: 'view',
      scope: 'organization'
    });
    expect(manager.getPermission('qa', 'view', 'organization')).toBeDefined();

    manager.updatePolicy({
      id: 'qa-policy',
      name: 'QA Policy',
      version: '1.0.0',
      enabled: true,
      priority: 1,
      conditions: [],
      actions: [{ type: 'audit', target: ['qa-role'] }]
    });
    expect(manager.getPolicy('qa-policy')).toBeDefined();

    expect(manager.removeRole('qa-role')).toBe(true);
    expect(manager.removePermission('qa', 'view', 'organization')).toBe(true);
    expect(manager.removePolicy('qa-policy')).toBe(true);
  });

  it('detects circular role inheritance during validation', async () => {
    const module = await loadModule();
    const manager = module.AuthorizationConfigManager.getInstance();

    manager.updateRole({
      name: 'loop-role',
      description: 'loop',
      permissions: [],
      inherits: ['loop-role']
    });

    const validation = manager.validateConfiguration();

    expect(validation.valid).toBe(false);
    expect(validation.errors).toEqual(expect.arrayContaining(["Circular inheritance detected in role 'loop-role'"]));
  });

  it('exports configuration metadata and rejects bad checksum on import', async () => {
    const module = await loadModule();
    const manager = module.AuthorizationConfigManager.getInstance();
    const exported = manager.exportConfiguration();

    expect(exported.roles.length).toBeGreaterThan(0);
    expect(exported.permissions.length).toBeGreaterThan(0);
    expect(exported.policies.length).toBeGreaterThan(0);
    expect(typeof exported.metadata?.checksum).toBe('string');

    exported.metadata!.checksum = 'tampered';
    expect(() => manager.importConfiguration(exported)).toThrow('Configuration checksum validation failed');
  });

  it('provides useful statistics for observability', async () => {
    const module = await loadModule();
    const manager = module.AuthorizationConfigManager.getInstance();

    const stats = manager.getStatistics();

    expect(stats.environment).toBe('test');
    expect(stats.rolesCount).toBeGreaterThan(0);
    expect(stats.permissionsCount).toBeGreaterThan(0);
    expect(stats.policiesCount).toBeGreaterThan(0);
    expect(stats.averagePermissionsPerRole).toBeGreaterThan(0);
  });
});
